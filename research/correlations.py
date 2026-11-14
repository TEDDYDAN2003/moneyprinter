"""
Confluence Correlation Engine — Statistical analysis of indicator predictive power.

Computes rolling correlations between each indicator signal and future N-bar returns,
ranks indicators by predictive value per market regime, and finds optimal combinations.
"""

from __future__ import annotations
import math
from typing import List, Dict, Optional, Tuple


def analyze_correlations(
    candles: List[dict],
    results: List[dict],
    regimes: List[dict],
    vwma_data: List[dict],
    forward_bars: int = 20,
    min_samples: int = 30,
) -> dict:
    """
    Analyze which indicator signals correlate most with future price movement.

    For each bar i, we compute the forward return over `forward_bars`:
        fwd_return = (candles[i+forward_bars].close - candles[i].close) / candles[i].close

    Then we compute the correlation between each indicator's signal and fwd_return,
    both globally and per-regime.

    Returns a dict with:
      - global_correlations: {indicator_name: pearson_r}
      - regime_correlations: {regime: {indicator_name: pearson_r}}
      - best_combinations: [{indicators: [...], regime: str, accuracy: float}]
      - signal_accuracy: {indicator_name: {regime: {accuracy, total, direction_matches}}}
    """
    n = len(candles)
    if n < forward_bars + min_samples:
        return {'global_correlations': {}, 'regime_correlations': {},
                'best_combinations': [], 'signal_accuracy': {}}

    # --- Forward returns (causal: we compute them but only use them for backtesting/correlation) ---
    fwd_returns: List[Optional[float]] = [None] * n
    for i in range(n - forward_bars):
        entry = candles[i]['close']
        if entry > 0:
            fwd_returns[i] = (candles[i + forward_bars]['close'] - entry) / entry

    # --- Extract indicator signals per bar ---
    # Each signal is a float in [-1, 1] where positive = bullish, negative = bearish
    def extract_signals(i: int) -> dict:
        r = results[i] if i < len(results) else {}
        reg = regimes[i] if i < len(regimes) else {}
        vw = vwma_data[i] if i < len(vwma_data) else {}

        signals = {}

        # 1. Trend regime (200 EMA position)
        signals['trend_200ema'] = float(r.get('trend_regime', 0))

        # 2. LTF structure (BOS/CHoCH)
        signals['ltf_structure'] = float(r.get('ltf', 0))

        # 3. HTF bias
        signals['htf_bias'] = float(r.get('htf', 0))

        # 4. MTF bias
        signals['mtf_bias'] = float(r.get('mtf', 0))

        # 5. Liquidity sweep direction
        sweep = r.get('sweep', 'None')
        if sweep == 'Sell-side reclaimed':
            signals['sweep'] = 1.0
        elif sweep == 'Buy-side reclaimed':
            signals['sweep'] = -1.0
        else:
            signals['sweep'] = 0.0

        # 6. Killzone active
        signals['killzone'] = 1.0 if r.get('in_killzone') else 0.0

        # 7. OTE confluence
        signals['ote'] = float(r.get('ote_confluence', 0))

        # 8. Order block touch
        signals['order_block'] = float(r.get('touching_ob', 0))

        # 9. Candlestick pattern direction
        signals['pattern_dir'] = float(r.get('pattern_dir', 0))

        # 10. Composite bull-bear net
        net = r.get('net', 0) or 0
        signals['composite_net'] = max(-1, min(1, net / 50.0))  # normalize to [-1, 1]

        # 11. VWMA - EMA divergence
        signals['vwma_divergence'] = max(-1, min(1, vw.get('divergence_strength', 0)))

        # 12. VWMA crossover
        signals['vwma_crossover'] = float(vw.get('crossover', 0))

        # 13. Market regime as numeric
        regime = reg.get('regime', 'consolidation')
        regime_map = {'accumulation': 0.5, 'markup': 1.0, 'distribution': -0.5, 'markdown': -1.0, 'consolidation': 0.0}
        signals['regime_numeric'] = regime_map.get(regime, 0.0)

        # 14. Regime confidence
        signals['regime_confidence'] = reg.get('confidence', 0.5)

        # 15. EMA position
        signals['ema_position'] = float(reg.get('ema_position', 0))

        # 16. Swing score
        signals['swing_score'] = max(-1, min(1, reg.get('swing_score', 0) / 2.0))

        # 17. ATR compression
        signals['atr_compression'] = reg.get('compression', 1.0) - 1.0  # centered at 0

        # 18. Confirmation signal
        conf = r.get('confirmation', False)
        conf_dir = r.get('confirmation_direction', 0)
        signals['confirmation'] = float(conf_dir) if conf else 0.0

        return signals

    # --- Collect data per regime ---
    all_signals: List[dict] = []
    regime_groups: Dict[str, List[int]] = {}

    for i in range(n - forward_bars):
        if fwd_returns[i] is None:
            continue
        sigs = extract_signals(i)
        all_signals.append({'index': i, 'signals': sigs, 'fwd_return': fwd_returns[i]})

        regime = regimes[i].get('regime', 'consolidation') if i < len(regimes) else 'consolidation'
        regime_groups.setdefault(regime, []).append(len(all_signals) - 1)

    if len(all_signals) < min_samples:
        return {'global_correlations': {}, 'regime_correlations': {},
                'best_combinations': [], 'signal_accuracy': {}}

    # --- Compute global correlations ---
    indicator_names = list(all_signals[0]['signals'].keys()) if all_signals else []
    global_corr = {}
    for name in indicator_names:
        xs = [s['signals'][name] for s in all_signals]
        ys = [s['fwd_return'] for s in all_signals]
        r = _pearson(xs, ys)
        if r is not None:
            global_corr[name] = round(r, 4)

    # --- Compute per-regime correlations ---
    regime_corr: Dict[str, dict] = {}
    for regime, indices in regime_groups.items():
        if len(indices) < min_samples:
            continue
        entries = [all_signals[idx] for idx in indices]
        corrs = {}
        for name in indicator_names:
            xs = [e['signals'][name] for e in entries]
            ys = [e['fwd_return'] for e in entries]
            r = _pearson(xs, ys)
            if r is not None:
                corrs[name] = round(r, 4)
        regime_corr[regime] = corrs

    # --- Signal accuracy (directional match with forward return) ---
    signal_accuracy: Dict[str, Dict[str, dict]] = {}
    for name in indicator_names:
        signal_accuracy[name] = {}
        for regime, indices in regime_groups.items():
            entries = [all_signals[idx] for idx in indices]
            # Only count bars where signal is non-zero
            active = [(e['signals'][name], e['fwd_return']) for e in entries if abs(e['signals'][name]) > 0.01]
            if len(active) < 10:
                continue
            matches = sum(1 for sig, ret in active if (sig > 0 and ret > 0) or (sig < 0 and ret < 0))
            signal_accuracy[name][regime] = {
                'accuracy': round(100 * matches / len(active), 1),
                'total': len(active),
                'direction_matches': matches,
            }

    # --- Find best 2-3 indicator combinations per regime ---
    best_combos = _find_best_combinations(all_signals, regime_groups, indicator_names, min_samples)

    return {
        'global_correlations': dict(sorted(global_corr.items(), key=lambda x: abs(x[1]), reverse=True)),
        'regime_correlations': regime_corr,
        'signal_accuracy': signal_accuracy,
        'best_combinations': best_combos,
    }


def _find_best_combinations(
    all_signals: List[dict],
    regime_groups: Dict[str, List[int]],
    indicator_names: List[str],
    min_samples: int = 20,
) -> List[dict]:
    """
    Test combinations of 2-3 indicators and find which ones best predict direction.
    Uses a simple voting classifier: if majority of signals agree on direction,
    take the trade. Measure directional accuracy.
    """
    # Focus on the most promising individual signals
    top_indicators = [
        'trend_200ema', 'ltf_structure', 'sweep', 'vwma_divergence',
        'vwma_crossover', 'ema_position', 'composite_net', 'confirmation',
        'pattern_dir', 'swing_score', 'killzone', 'ote', 'order_block'
    ]
    top_indicators = [t for t in top_indicators if t in indicator_names]

    combos = []

    # Test pairs
    for ai in range(len(top_indicators)):
        for bi in range(ai + 1, len(top_indicators)):
            combo = [top_indicators[ai], top_indicators[bi]]
            combos.append(combo)

    # Test triples (only top 8 to limit computation)
    top8 = top_indicators[:8]
    for ai in range(len(top8)):
        for bi in range(ai + 1, len(top8)):
            for ci in range(bi + 1, len(top8)):
                combos.append([top8[ai], top8[bi], top8[ci]])

    results = []
    for regime, indices in list(regime_groups.items()) + [('all', list(range(len(all_signals))))]:
        entries = [all_signals[idx] for idx in indices]
        if len(entries) < min_samples:
            continue

        for combo in combos:
            # Vote: average of signals
            active_trades = []
            for e in entries:
                vote = sum(e['signals'].get(ind, 0) for ind in combo) / len(combo)
                if abs(vote) > 0.1:  # Only count when there's a clear signal
                    active_trades.append((vote, e['fwd_return']))

            if len(active_trades) < max(10, min_samples // 3):
                continue

            matches = sum(1 for v, r in active_trades if (v > 0 and r > 0) or (v < 0 and r < 0))
            accuracy = 100 * matches / len(active_trades)

            if accuracy > 52:  # Only keep above random
                avg_return = sum(abs(r) for _, r in active_trades if (
                    (_ > 0 and r > 0) or (_ < 0 and r < 0)
                )) / max(1, matches)
                results.append({
                    'indicators': combo,
                    'regime': regime,
                    'accuracy': round(accuracy, 1),
                    'total_signals': len(active_trades),
                    'avg_winner_return': round(avg_return * 100, 4),
                })

    # Sort by accuracy, keep top 20
    results.sort(key=lambda x: (x['accuracy'], x['total_signals']), reverse=True)
    return results[:20]


def _pearson(xs: List[float], ys: List[float]) -> Optional[float]:
    """Compute Pearson correlation coefficient."""
    n = len(xs)
    if n < 5:
        return None
    mx = sum(xs) / n
    my = sum(ys) / n
    cov = sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / n
    sx = math.sqrt(sum((x - mx) ** 2 for x in xs) / n)
    sy = math.sqrt(sum((y - my) ** 2 for y in ys) / n)
    if sx < 1e-12 or sy < 1e-12:
        return None
    return cov / (sx * sy)
