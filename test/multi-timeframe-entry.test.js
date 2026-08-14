import test from 'node:test';
import assert from 'node:assert/strict';
import { findFirstMultiTimeframeEntry } from '../src/market/multi-timeframe-entry.js';

function bar(time, open, high, low, close) { return [time, open, high, low, close, 0, time + 59_999]; }

test('uses the first completed 1m rejection at resistance before later timeframes', () => {
  const bars = [
    bar(0, 9.6, 9.8, 9.3, 9.5), bar(60_000, 9.5, 9.6, 9.1, 9.2), bar(120_000, 9.2, 9.5, 8.9, 9.1),
    bar(180_000, 9.1, 9.7, 9.0, 9.5), bar(240_000, 9.5, 9.8, 9.2, 9.6), bar(300_000, 9.6, 10.02, 9.5, 9.6),
    bar(360_000, 9.6, 9.7, 8.8, 8.85), bar(420_000, 8.85, 9.0, 8.7, 8.8)
  ];
  const config = { rejectionBelowResistanceBps: 75, rejectionAboveResistanceBps: 50, rejectionMinimumWickBodyRatio: .5, breakdownBufferBps: 10, entryFreshnessBps: 20 };
  const result = findFirstMultiTimeframeEntry({ barsByTimeframe: { '1m': bars, '3m': [], '5m': [], '15m': [] }, resistance: 10, currentPrice: 8.85, config });
  assert.equal(result.found, true);
  assert.equal(result.timeframe, '1m');
  assert.equal(result.entryPrice, 9.6);
  assert.equal(result.entryFresh, false);
});

test('creates an entry at rejection when a confirmed support is below entry', () => {
  const bars = [bar(0, 9.4, 9.7, 9.1, 9.5), bar(60_000, 9.5, 9.6, 9.2, 9.3), bar(120_000, 9.3, 9.5, 9.0, 9.2), bar(180_000, 9.2, 9.8, 9.1, 9.6), bar(240_000, 9.6, 10.02, 9.5, 9.6), bar(300_000, 9.6, 9.8, 9.4, 9.7), bar(360_000, 9.7, 9.8, 9.5, 9.6)];
  const result = findFirstMultiTimeframeEntry({ barsByTimeframe: { '1m': bars }, resistance: 10, currentPrice: 9.6, config: {} });
  assert.equal(result.found, true);
  assert.equal(result.entryPrice, 9.6);
});
