"""
Algorithmic Candlestick Pattern Recognition for FVG Zone Reactions.
Detects major reversal and continuation patterns aligned with Price Action & ICT principles.
"""

def detect_pattern(candles, i):
    """
    Detects if a recognized candlestick pattern completed at candle index `i`.
    Returns dict with name, direction (1 = bullish, -1 = bearish, 0 = neutral),
    category ('bullish' | 'bearish' | 'neutral'), and confidence score (0.5 to 1.0).
    """
    if i < 1:
        return None
    c = candles[i]
    prev = candles[i - 1]
    
    body = abs(c['close'] - c['open'])
    rng = c['high'] - c['low']
    if rng <= 1e-6:
        return {'name': 'Doji', 'direction': 0, 'category': 'neutral', 'confidence': 0.6}
        
    upper_wick = c['high'] - max(c['open'], c['close'])
    lower_wick = min(c['open'], c['close']) - c['low']
    is_bull = c['close'] > c['open']
    is_bear = c['close'] < c['open']
    
    prev_body = abs(prev['close'] - prev['open'])
    prev_rng = prev['high'] - prev['low']
    prev_bull = prev['close'] > prev['open']
    prev_bear = prev['close'] < prev['open']

    # 1. Bullish Engulfing
    if prev_bear and is_bull and c['close'] >= prev['open'] and c['open'] <= prev['close'] and body > prev_body:
        return {'name': 'Bullish Engulfing', 'direction': 1, 'category': 'bullish', 'confidence': 0.95}

    # 2. Bearish Engulfing
    if prev_bull and is_bear and c['close'] <= prev['open'] and c['open'] >= prev['close'] and body > prev_body:
        return {'name': 'Bearish Engulfing', 'direction': -1, 'category': 'bearish', 'confidence': 0.95}

    # 3. Hammer / Bullish Pin Bar
    if lower_wick >= 2.0 * body and upper_wick <= 0.3 * rng and lower_wick >= 0.55 * rng:
        return {'name': 'Hammer', 'direction': 1, 'category': 'bullish', 'confidence': 0.90}

    # 4. Shooting Star / Bearish Pin Bar
    if upper_wick >= 2.0 * body and lower_wick <= 0.3 * rng and upper_wick >= 0.55 * rng:
        return {'name': 'Shooting Star', 'direction': -1, 'category': 'bearish', 'confidence': 0.90}

    # 5. Inverted Hammer
    if is_bull and upper_wick >= 2.0 * body and lower_wick <= 0.2 * rng:
        return {'name': 'Inverted Hammer', 'direction': 1, 'category': 'bullish', 'confidence': 0.85}

    # 6. Hanging Man
    if is_bear and lower_wick >= 2.0 * body and upper_wick <= 0.2 * rng:
        return {'name': 'Hanging Man', 'direction': -1, 'category': 'bearish', 'confidence': 0.80}

    # 7. Tweezer Bottom
    if abs(c['low'] - prev['low']) <= 0.08 * rng and prev_bear and is_bull and lower_wick >= 0.35 * rng:
        return {'name': 'Tweezer Bottom', 'direction': 1, 'category': 'bullish', 'confidence': 0.85}

    # 8. Tweezer Top
    if abs(c['high'] - prev['high']) <= 0.08 * rng and prev_bull and is_bear and upper_wick >= 0.35 * rng:
        return {'name': 'Tweezer Top', 'direction': -1, 'category': 'bearish', 'confidence': 0.85}

    # 9. 3-Candle Patterns (Morning Star & Evening Star)
    if i >= 2:
        c0 = candles[i - 2]
        c0_body = abs(c0['close'] - c0['open'])
        c0_bear = c0['close'] < c0['open']
        c0_bull = c0['close'] > c0['open']
        
        # Morning Star: Bearish -> Small Star -> Bullish closing above midpoint of c0
        if c0_bear and prev_body < 0.4 * c0_body and is_bull and c['close'] > (c0['open'] + c0['close']) / 2:
            return {'name': 'Morning Star', 'direction': 1, 'category': 'bullish', 'confidence': 0.95}
            
        # Evening Star: Bullish -> Small Star -> Bearish closing below midpoint of c0
        if c0_bull and prev_body < 0.4 * c0_body and is_bear and c['close'] < (c0['open'] + c0['close']) / 2:
            return {'name': 'Evening Star', 'direction': -1, 'category': 'bearish', 'confidence': 0.95}

        # Three White Soldiers
        if c0_bull and prev_bull and is_bull and c['close'] > prev['close'] > c0['close'] and body > 0.6 * rng and prev_body > 0.6 * prev_rng:
            return {'name': 'Three White Soldiers', 'direction': 1, 'category': 'bullish', 'confidence': 0.88}

        # Three Black Crows
        if c0_bear and prev_bear and is_bear and c['close'] < prev['close'] < c0['close'] and body > 0.6 * rng and prev_body > 0.6 * prev_rng:
            return {'name': 'Three Black Crows', 'direction': -1, 'category': 'bearish', 'confidence': 0.88}

    # 10. Bullish / Bearish Marubozu
    if body >= 0.85 * rng:
        if is_bull:
            return {'name': 'Bullish Marubozu', 'direction': 1, 'category': 'bullish', 'confidence': 0.80}
        elif is_bear:
            return {'name': 'Bearish Marubozu', 'direction': -1, 'category': 'bearish', 'confidence': 0.80}

    # 11. Inside Bar
    if c['high'] <= prev['high'] and c['low'] >= prev['low']:
        return {'name': 'Inside Bar', 'direction': 0, 'category': 'neutral', 'confidence': 0.65}

    # 12. Doji
    if body <= 0.12 * rng:
        return {'name': 'Doji', 'direction': 0, 'category': 'neutral', 'confidence': 0.60}

    return None
