# Risk Policy

Status: Draft. All limits require owner approval before testnet or live execution.

## Non-negotiable principles

- Position size derives from predefined loss tolerance and stop distance, not desired profit.
- New positions are blocked whenever account, market, order, or position state is uncertain.
- Risk limits override strategy signals.
- Loss limits never automatically reset after a process restart.
- Live credentials and production endpoints remain prohibited until release approval.

## Limits register

| Limit | Value | Measurement | Breach action |
|---|---:|---|---|
| Risk per trade | TBD | % equity and currency | Reject entry |
| Maximum position notional | TBD | Currency | Reject/resize |
| Maximum leverage | TBD | Effective leverage | Reject entry |
| Maximum open risk | TBD | Sum of stop-loss risk | Reject entry |
| Maximum simultaneous positions | TBD | Count | Reject entry |
| Daily loss limit | TBD | Realized + defined unrealized P&L | Lock entries |
| Weekly loss limit | TBD | Same convention | Lock entries |
| Maximum drawdown | TBD | Peak-to-trough equity | Kill switch and review |
| Maximum spread/slippage | TBD | bps or % | Reject/cancel |

## Kill-switch triggers

Trigger a safe halt for unknown exchange position, missing protective order, repeated API errors, stale data, clock drift beyond tolerance, risk-ledger mismatch, breached loss limit, unauthorized configuration change, or manual operator stop.

## Restart policy

On startup: load the last durable state, query actual positions and open orders, reconcile differences, restore loss locks, and refuse new entries until reconciliation passes.

