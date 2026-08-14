# Futures Safety Primer

Crypto futures can lose capital rapidly. Automation increases execution speed, not correctness.

## Before any position

- Know the contract type, settlement asset, tick size, quantity step, minimum order, fee schedule, funding schedule, and maintenance-margin rules.
- Calculate stop distance, position size, estimated fees, slippage allowance, and worst intended loss.
- Use isolated margin unless the approved risk policy explicitly permits cross margin.
- Confirm protective orders are accepted by the exchange and marked reduce-only where appropriate.
- Never treat a liquidation level as a stop-loss.

## Failure modes to design for

- Stale or missing market data
- Partial fills and rejected orders
- Stop accepted locally but rejected remotely
- Duplicate requests after a timeout
- Exchange/API outage
- Sudden spread expansion or illiquidity
- Clock drift and candle-boundary errors
- Position exists at exchange but not locally
- API key compromise
- Strategy loop restarting with an unknown position

The safe response to uncertainty is to stop opening risk, reconcile actual exchange state, alert the operator, and preserve an audit log.

