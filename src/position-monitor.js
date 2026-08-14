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
  return null;
}

export function timeBasedPaperAction(position, markPrice, now = Date.now()) {
  const elapsed=(now-Date.parse(position.openedAt))/60_000, profitable=Number(markPrice)<Number(position.entry);
  if (!profitable) return null;
  if (!position.timeExits?.tp1Done && elapsed>=5) return {type:'TP1', fraction:1/3};
  if (position.timeExits?.tp1Done && !position.timeExits?.tp2Done && elapsed>=15) return {type:'TP2', fraction:1/3, moveStopToTp1:true};
  if (position.timeExits?.tp2Done && elapsed>=60) return {type:'TP3', fraction:1};
  return null;
}
