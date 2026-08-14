export class RiskEngine {
  constructor(config, state) { this.config = config; this.state = state; }

  assess({ symbol, candleId }) {
    const reasons = [];
    if (this.state.killSwitch) reasons.push('Emergency kill switch is active.');
    if (this.state.positions.length >= this.config.maxPositions) reasons.push('Maximum simultaneous positions reached.');
    if (this.state.dailyRealizedPnl <= -(this.state.startOfDayEquity * this.config.dailyLossHaltPct / 100)) reasons.push('Daily realized-loss halt reached.');
    if (this.state.consecutiveLosses >= this.config.consecutiveLossHalt) reasons.push('Consecutive-loss pause active until next UTC day.');
    if (this.state.stopOutLocks.some(lock => lock.symbol === symbol && lock.candleId === candleId)) reasons.push('Same-coin re-entry is locked for this 3-day candle.');
    return { allowed: reasons.length === 0, reasons };
  }
}
