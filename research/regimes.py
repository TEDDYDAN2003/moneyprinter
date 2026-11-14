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


def supersmoother_2pole(series: List[float], period: int = 14) -> List[float]:
    """John Ehlers 2-Pole SuperSmoother Gaussian IIR filter."""
    p = max(4, period)
    a1 = math.exp(-math.sqrt(2.0) * math.pi / p)
    b1 = 2.0 * a1 * math.cos(math.sqrt(2.0) * math.pi / p)
    c2 = b1
    c3 = -a1 * a1
    c1 = 1.0 - c2 - c3

    n = len(series)
    if n == 0:
        return []
    if n == 1:
        return [series[0]]

    out = [0.0] * n
    out[0] = series[0]
    out[1] = series[1]
    for i in range(2, n):
        out[i] = c1 * (series[i] + series[i - 1]) * 0.5 + c2 * out[i - 1] + c3 * out[i - 2]
    return out


def compute_vwma(candles: List[dict], length: int = 14) -> List[Optional[float]]:
    """Strictly causal Quantum Zero-Lag Volume-Smoothed curve using Ehlers 2-Pole filter."""
    n = len(candles)
    if n < 5:
        return [c['close'] for c in candles]

    lag = max(1, (length - 1) // 2)

    # 1. Volume proxy
    vols = []
    for c in candles:
        rng = c['high'] - c['low']
        body = abs(c['close'] - c['open'])
        tv = rng * (body / rng + 0.5) if rng > 0 else 0.001
        vols.append(tv)

    # Relative volume (rolling window)
    rel_vol = [1.0] * n
    vol_sum = 0.0
    for i in range(n):
        vol_sum += vols[i]
        if i >= length:
            vol_sum -= vols[i - length]
        avg_v = vol_sum / length if i >= length else vol_sum / (i + 1)
        rel_vol[i] = max(0.4, min(2.5, vols[i] / avg_v)) if avg_v > 0 else 1.0

    # 2. Zero-lag momentum compensation
    z_vol_price = [0.0] * n
    for i in range(n):
        past_idx = max(0, i - lag)
        momentum = candles[i]['close'] - candles[past_idx]['close']
        z_vol_price[i] = candles[i]['close'] + momentum * (rel_vol[i] * 0.75)

    # 3. SuperSmoother
    smoothed = supersmoother_2pole(z_vol_price, period=length)
    return [round(x, 5) for x in smoothed]


def compute_ema(candles: List[dict], length: int = 14) -> List[Optional[float]]:
    """Strictly causal Zero-Lag Baseline price smoother using Ehlers 2-Pole filter."""
    n = len(candles)
    if n < 5:
        return [c['close'] for c in candles]

    lag = max(1, (length - 1) // 2)
    z_close = [0.0] * n
    for i in range(n):
        past_idx = max(0, i - lag)
        momentum = candles[i]['close'] - candles[past_idx]['close']
        z_close[i] = candles[i]['close'] + momentum * 0.75

    smoothed = supersmoother_2pole(z_close, period=length)
    return [round(x, 5) for x in smoothed]


def vwma_ema_crossover(candles: List[dict], length: int = 14, min_divergence: float = 0.15) -> List[dict]:
    """Strictly causal Quantum Zero-Lag VWMA vs Baseline crossover detection with hysteresis."""
    n = len(candles)
    if n == 0:
        return []
    vwma = compute_vwma(candles, length)
    ema = compute_ema(candles, length)

    # Wilder's incremental ATR
    atrs: List[float] = [1.0] * n
    atr_prev: Optional[float] = None
    atr_seed = 0.0
    for i, c in enumerate(candles):
        prev = candles[i - 1] if i else c
        tr = max(c['high'] - c['low'],
                 abs(c['high'] - prev['close']),
                 abs(c['low'] - prev['close']))
        if i < 14:
            atr_seed += tr
            if i == 13:
                atr_prev = atr_seed / 14.0
                atrs[i] = atr_prev
        elif atr_prev is not None:
            atr_prev = (atr_prev * 13.0 + tr) / 14.0
            atrs[i] = atr_prev

    results: List[dict] = []
    last_signal_dir = 0
    bars_since_signal = 999

    for i in range(n):
        v = vwma[i]
        e = ema[i]
        if v is None or e is None or i < 2:
            results.append({
                'vwma': None, 'ema': None, 'delta': 0,
                'crossover': 0, 'divergence_strength': 0
            })
            continue

        delta = v - e
        v_prev = vwma[i - 1] if (i > 0 and vwma[i - 1] is not None) else v
        e_prev = ema[i - 1] if (i > 0 and ema[i - 1] is not None) else e
        diff0 = v_prev - e_prev
        diff1 = delta

        atr_val = atrs[i] if atrs[i] > 0 else 1.0
        threshold = min_divergence * atr_val
        div_strength = delta / atr_val

        bars_since_signal += 1
        crossover = 0

        # Bullish: transitioned from negative to positive >= threshold
        is_bull_cross = (diff0 <= 0 and diff1 > 0) or (diff0 < threshold and diff1 >= threshold)
        is_bear_cross = (diff0 >= 0 and diff1 < 0) or (diff0 > -threshold and diff1 <= -threshold)

        if is_bull_cross and last_signal_dir != 1 and bars_since_signal >= 4:
            last_signal_dir = 1
            bars_since_signal = 0
            crossover = 1
        elif is_bear_cross and last_signal_dir != -1 and bars_since_signal >= 4:
            last_signal_dir = -1
            bars_since_signal = 0
            crossover = -1

        results.append({
            'vwma': round(v, 5),
            'ema': round(e, 5),
            'delta': round(delta, 5),
            'crossover': crossover,
            'divergence_strength': round(div_strength, 4),
        })

    return results
