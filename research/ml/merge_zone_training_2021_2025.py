#!/usr/bin/env python3
"""Combine private OANDA snapshots without reading the reserved 2020 test year."""
import hashlib
import json
from pathlib import Path

folder = Path('research/data')
a = json.loads((folder / 'oanda-xau-m15-2021-2022.json').read_text())
b = json.loads((folder / 'oanda-xau-m15-2023-2025.json').read_text())
rows = a + b
start, end = 1609459200, 1767225600
if not rows or any(not start <= r['time'] < end for r in rows):
    raise ValueError('Training snapshot contains an unexpected timestamp')
if any(x['time'] >= y['time'] for x, y in zip(rows, rows[1:])):
    raise ValueError('Candles must be ordered and non-duplicated')
for r in rows:
    for side in (r, r['bid'], r['ask']):
        if not side['low'] <= min(side['open'], side['close']) <= max(side['open'], side['close']) <= side['high']:
            raise ValueError('Invalid candle OHLC')
raw = json.dumps(rows, separators=(',', ':'))
(folder / 'oanda-xau-m15-2021-2025.json').write_text(raw)
print('Training candles:', len(rows), 'SHA-256:', hashlib.sha256(raw.encode()).hexdigest())
