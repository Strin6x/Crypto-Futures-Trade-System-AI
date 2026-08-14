# Trading and Paper-Testing Runbook

## Before a session

1. Confirm environment is paper or approved testnet, never production.
2. Confirm strategy/config version and record it.
3. Verify market-data health, system clock, exchange status, and contract metadata.
4. Confirm risk limits, account baseline, no unknown positions, and kill switch.
5. Start the session log.

## For each decision

Record candidate, timestamp, raw inputs, rule-by-rule pass/fail/unknown result, rejection reason or approved size, intended entry/stop/target, estimated costs, and resulting order events.

## After a position closes

Record actual fills, fees, funding, slippage, realized P&L, R-multiple, maximum favorable/adverse excursion, exit reason, incidents, and screenshots or data references.

## End of session

Reconcile positions and orders, export logs, record daily results, note rule ambiguities and incidents, and do not change thresholds merely to improve that session’s result.

