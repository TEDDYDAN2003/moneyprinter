"""Causal, exploratory FVG scoring with Structural Targets & Multi-Indicator Confluence."""
from datetime import datetime, timezone
import math
from candlesticks import detect_pattern
from regimes import classify_regimes, vwma_ema_crossover
from correlations import analyze_correlations

DEFAULT_WEIGHTS = {
    'htf': 20,
    'structure': 15,
    'liquidity': 15,
    'displacement': 15,
    'fvg': 15,
    'position': 10,
    'candle': 5,
    'session': 5
}

def analyze(candles, minutes=5, weights=None, pivot_len=3, atr_len=14, mtf_mult=3, htf_mult=12):
    weights = {**DEFAULT_WEIGHTS, **(weights or {})}
    if any(not isinstance(w, (int, float)) or not 0 <= w <= 100 for w in weights.values()) or abs(sum(weights.values()) - 100) > 1e-6:
        raise ValueError('Weights must be nonnegative and total 100.')
        
    span = minutes * 60
    results = []
    zones = []
    ranges = []
    order_blocks = []
    atr = None
    last_hi = last_lo = None
    trend = 0
    last_break = 'None'
    break_age = 999
    last_sweep = None
    sweep_age = 999
    last_fvg = {1: None, -1: None}
    prior = None
    
    # Strictly causal incremental EMAs (50 and 200 EMA)
    ema50 = None
    ema200 = None
    k50 = 2.0 / 51.0
    k200 = 2.0 / 201.0
    news_blackout_until = -1
    
    # Precompute causal market regimes (Wyckoff) and VWMA-EMA volume divergence
    regimes = classify_regimes(candles, atr_len=atr_len)
    vwma_data = vwma_ema_crossover(candles, length=20)
    
    # Completed aggregates for MTF and HTF
    aggregates = {m: {'active': None, 'done': []} for m in (mtf_mult, htf_mult)}
    
    for i, c in enumerate(candles):
        t = int(c['time'])
        gap = prior is not None and t - prior['time'] != span
        if gap:
            zones = []
            
        # Update causal EMAs
        ema50 = c['close'] if ema50 is None else (c['close'] * k50 + ema50 * (1.0 - k50))
        ema200 = c['close'] if ema200 is None else (c['close'] * k200 + ema200 * (1.0 - k200))
        
        for mult, a in aggregates.items():
            bucket = t // (span * mult)
            prev = a['active']
            if prev and prev['bucket'] != bucket:
                if prev['count'] == mult and prev['last'] == (prev['bucket'] + 1) * span * mult - span:
                    a['done'].append(prev)
                a['active'] = None
            if not a['active']:
                a['active'] = {'bucket': bucket, 'open': c['open'], 'high': c['high'], 'low': c['low'], 'close': c['close'], 'count': 1, 'last': t}
            else:
                x = a['active']
                x['high'] = max(x['high'], c['high'])
                x['low'] = min(x['low'], c['low'])
                x['close'] = c['close']
                x['count'] += 1
                x['last'] = t
            x = a['active']
            available = a['done'] + ([x] if x['count'] == mult and t == (bucket + 1) * span * mult - span else [])
            a['available'] = available[-5:]
            
        def bias(m):
            arr = aggregates[m]['available']
            if len(arr) < 3:
                return 0
            x, y, z = arr[-3:]
            return 1 if z['high'] > y['high'] and z['low'] > y['low'] and y['close'] > x['close'] else (-1 if z['high'] < y['high'] and z['low'] < y['low'] and y['close'] < x['close'] else 0)
            
        mb, hb = bias(mtf_mult), bias(htf_mult)
        tr = max(c['high'] - c['low'], abs(c['high'] - prior['close']), abs(c['low'] - prior['close'])) if prior else c['high'] - c['low']
        ranges.append(tr)
        if i == atr_len - 1:
            atr = sum(ranges[-atr_len:]) / atr_len
        elif i >= atr_len and atr is not None:
            atr = (atr * (atr_len - 1) + tr) / atr_len
            
        j = i - pivot_len
        if j >= pivot_len:
            win = candles[j - pivot_len:i + 1]
            p = candles[j]
            if all(p['high'] > x['high'] for k, x in enumerate(win) if k != pivot_len):
                last_hi = p['high']
            if all(p['low'] < x['low'] for k, x in enumerate(win) if k != pivot_len):
                last_lo = p['low']
                
        oldtrend = trend
        event = 'None'
        break_age += 1
        sweep_age += 1
        if prior and last_hi is not None and prior['close'] <= last_hi < c['close']:
            trend = 1
            event = 'Bullish CHoCH' if oldtrend == -1 else 'Bullish BOS'
            break_age = 0
            last_break = event
        elif prior and last_lo is not None and prior['close'] >= last_lo > c['close']:
            trend = -1
            event = 'Bearish CHoCH' if oldtrend == 1 else 'Bearish BOS'
            break_age = 0
            last_break = event
            
        if last_lo is not None and c['low'] < last_lo and c['close'] > last_lo:
            last_sweep = 'Sell-side reclaimed'
            sweep_age = 0
        elif last_hi is not None and c['high'] > last_hi and c['close'] < last_hi:
            last_sweep = 'Buy-side reclaimed'
            sweep_age = 0
            
        # Three-candle strict FVG rule: strict gap between candle 1 and 3
        if i >= 2 and not gap and candles[i - 1]['time'] - candles[i - 2]['time'] == span:
            a = candles[i - 2]
            direction = 1 if c['low'] > a['high'] else (-1 if c['high'] < a['low'] else 0)
            if direction:
                z = {'from': i - 2, 'created': i, 'bottom': a['high'] if direction == 1 else c['high'], 'top': c['low'] if direction == 1 else a['low'], 'direction': direction, 'status': 'fresh'}
                zones.append(z)
                last_fvg[direction] = z
                
        for z in zones:
            if z['created'] < i and c['low'] <= z['top'] and c['high'] >= z['bottom']:
                z['status'] = 'rejected' if (z['direction'] == 1 and c['close'] > z['top']) or (z['direction'] == -1 and c['close'] < z['bottom']) else 'mitigated'
        zones = [z for z in zones if i - z['created'] <= 100 and not (z['direction'] == 1 and c['close'] < z['bottom'] or z['direction'] == -1 and c['close'] > z['top'])]
        
        body = abs(c['close'] - c['open'])
        ratio = body / atr if atr else 0
        cd = 1 if c['close'] > c['open'] else -1 if c['close'] < c['open'] else 0
        eq = (last_hi + last_lo) / 2 if last_hi is not None and last_lo is not None and last_hi > last_lo else None
        
        # Order Block detection (prior opposing candle before displacement body >= 1.5 * atr)
        if prior is not None and atr and body >= 1.5 * atr:
            prev_dir = 1 if prior['close'] > prior['open'] else -1
            if cd == 1 and prev_dir == -1:
                order_blocks.append({
                    'index': i - 1,
                    'direction': 1,
                    'top': max(prior['open'], prior['close']),
                    'bottom': min(prior['open'], prior['close']),
                    'created': i
                })
            elif cd == -1 and prev_dir == 1:
                order_blocks.append({
                    'index': i - 1,
                    'direction': -1,
                    'top': max(prior['open'], prior['close']),
                    'bottom': min(prior['open'], prior['close']),
                    'created': i
                })
        order_blocks = [ob for ob in order_blocks if i - ob['created'] <= 60]
        touching_bull_ob = any(ob['direction'] == 1 and c['low'] <= ob['top'] and c['high'] >= ob['bottom'] for ob in order_blocks)
        touching_bear_ob = any(ob['direction'] == -1 and c['high'] >= ob['bottom'] and c['low'] <= ob['top'] for ob in order_blocks)
        
        # Time-based Killzones (Asia, London, NY)
        dt = datetime.fromtimestamp(t, tz=timezone.utc)
        utc_min = dt.hour * 60 + dt.minute
        is_london = 420 <= utc_min <= 600   # 07:00 - 10:00 UTC
        is_ny = 750 <= utc_min <= 930       # 12:30 - 15:30 UTC
        in_killzone = is_london or is_ny
        
        # High impact news shock detection (CPI/PPI at 12:30/13:30, FOMC at 18:00)
        is_news_time = (abs(utc_min - 750) <= 20) or (abs(utc_min - 810) <= 20) or (abs(utc_min - 1080) <= 30)
        is_news_shock = bool(is_news_time and atr and (c['high'] - c['low']) >= 2.2 * atr)
        if is_news_shock:
            news_blackout_until = i + 4
        in_news_blackout = (i <= news_blackout_until)
        
        # Macro Trend Regime (200 EMA + 50 EMA)
        trend_regime = 0
        if i >= 200 and ema200 is not None:
            if c['close'] > ema200 and (ema50 is None or ema50 >= ema200):
                trend_regime = 1
            elif c['close'] < ema200 and (ema50 is None or ema50 <= ema200):
                trend_regime = -1
                
        # 0.705 Fibonacci OTE retracement zone check
        ote_confluence = 0
        if last_hi is not None and last_lo is not None and last_hi > last_lo:
            rng = last_hi - last_lo
            ote_zone_high = last_hi - rng * 0.618
            ote_zone_low = last_hi - rng * 0.790
            if ote_zone_low <= c['close'] <= ote_zone_high:
                ote_confluence = 1
            bear_ote_high = last_lo + rng * 0.790
            bear_ote_low = last_lo + rng * 0.618
            if bear_ote_low <= c['close'] <= bear_ote_high:
                ote_confluence = -1
        
        # Candlestick pattern detection at current candle
        pattern_data = detect_pattern(candles, i)
        pat_name = pattern_data['name'] if pattern_data else 'Standard Candle'
        pat_dir = pattern_data['direction'] if pattern_data else 0
        pat_conf = pattern_data['confidence'] if pattern_data else 0.5
        
        # Current bar Wyckoff Regime & VWMA Divergence data
        reg = regimes[i] if i < len(regimes) else {}
        vw = vwma_data[i] if i < len(vwma_data) else {}
        regime_label = reg.get('regime', 'consolidation')
        regime_sub = reg.get('sub_phase', '')
        regime_conf = reg.get('confidence', 0.5)
        vw_cross = vw.get('crossover', 0)
        vw_div = vw.get('divergence_strength', 0.0)
        
        # Pre-reactive Signal Generation:
        # Detect early positioning BEFORE the major price reaction candle
        pre_reactive = None
        if not in_news_blackout and atr:
            # 1. Pre-reactive Buy: Accumulation spring/test or VWMA surge at support
            is_accum_early_buy = (regime_label == 'accumulation' and (vw_cross == 1 or vw_div > 0.35))
            is_ob_early_buy = (touching_bull_ob and (vw_cross == 1 or cd == 1))
            is_ote_early_buy = (ote_confluence == 1 and (vw_cross == 1 or ldir == 1))
            
            if is_accum_early_buy or is_ob_early_buy or is_ote_early_buy:
                local_sl = min(c['low'], last_lo if last_lo else c['low']) - 0.25 * atr
                target_tp = (last_hi if last_hi and last_hi > c['close'] + atr else c['close'] + 2.0 * abs(c['close'] - local_sl))
                risk = max(1e-4, c['close'] - local_sl)
                effective_rr = abs(target_tp - c['close']) / risk
                pre_reactive = {
                    'direction': 1,
                    'action': 'EARLY BUY',
                    'setup': 'Accumulation Spring / Volume Shift' if is_accum_early_buy else ('OB Retest Bounce' if is_ob_early_buy else 'OTE 0.705 Retracement'),
                    'entry': round(c['close'], 2),
                    'sl': round(local_sl, 2),
                    'tp': round(target_tp, 2),
                    'rr': round(effective_rr, 2),
                    'probability': round(min(95, 60 + int(regime_conf * 20) + (10 if in_killzone else 0) + (10 if vw_cross == 1 else 0)), 0),
                    'confluences': [
                        f"Wyckoff Phase: {regime_label.capitalize()}" + (f" ({regime_sub})" if regime_sub else ""),
                        "VWMA Volume Surge (Bullish Divergence)" if (vw_cross == 1 or vw_div > 0.3) else "Order Block / Support Test",
                        "Killzone Active" if in_killzone else "Outside Killzone"
                    ]
                }
            
            # 2. Pre-reactive Sell: Distribution UTAD / manipulation or VWMA dump at resistance
            is_dist_early_sell = (regime_label == 'distribution' and (vw_cross == -1 or vw_div < -0.35))
            is_ob_early_sell = (touching_bear_ob and (vw_cross == -1 or cd == -1))
            is_ote_early_sell = (ote_confluence == -1 and (vw_cross == -1 or ldir == -1))
            
            if is_dist_early_sell or is_ob_early_sell or is_ote_early_sell:
                local_sl = max(c['high'], last_hi if last_hi else c['high']) + 0.25 * atr
                target_tp = (last_lo if last_lo and last_lo < c['close'] - atr else c['close'] - 2.0 * abs(local_sl - c['close']))
                risk = max(1e-4, local_sl - c['close'])
                effective_rr = abs(c['close'] - target_tp) / risk
                pre_reactive = {
                    'direction': -1,
                    'action': 'EARLY SELL',
                    'setup': 'Distribution UTAD / Volume Dump' if is_dist_early_sell else ('Bearish OB Retest' if is_ob_early_sell else 'OTE 0.705 Short'),
                    'entry': round(c['close'], 2),
                    'sl': round(local_sl, 2),
                    'tp': round(target_tp, 2),
                    'rr': round(effective_rr, 2),
                    'probability': round(min(95, 60 + int(regime_conf * 20) + (10 if in_killzone else 0) + (10 if vw_cross == -1 else 0)), 0),
                    'confluences': [
                        f"Wyckoff Phase: {regime_label.capitalize()}" + (f" ({regime_sub})" if regime_sub else ""),
                        "VWMA Volume Dump (Bearish Divergence)" if (vw_cross == -1 or vw_div < -0.3) else "Order Block / Resistance Test",
                        "Killzone Active" if in_killzone else "Outside Killzone"
                    ]
                }
        
        def directional(d):
            return (1, 0) if d == 1 else ((0, 1) if d == -1 else (0.5, 0.5))
            
        dval = min(1, ratio / 1.5)
        db, ds = (dval, 0) if cd == 1 else ((0, dval) if cd == -1 else (0.5, 0.5))
        ldir = (1 if last_sweep == 'Sell-side reclaimed' else -1) if sweep_age <= 8 and last_sweep else 0
        freshbull = next((z for z in reversed(zones) if z['direction'] == 1), None)
        freshbear = next((z for z in reversed(zones) if z['direction'] == -1), None)
        
        def fv(z):
            return 0 if not z else 0.4 + (0.3 if z['status'] == 'fresh' else 0.2) + (0.3 if z['status'] == 'rejected' else 0)
            
        pos = (0.8, 0.2) if eq is not None and c['close'] < eq else ((0.2, 0.8) if eq is not None and c['close'] > eq else (0.5, 0.5))
        active = in_killzone
        
        # Candle metric combines raw direction with candlestick pattern confirmation
        cb = 1.0 if cd == 1 and pat_dir == 1 else (0.75 if cd == 1 else (0.0 if cd == -1 else 0.5))
        cs = 1.0 if cd == -1 and pat_dir == -1 else (0.75 if cd == -1 else (0.0 if cd == 1 else 0.5))
        
        metrics = {
            'htf': (*directional(hb), f"Completed HTF bias: {['bearish','mixed','bullish'][hb+1]}"),
            'structure': (*directional(trend if break_age <= 30 else 0), f'{last_break}; {break_age if break_age < 999 else "no"} bars ago'),
            'liquidity': (*directional(ldir), f'{last_sweep or "No recent reclaimed swing"}; age {sweep_age if sweep_age < 999 else "—"}'),
            'displacement': (db, ds, f'Body / ATR = {ratio:.2f}; direction {cd}'),
            'fvg': (fv(freshbull), fv(freshbear), f'Active zones: {len(zones)}'),
            'position': (*pos, 'Equilibrium ' + (f'{eq:.2f}' if eq else 'unavailable')),
            'candle': (cb, cs, f'{pat_name} (direction: {cd}, pattern match: {pat_dir != 0})'),
            'session': (0.65 if active else 0.35, 0.65 if active else 0.35, 'ICT Killzone (London/NY)' if active else 'Outside killzone session')
        }
        
        bull = sum(weights[k] * x[0] for k, x in metrics.items())
        bear = sum(weights[k] * x[1] for k, x in metrics.items())
        net = bull - bear
        classification = 'Strong bullish' if bull >= 80 and net >= 25 else 'Bullish' if bull >= 65 and net >= 15 else 'Strong bearish' if bear >= 80 and net <= -25 else 'Bearish' if bear >= 65 and net <= -15 else 'Neutral'
        ready = atr is not None and len(aggregates[htf_mult]['available']) >= 3 and last_hi is not None and last_lo is not None
        
        # Confirmation logic: structure break, liquidity sweep, or recognized pattern reaction at FVG
        pattern_confirms = (pat_dir == cd and pat_dir != 0)
        confirmation = bool(ready and cd and not in_news_blackout and ((trend == cd and break_age <= 8) or (ldir == cd and sweep_age <= 8) or (pattern_confirms and len(zones) > 0)))
        
        results.append({
            'time': t,
            'bull': round(bull, 1),
            'bear': round(bear, 1),
            'net': round(net, 1),
            'classification': classification if ready else 'Insufficient data',
            'ready': ready,
            'htf': hb,
            'mtf': mb,
            'ltf': trend,
            'break': last_break,
            'sweep': last_sweep or 'None',
            'atr': round(atr, 5) if atr else None,
            'equilibrium': eq,
            'pattern': pat_name,
            'pattern_dir': pat_dir,
            'pattern_conf': pat_conf,
            'trend_regime': trend_regime,
            'in_killzone': in_killzone,
            'is_news_shock': is_news_shock,
            'in_news_blackout': in_news_blackout,
            'touching_ob': 1 if touching_bull_ob else (-1 if touching_bear_ob else 0),
            'ote_confluence': ote_confluence,
            'last_hi': last_hi,
            'last_lo': last_lo,
            'regime': regime_label,
            'sub_phase': regime_sub,
            'regime_confidence': regime_conf,
            'vwma': vw.get('vwma'),
            'vwma_crossover': vw_cross,
            'vwma_divergence': vw_div,
            'pre_reactive_signal': pre_reactive,
            'metrics': {k: {'bull': round(v[0] * weights[k], 2), 'bear': round(v[1] * weights[k], 2), 'max': weights[k], 'explanation': v[2]} for k, v in metrics.items()},
            'zones': [dict(z) for z in zones[-20:]],
            'conflict': bool(mb and hb and mb != hb),
            'confirmation': confirmation,
            'confirmation_direction': cd
        })
        prior = c
    return results

def backtest(candles, results, minutes=5, rr=1.5, stop_atr=1.0, horizon=None, cost=0.0, threshold=65,
             target_mode='structural', stop_mode='structural', min_rr=1.5, require_pattern=False,
             filter_trend=False, filter_killzone=False, filter_news=True, filter_ote=False, filter_ob=False,
             filter_regime=False, filter_vwma=False):
    """
    Backtesting engine supporting:
    - Structural Take Profit: Previous swing highs (BSL) / swing lows (SSL)
    - Structural Stop Loss: Invalidation below/above the reaction FVG and local swing
    - Dynamic RR filtering: Only execute when structural RR >= min_rr
    - Multi-indicator confluences: Macro Trend (200 EMA), ICT Killzones, News Filter, OTE 0.705, Order Blocks, Wyckoff Regimes, VWMA
    - Full chronological splits (Train 60%, Validation 20%, Test 20%)
    """
    n = len(candles)
    if horizon is None:
        horizon = max(24, int((60 / max(1, minutes)) * 12))  # 12 hours of price action
        
    groups = {'Train': [], 'Validation': [], 'Test': []}
    excluded = {k: {'tie': 0, 'gap': 0, 'timeout': 0, 'rr_filtered': 0, 'indicator_filtered': 0} for k in groups}
    i = 0
    
    while i < n - 1:
        r = results[i]
        group = 'Train' if i < n * 0.6 else ('Validation' if i < n * 0.8 else 'Test')
        end = int(n * 0.6) if group == 'Train' else (int(n * 0.8) if group == 'Validation' else n)
        
        d = 1 if r['classification'] in ('Bullish', 'Strong bullish') and r['bull'] >= threshold else (-1 if r['classification'] in ('Bearish', 'Strong bearish') and r['bear'] >= threshold else 0)
        
        # Basic filtering
        if not d or not r['atr'] or not r['confirmation'] or r['confirmation_direction'] != d or i + horizon >= end:
            i += 1
            continue
            
        # 1. News Shock Filter (CPI / PPI / FOMC avoidance)
        if filter_news and (r.get('in_news_blackout') or r.get('is_news_shock')):
            excluded[group]['indicator_filtered'] += 1
            i += 1
            continue
            
        # 2. Macro Trend Filter (200 EMA)
        if filter_trend and r.get('trend_regime') != d:
            excluded[group]['indicator_filtered'] += 1
            i += 1
            continue
            
        # 3. Killzone Session Filter (London / NY Open only)
        if filter_killzone and not r.get('in_killzone'):
            excluded[group]['indicator_filtered'] += 1
            i += 1
            continue
            
        # 4. 0.705 OTE Retracement Confluence
        if filter_ote and r.get('ote_confluence') != d:
            excluded[group]['indicator_filtered'] += 1
            i += 1
            continue
            
        # 5. Order Block Retest Confluence
        if filter_ob and r.get('touching_ob') != d:
            excluded[group]['indicator_filtered'] += 1
            i += 1
            continue
            
        # 6. Candlestick Confirmation Filter
        if require_pattern and (r.get('pattern_dir') != d):
            excluded[group]['indicator_filtered'] += 1
            i += 1
            continue
            
        # 7. Wyckoff Market Regime Filter (Accumulation for longs, Distribution for shorts, avoid Consolidation)
        if filter_regime:
            regime = r.get('regime', 'consolidation')
            if d == 1 and regime not in ('accumulation', 'markup'):
                excluded[group]['indicator_filtered'] += 1
                i += 1
                continue
            elif d == -1 and regime not in ('distribution', 'markdown'):
                excluded[group]['indicator_filtered'] += 1
                i += 1
                continue

        # 8. VWMA Momentum Crossover / Volume Divergence Filter
        if filter_vwma:
            vw_cross = r.get('vwma_crossover', 0)
            vw_div = r.get('vwma_divergence', 0.0)
            if d == 1 and not (vw_cross == 1 or vw_div > 0.05):
                excluded[group]['indicator_filtered'] += 1
                i += 1
                continue
            elif d == -1 and not (vw_cross == -1 or vw_div < -0.05):
                excluded[group]['indicator_filtered'] += 1
                i += 1
                continue
            
        entry = candles[i]['close']
        atr_val = r['atr']
        
        # Stop Loss determination (Strict Sniper: Immediate Impulse Candle SL with Hard Cap)
        if stop_mode == 'structural':
            if d == 1:
                # Long: find the immediate impulse/displacement low in the last 4 bars
                impulse_low = min(c['low'] for c in candles[max(0, i - 4):i + 1])
                sl = impulse_low - (0.20 * atr_val)
                # Strict Risk Cap: between 0.7x ATR (min noise) and 2.0x ATR (max risk protection)
                sl = max(entry - (2.0 * atr_val), min(entry - (0.7 * atr_val), sl))
            else:
                # Short: find the immediate impulse/displacement high in the last 4 bars
                impulse_high = max(c['high'] for c in candles[max(0, i - 4):i + 1])
                sl = impulse_high + (0.20 * atr_val)
                # Strict Risk Cap: between 0.7x ATR and 2.0x ATR
                sl = min(entry + (2.0 * atr_val), max(entry + (0.7 * atr_val), sl))
        else:
            sl = entry - d * (atr_val * min(stop_atr, 1.8))
            
        risk = abs(entry - sl)
        if risk <= 1e-5:
            i += 1
            continue
            
        # Take Profit determination (Internal & Structural Key Levels for Consistent 1.0R - 1.8R Profit)
        if target_mode == 'structural':
            if d == 1:
                # Find nearest internal key resistance / reaction high in last 25 bars
                candidate_highs = [candles[k]['high'] for k in range(max(0, i - 25), i)
                                   if (candles[k]['high'] - entry) >= 0.95 * risk and (candles[k]['high'] - entry) <= 2.2 * risk]
                tp = min(candidate_highs) if candidate_highs else entry + risk * max(1.0, min(1.8, min_rr))
            else:
                # Find nearest internal key support / reaction low in last 25 bars
                candidate_lows = [candles[k]['low'] for k in range(max(0, i - 25), i)
                                  if (entry - candles[k]['low']) >= 0.95 * risk and (entry - candles[k]['low']) <= 2.2 * risk]
                tp = max(candidate_lows) if candidate_lows else entry - risk * max(1.0, min(1.8, min_rr))
                
            effective_rr = abs(tp - entry) / risk
            
            if effective_rr < max(1.0, min(min_rr, 1.2)):
                excluded[group]['rr_filtered'] += 1
                i += 1
                continue
        else:
            effective_rr = rr
            tp = entry + d * (risk * rr)
            
        out = None
        exit_j = i + horizon
        
        for j in range(i + 1, min(n, i + horizon + 1)):
            c = candles[j]
            if c['time'] - candles[j - 1]['time'] != minutes * 60:
                out = 'gap'
                exit_j = j
                break
            hs = c['low'] <= sl if d == 1 else c['high'] >= sl
            ht = c['high'] >= tp if d == 1 else c['low'] <= tp
            if hs and ht:
                out = 'tie'
                exit_j = j
                break
            if hs or ht:
                out = 'win' if ht else 'loss'
                exit_j = j
                break
                
        if out in ('win', 'loss'):
            value = (effective_rr if out == 'win' else -1.0) - (cost / risk if risk > 0 else 0)
            groups[group].append({
                'entry_idx': i,
                'entry_time': candles[i]['time'],
                'exit_idx': exit_j,
                'exit_time': candles[min(n - 1, exit_j)]['time'],
                'direction': d,
                'entry': round(entry, 2),
                'sl': round(sl, 2),
                'tp': round(tp, 2),
                'risk': round(risk, 2),
                'rr': round(effective_rr, 2),
                'outcome': out,
                'r': round(value, 2),
                'pattern': r.get('pattern', 'Standard'),
                'regime': r.get('regime', 'consolidation'),
                'setup': r.get('pre_reactive_signal', {}).get('setup', 'FVG Reaction') if r.get('pre_reactive_signal') else 'FVG Reaction'
            })
        else:
            excluded[group][out or 'timeout'] += 1
            
        i = (exit_j + 1 if out in ('win', 'loss') else i + horizon + 1)
        
    result = {}
    for k, trades in groups.items():
        wins = sum(t['outcome'] == 'win' for t in trades)
        tot_r = sum(t['r'] for t in trades)
        gross_profit = sum(t['r'] for t in trades if t['r'] > 0)
        gross_loss = abs(sum(t['r'] for t in trades if t['r'] < 0))
        profit_factor = round(gross_profit / gross_loss, 2) if gross_loss > 0 else (round(gross_profit, 2) if gross_profit > 0 else None)
        
        equity = peak = dd = 0
        for t in trades:
            equity += t['r']
            peak = max(peak, equity)
            dd = max(dd, peak - equity)
            
        result[k] = {
            'trades': len(trades),
            'wins': wins,
            'winRate': round(100 * wins / len(trades), 1) if trades else None,
            'netR': round(tot_r, 2),
            'maxDrawdownR': round(dd, 2),
            'expectancyR': round(tot_r / len(trades), 2) if trades else None,
            'profitFactor': profit_factor,
            'tradeList': trades[-40:],
            'excluded': excluded[k]
        }
    return result

def optimize(candles, results, minutes=5, cost=0.0):
    """
    Multi-Indicator Combination Optimizer.
    Evaluates individual indicators and multi-indicator confluence setups (2 or more indicators)
    across the 60% Train dataset and tests them on the 20% Validation held-out dataset.
    """
    candidates = [
        # 1. Institutional Pre-Reactive Confluence (Regime + VWMA Divergence + FVG + Trend)
        {
            'name': 'Institutional Pre-Reactive (Regime + VWMA + Trend)',
            'indicators': ['Wyckoff Regime', 'VWMA × EMA Crossover', '200 EMA Macro Trend', 'CPI/PPI News Filter'],
            'threshold': 65,
            'target_mode': 'structural',
            'stop_mode': 'structural',
            'min_rr': 1.6,
            'rr': 1.6,
            'stop_atr': 1.0,
            'require_pattern': False,
            'filter_trend': True,
            'filter_killzone': False,
            'filter_news': True,
            'filter_ote': False,
            'filter_ob': False,
            'filter_regime': True,
            'filter_vwma': True
        },
        # 2. Wyckoff Phase Sniper (Accumulation Long / Distribution Short + Killzones)
        {
            'name': 'Wyckoff Sniper (Regime + Killzones + News)',
            'indicators': ['Wyckoff Regime', 'ICT Killzones', 'CPI/PPI News Filter'],
            'threshold': 65,
            'target_mode': 'structural',
            'stop_mode': 'structural',
            'min_rr': 1.5,
            'rr': 1.5,
            'stop_atr': 1.0,
            'require_pattern': False,
            'filter_trend': False,
            'filter_killzone': True,
            'filter_news': True,
            'filter_ote': False,
            'filter_ob': False,
            'filter_regime': True,
            'filter_vwma': False
        },
        # 3. VWMA Volume-Trend Rider (VWMA Crossover + 200 EMA Macro Trend)
        {
            'name': 'VWMA Volume-Trend Rider (VWMA + Trend + News)',
            'indicators': ['VWMA × EMA Crossover', '200 EMA Macro Trend', 'CPI/PPI News Filter'],
            'threshold': 65,
            'target_mode': 'structural',
            'stop_mode': 'structural',
            'min_rr': 1.6,
            'rr': 1.6,
            'stop_atr': 1.0,
            'require_pattern': False,
            'filter_trend': True,
            'filter_killzone': False,
            'filter_news': True,
            'filter_ote': False,
            'filter_ob': False,
            'filter_regime': False,
            'filter_vwma': True
        },
        # 4. Triple Confluence: FVG + Macro Trend + Killzones + News
        {
            'name': 'Triple Confluence: FVG + Trend + Killzones',
            'indicators': ['FVG Reaction', '200 EMA Macro Trend', 'ICT Killzones', 'CPI/PPI News Filter'],
            'threshold': 65,
            'target_mode': 'structural',
            'stop_mode': 'structural',
            'min_rr': 1.8,
            'rr': 1.8,
            'stop_atr': 1.0,
            'require_pattern': False,
            'filter_trend': True,
            'filter_killzone': True,
            'filter_news': True,
            'filter_ote': False,
            'filter_ob': False,
            'filter_regime': False,
            'filter_vwma': False
        },
        # 5. Full ICT Edge (FVG + Key Levels + Trend + News)
        {
            'name': 'Full ICT Edge (FVG + Key Levels + Trend + News)',
            'indicators': ['FVG Reaction', 'Key Levels (OTE/OB)', '200 EMA Macro Trend', 'CPI/PPI News Filter'],
            'threshold': 65,
            'target_mode': 'structural',
            'stop_mode': 'structural',
            'min_rr': 2.0,
            'rr': 2.0,
            'stop_atr': 1.0,
            'require_pattern': False,
            'filter_trend': True,
            'filter_killzone': False,
            'filter_news': True,
            'filter_ote': True,
            'filter_ob': False,
            'filter_regime': False,
            'filter_vwma': False
        },
        # 6. Killzone Sniper (Candlestick + FVG + Killzone)
        {
            'name': 'Killzone Sniper (Candlestick + FVG + Killzone)',
            'indicators': ['FVG Reaction', 'Candlestick Reversal', 'ICT Killzones'],
            'threshold': 70,
            'target_mode': 'fixed',
            'stop_mode': 'structural',
            'min_rr': 1.5,
            'rr': 1.5,
            'stop_atr': 1.0,
            'require_pattern': True,
            'filter_trend': False,
            'filter_killzone': True,
            'filter_news': True,
            'filter_ote': False,
            'filter_ob': False,
            'filter_regime': False,
            'filter_vwma': False
        },
        # 7. Raw FVG Baseline (No Additional Filters)
        {
            'name': 'Raw FVG Baseline (No Additional Filters)',
            'indicators': ['FVG Reaction'],
            'threshold': 65,
            'target_mode': 'structural',
            'stop_mode': 'structural',
            'min_rr': 1.5,
            'rr': 1.5,
            'stop_atr': 1.0,
            'require_pattern': False,
            'filter_trend': False,
            'filter_killzone': False,
            'filter_news': False,
            'filter_ote': False,
            'filter_ob': False,
            'filter_regime': False,
            'filter_vwma': False
        }
    ]
    
    scored = []
    min_req_trades = 1
    for c in candidates:
        bt = backtest(
            candles, results, minutes=minutes, rr=c['rr'], stop_atr=c['stop_atr'],
            threshold=c['threshold'], cost=cost, target_mode=c['target_mode'],
            stop_mode=c['stop_mode'], min_rr=c['min_rr'], require_pattern=c['require_pattern'],
            filter_trend=c['filter_trend'], filter_killzone=c['filter_killzone'],
            filter_news=c['filter_news'], filter_ote=c['filter_ote'], filter_ob=c['filter_ob'],
            filter_regime=c.get('filter_regime', False), filter_vwma=c.get('filter_vwma', False)
        )
        tr = bt['Train']
        val = bt['Validation']
        if tr['trades'] >= min_req_trades:
            exp = tr['expectancyR'] if tr['expectancyR'] is not None else -99
            val_exp = val['expectancyR'] if val['expectancyR'] is not None else -99
            scored.append({
                **c,
                'trainTrades': tr['trades'],
                'trainWinRate': tr['winRate'],
                'trainNetR': tr['netR'],
                'trainExp': exp,
                'valTrades': val['trades'],
                'valWinRate': val['winRate'],
                'valNetR': val['netR'],
                'valExp': val_exp,
                'valProfitFactor': val['profitFactor']
            })
            
    scored.sort(key=lambda x: (x['valExp'], x['trainExp']), reverse=True)
    return scored

def run_correlation_study(candles, results, forward_bars=20):
    """
    Computes statistical correlations between each indicator signal and future N-bar price returns,
    both globally and segmented by market regime (Accumulation, Markup, Distribution, Markdown, Consolidation).
    """
    regimes = classify_regimes(candles)
    vwma_data = vwma_ema_crossover(candles)
    return analyze_correlations(candles, results, regimes, vwma_data, forward_bars=forward_bars)
