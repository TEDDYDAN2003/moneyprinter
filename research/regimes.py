"""
Market Regime Classification Engine — Wyckoff Phase Detection.

Identifies five market states causally (no look-ahead):
  Accumulation → Markup → Distribution → Markdown → (cycle restarts)
  Consolidation  (no clear directional bias)

Uses ATR compression, swing structure, EMA slope, and range analysis.
100% Causal — strictly depends on past and current candles (index <= i).
"""

from __future__ import annotations
import math
from typing import List, Dict, Optional


def classify_regimes(
    candles: List[dict],
    atr_len: int = 14,
    regime_window: int = 40,
    ema_fast: int = 20,
    ema_slow: int = 50,
) -> List[dict]:
    """Return a list of regime classifications, one per candle (strictly causal)."""
    n = len(candles)
    if n < regime_window:
        return [_default() for _ in candles]

    # --- Incremental ATR ---
    atrs: List[Optional[float]] = [None] * n
    atr_seed = 0.0
    atr_prev: Optional[float] = None
    for i, c in enumerate(candles):
        prev = candles[i - 1] if i else c
        tr = max(c['high'] - c['low'],
                 abs(c['high'] - prev['close']),
                 abs(c['low'] - prev['close']))
        if i < atr_len:
            atr_seed += tr
            if i == atr_len - 1:
                atr_prev = atr_seed / atr_len
                atrs[i] = atr_prev
        elif atr_prev is not None:
            atr_prev = (atr_prev * (atr_len - 1) + tr) / atr_len
            atrs[i] = atr_prev

    # --- Incremental EMAs ---
    ema_f: List[Optional[float]] = [None] * n
    ema_s: List[Optional[float]] = [None] * n
    kf, ks = 2.0 / (ema_fast + 1), 2.0 / (ema_slow + 1)
    ef = es = None
    for i, c in enumerate(candles):
        cl = c['close']
        ef = cl if ef is None else cl * kf + ef * (1 - kf)
        es = cl if es is None else cl * ks + es * (1 - ks)
        if i >= ema_fast - 1:
            ema_f[i] = ef
        if i >= ema_slow - 1:
            ema_s[i] = es

    results: List[dict] = []
    swing_len = 5
    recent_shs: List[float] = []
    recent_sls: List[float] = []

    for i, c in enumerate(candles):
        # Check if candle at `confirmed_idx = i - swing_len` is a swing pivot
        # strictly using candles from `confirmed_idx - swing_len` up to `i` (all <= i)
        conf_idx = i - swing_len
        if conf_idx >= swing_len:
            target_h = candles[conf_idx]['high']
            target_l = candles[conf_idx]['low']
            is_sh = True
            is_sl = True
            for offset in range(1, swing_len + 1):
                if candles[conf_idx - offset]['high'] >= target_h or candles[conf_idx + offset]['high'] >= target_h:
                    is_sh = False
                if candles[conf_idx - offset]['low'] <= target_l or candles[conf_idx + offset]['low'] <= target_l:
                    is_sl = False
                if not is_sh and not is_sl:
                    break
            if is_sh:
                recent_shs.append(target_h)
            if is_sl:
                recent_sls.append(target_l)
            if len(recent_shs) > 8:
                recent_shs = recent_shs[-8:]
            if len(recent_sls) > 8:
                recent_sls = recent_sls[-8:]

        if i < regime_window:
            results.append(_default())
            continue

        atr_val = atrs[i] or atrs[i - 1] or 1.0

        # Feature 1: Range compression
        lookback_atrs = [a for a in atrs[max(0, i - regime_window):i + 1] if a is not None]
        avg_atr = sum(lookback_atrs) / len(lookback_atrs) if lookback_atrs else atr_val
        compression = atr_val / avg_atr if avg_atr > 0 else 1.0

        # Feature 2: Window range vs ATR
        window_candles = candles[max(0, i - regime_window + 1):i + 1]
        window_high = max(x['high'] for x in window_candles)
        window_low = min(x['low'] for x in window_candles)
        window_range = window_high - window_low
        range_ratio = window_range / (atr_val * regime_window) if atr_val > 0 else 0

        # Feature 3: EMA slope and position
        ef_now = ema_f[i]
        es_now = ema_s[i]
        ef_prev = ema_f[max(0, i - 10)]
        es_prev = ema_s[max(0, i - 10)]
        ema_slope = 0
        ema_position = 0
        if ef_now and es_now:
            ema_position = 1 if c['close'] > ef_now > es_now else (
                -1 if c['close'] < ef_now < es_now else 0)
            if ef_prev and es_prev:
                ema_slope = 1 if ef_now > ef_prev and es_now > es_prev else (
                    -1 if ef_now < ef_prev and es_now < es_prev else 0)

        # Feature 4: Swing structure
        swing_score = 0
        if len(recent_shs) >= 2 and len(recent_sls) >= 2:
            hh = recent_shs[-1] > recent_shs[-2]
            hl = recent_sls[-1] > recent_sls[-2]
            lh = recent_shs[-1] < recent_shs[-2]
            ll = recent_sls[-1] < recent_sls[-2]
            if hh and hl:
                swing_score = 2
            elif hh or hl:
                swing_score = 1
            elif lh and ll:
                swing_score = -2
            elif lh or ll:
                swing_score = -1

        # Feature 5: Body bias
        bull_bodies = sum(1 for x in window_candles if x['close'] > x['open'])
        bear_bodies = sum(1 for x in window_candles if x['close'] < x['open'])
        body_bias = (bull_bodies - bear_bodies) / len(window_candles) if window_candles else 0

        # Feature 6: Position in range
        pos_in_range = (c['close'] - window_low) / window_range if window_range > 0 else 0.5

        # Classification
        regime = 'consolidation'
        confidence = 0.5
        sub_phase = ''

        if swing_score >= 1 and ema_position >= 1 and ema_slope >= 1:
            regime = 'markup'
            confidence = min(0.95, 0.6 + 0.1 * swing_score + 0.1 * compression)
            sub_phase = 'strong_markup' if swing_score == 2 and compression > 1.0 else 'markup'
        elif swing_score <= -1 and ema_position <= -1 and ema_slope <= -1:
            regime = 'markdown'
            confidence = min(0.95, 0.6 + 0.1 * abs(swing_score) + 0.1 * compression)
            sub_phase = 'strong_markdown' if swing_score == -2 and compression > 1.0 else 'markdown'
        elif compression < 0.85 and range_ratio < 0.5 and pos_in_range < 0.4 and body_bias > -0.1:
            regime = 'accumulation'
            confidence = min(0.90, 0.55 + 0.2 * (1 - compression) + 0.15 * (1 - pos_in_range))
            if pos_in_range < 0.15:
                sub_phase = 'spring'
            elif body_bias > 0.2:
                sub_phase = 'test'
            else:
                sub_phase = 'cause'
        elif compression < 0.85 and range_ratio < 0.5 and pos_in_range > 0.6 and body_bias < 0.1:
            regime = 'distribution'
            confidence = min(0.90, 0.55 + 0.2 * (1 - compression) + 0.15 * pos_in_range)
            if pos_in_range > 0.85:
                sub_phase = 'utad'
            elif body_bias < -0.2:
                sub_phase = 'sign_of_weakness'
            else:
                sub_phase = 'cause'
        else:
            regime = 'consolidation'
            confidence = 0.5
            if range_ratio < 0.3:
                sub_phase = 'tight_range'
            elif abs(body_bias) > 0.3:
                sub_phase = 'directional_bias'
            else:
                sub_phase = 'neutral'

        results.append({
            'regime': regime,
            'sub_phase': sub_phase,
            'confidence': round(confidence, 3),
            'compression': round(compression, 3),
            'range_ratio': round(range_ratio, 4),
            'ema_position': ema_position,
            'ema_slope': ema_slope,
            'swing_score': swing_score,
            'body_bias': round(body_bias, 3),
            'pos_in_range': round(pos_in_range, 3),
        })

    return results


def _default() -> dict:
    return {
        'regime': 'insufficient_data',
        'sub_phase': '',
        'confidence': 0,
        'compression': 1.0,
        'range_ratio': 0,
        'ema_position': 0,
        'ema_slope': 0,
        'swing_score': 0,
        'body_bias': 0,
        'pos_in_range': 0.5,
    }


def compute_vwma(candles: List[dict], length: int = 20) -> List[Optional[float]]:
    """Strictly causal VWMA using tick-volume proxy."""
    n = len(candles)
    vwma: List[Optional[float]] = [None] * n

    vols: List[float] = []
    for c in candles:
        rng = c['high'] - c['low']
        if rng <= 0:
            vols.append(0.001)
            continue
        body = abs(c['close'] - c['open'])
        body_ratio = body / rng
        tick_vol = rng * (body_ratio + 0.5)
        vols.append(tick_vol)

    for i in range(length - 1, n):
        numerator = sum(candles[j]['close'] * vols[j] for j in range(i - length + 1, i + 1))
        denominator = sum(vols[j] for j in range(i - length + 1, i + 1))
        if denominator > 0:
            vwma[i] = numerator / denominator

    return vwma


def compute_ema(candles: List[dict], length: int = 20) -> List[Optional[float]]:
    """Strictly causal incremental EMA on close prices."""
    n = len(candles)
    ema: List[Optional[float]] = [None] * n
    k = 2.0 / (length + 1)
    seed = 0.0
    for i in range(n):
        cl = candles[i]['close']
        if i < length - 1:
            seed += cl
        elif i == length - 1:
            seed += cl
            ema[i] = seed / length
        else:
            ema[i] = cl * k + (ema[i - 1] or cl) * (1 - k)
    return ema


def vwma_ema_crossover(candles: List[dict], length: int = 20) -> List[dict]:
    """Strictly causal VWMA - EMA divergence and crossover detection."""
    n = len(candles)
    vwma = compute_vwma(candles, length)
    ema = compute_ema(candles, length)

    atrs: List[Optional[float]] = [None] * n
    atr_prev: Optional[float] = None
    for i, c in enumerate(candles):
        prev = candles[i - 1] if i else c
        tr = max(c['high'] - c['low'],
                 abs(c['high'] - prev['close']),
                 abs(c['low'] - prev['close']))
        if i < 14:
            if i == 13:
                atr_prev = sum(
                    max(candles[j]['high'] - candles[j]['low'],
                        abs(candles[j]['high'] - candles[max(0, j - 1)]['close']),
                        abs(candles[j]['low'] - candles[max(0, j - 1)]['close']))
                    for j in range(14)
                ) / 14
                atrs[i] = atr_prev
        elif atr_prev is not None:
            atr_prev = (atr_prev * 13 + tr) / 14
            atrs[i] = atr_prev

    results: List[dict] = []
    for i in range(n):
        v = vwma[i]
        e = ema[i]
        if v is None or e is None:
            results.append({
                'vwma': None, 'ema': None, 'delta': 0,
                'crossover': 0, 'divergence_strength': 0
            })
            continue

        delta = v - e
        prev_v = vwma[i - 1] if i > 0 else None
        prev_e = ema[i - 1] if i > 0 else None

        crossover = 0
        if prev_v is not None and prev_e is not None:
            was_above = prev_v >= prev_e
            is_above = v >= e
            if is_above and not was_above:
                crossover = 1
            elif not is_above and was_above:
                crossover = -1

        atr_val = atrs[i] or 1.0
        div_strength = delta / atr_val if atr_val > 0 else 0

        results.append({
            'vwma': round(v, 5),
            'ema': round(e, 5),
            'delta': round(delta, 5),
            'crossover': crossover,
            'divergence_strength': round(div_strength, 4),
        })

    return results
