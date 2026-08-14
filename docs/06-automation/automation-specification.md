# Automation Specification

Status: Draft  
Depends on: approved canonical strategy and risk policy

## Components

1. Market-data adapter
2. Candidate scanner
3. Feature/indicator calculator
4. Strategy rule engine
5. Risk engine
6. Order and broker adapter
7. Position/order reconciler
8. State store and audit log
9. Monitoring, alerts, and operator controls
10. Backtest/paper simulation adapters

## Decision contract

Each evaluation should emit an immutable record containing timestamp, symbol, data version/time, strategy/config version, feature values, every rule result, risk result, decision, rejection reason, proposed orders, and correlation ID.

Valid rule results are `PASS`, `FAIL`, and `UNKNOWN`. `UNKNOWN` must never be treated as `PASS`.

## Position state machine

`FLAT → CANDIDATE → ENTRY_PENDING → OPEN → EXIT_PENDING → FLAT`

Exceptional states include `RECONCILIATION_REQUIRED`, `HALTED`, and `ERROR`. Every transition needs an event, guard condition, durable record, retry/idempotency behavior, and recovery action.

## Order safety

- Use unique client order IDs and idempotent commands.
- Quantize prices and quantities using current exchange metadata.
- Confirm fills from exchange state, not request success alone.
- Verify protective orders after entry and after reconnect.
- Use reduce-only exits where supported.
- Prevent duplicate entries and unintended position reversal.
- Block orders when market data, metadata, clock, or account state is stale.

## Configuration

Configuration must be versioned, validated, logged, and separated by environment. Secrets must never enter browser state, logs, source control, or decision records.

## Observability

Track data freshness, scan duration, rule outcomes, API latency/errors, order lifecycle, position reconciliation, open risk, P&L, loss locks, and kill-switch state. Alerts must identify the environment and require acknowledgement for critical conditions.

## Release gates

- No unresolved critical/high-severity failures
- Complete unit, integration, replay, and failure-recovery tests
- Demonstrated restart reconciliation
- Verified protective-order behavior
- Approved strategy and risk versions
- Credentials scoped to minimum permissions; withdrawals disabled
- Explicit owner authorization for each higher-risk environment

