const TIMEFRAMES = [
  { key: '1m' }, { key: '3m' }, { key: '5m' }, { key: '15m' }
];
const value = (bar, index) => Number(bar[index]);

function confirmedPivotLow(bars, index, confirmedAt) {
  if (index < 2 || index + 2 > confirmedAt) return false;
  const low = value(bars[index], 3);
  return low < value(bars[index - 1], 3) && low < value(bars[index - 2], 3) && low < value(bars[index + 1], 3) && low < value(bars[index + 2], 3);
}

function rejectsResistance(bar, resistance, config) {
  const open = value(bar, 1), high = value(bar, 2), low = value(bar, 3), close = value(bar, 4);
  const below = (config.rejectionBelowResistanceBps ?? 75) / 10_000;
  const above = (config.rejectionAboveResistanceBps ?? 50) / 10_000;
  const body = Math.abs(close - open), upperWick = high - Math.max(open, close), range = Math.max(high - low, Number.EPSILON);
  return high >= resistance * (1 - below) && high <= resistance * (1 + above) && close < resistance && upperWick / Math.max(body, Number.EPSILON) >= (config.rejectionMinimumWickBodyRatio ?? .5) && close <= low + range * .6;
}

function pivotBelow(bars, rejectionIndex) {
  for (let index = rejectionIndex - 2; index >= Math.max(2, rejectionIndex - 30); index -= 1) {
    if (confirmedPivotLow(bars, index, rejectionIndex) && value(bars[index], 3) < value(bars[rejectionIndex], 4)) return value(bars[index], 3);
  }
  return null;
}

function firstSignal(bars, resistance, config, timeframe) {
  const closed = bars.slice(0, -1);
  for (let rejectionIndex = 4; rejectionIndex < closed.length - 1; rejectionIndex += 1) {
    const rejection = closed[rejectionIndex]; if (!rejectsResistance(rejection, resistance, config)) continue;
    const support = pivotBelow(closed, rejectionIndex); if (!support) continue;
    return { timeframe, confirmationTime: value(rejection, 6), entryPrice: value(rejection, 4), rejectionWick: value(rejection, 2), support, rejectionTime: value(rejection, 6) };
  }
  return null;
}

export function findFirstMultiTimeframeEntry({ barsByTimeframe, resistance, currentPrice, config }) {
  if (!(resistance > 0)) return { found: false, reason: 'No established resistance.' };
  const signals = TIMEFRAMES.map(({ key }, priority) => {
    const signal = firstSignal(barsByTimeframe[key] || [], resistance, config, key);
    return signal && { ...signal, priority };
  }).filter(Boolean).sort((a, b) => a.confirmationTime - b.confirmationTime || a.priority - b.priority);
  if (!signals.length) return { found: false, reason: 'No completed lower-timeframe rejection at active resistance with support below entry.' };
  const signal = signals[0], freshness = (config.entryFreshnessBps ?? 20) / 10_000;
  return { found: true, ...signal, entryFresh: Math.abs(currentPrice - signal.entryPrice) / signal.entryPrice <= freshness };
}
