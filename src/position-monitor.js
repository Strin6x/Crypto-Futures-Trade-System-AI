export function markPaperShort(position, markPrice) {
  const entry = Number(position.entry), quantity = Number(position.quantity), stop = Number(position.stop);
  const mark = Number(markPrice);
  const unrealizedPnl = (entry - mark) * quantity;
  const notional = entry * quantity;
  const riskPerUnit = stop - entry;
  return {
    entry,
    mark,
    quantity,
    stop,
    target: Number(position.target),
    unrealizedPnl,
    unrealizedPnlPct: notional > 0 ? (unrealizedPnl / notional) * 100 : 0,
    rMultiple: riskPerUnit > 0 ? (entry - mark) / riskPerUnit : 0,
    state: mark >= stop ? 'STOP AT RISK' : mark <= Number(position.target) ? 'TARGET REACHED' : unrealizedPnl >= 0 ? 'IN PROFIT' : 'IN LOSS'
  };
}

// Paper protective orders are filled at their configured trigger price. This
// keeps a paper result tied to the planned risk rather than allowing a stale
// simulated position to continue beyond its stop.
export function protectivePaperExit(markedPosition) {
  if (markedPosition.mark >= markedPosition.stop) {
    return { price: markedPosition.stop, reason: 'STOP_LOSS' };
  }
  if (markedPosition.mark <= markedPosition.target) {
    return { price: markedPosition.target, reason: 'TAKE_PROFIT' };
  }
  return null;
}
