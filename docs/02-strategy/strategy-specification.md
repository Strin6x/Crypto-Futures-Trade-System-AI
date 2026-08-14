# Canonical Strategy Specification

Status: Draft  
Version: 0.1.0  
Owner: TBD  
Last reviewed: TBD

This is the canonical human-readable strategy. Replace every `TBD` before declaring it automation-ready.

## 1. Purpose and hypothesis

- Strategy name: TBD
- One-sentence edge hypothesis: TBD
- Why the behavior may persist: TBD
- Known environments where it should fail: TBD

## 2. Scope

- Exchange and market: TBD
- Contract type and settlement asset: TBD
- Symbols included/excluded: TBD
- Trading direction: long / short / both — TBD
- Decision timeframes: TBD
- Typical and maximum holding period: TBD
- Trading session/timezone: UTC unless otherwise stated

## 3. Required data

For every input define source, field, interval, lookback, freshness limit, and missing-data response.

| Input | Source | Definition | Freshness | Missing-data action |
|---|---|---|---|---|
| Candles | TBD | TBD | TBD | Reject evaluation |
| Ticker/ranking | TBD | TBD | TBD | Reject evaluation |
| Order book | TBD | TBD | TBD | Reject entry |
| Contract metadata | TBD | TBD | TBD | Reject entry |

## 4. Eligibility filter

Define objective minimum age, price, volume, spread, liquidity, and volatility rules plus excluded symbols and market events.

## 5. Market regime

- Allowed regime formula: TBD
- Disallowed regime formula: TBD
- Evaluation cadence: TBD

## 6. Setup conditions

List every condition that creates a valid candidate. Specify whether all conditions are required and how long a setup remains valid.

| ID | Condition | Exact formula | Timeframe | Required? |
|---|---|---|---|---|
| S1 | TBD | TBD | TBD | Yes |

## 7. Entry trigger

- Exact trigger: TBD
- Trigger evaluated on candle close or intrabar: TBD
- Order type: TBD
- Limit/stop price calculation: TBD
- Maximum acceptable spread/slippage: TBD
- Entry expiry/cancellation: TBD
- Behavior on partial fill or rejection: TBD

## 8. Invalidation and stop

- Setup invalid before entry when: TBD
- Initial stop formula: TBD
- Stop trigger type/price source: TBD
- Minimum and maximum stop distance: TBD
- Gap/slippage response: TBD

## 9. Position sizing

- Account equity definition: TBD
- Risk per trade: TBD
- Size formula: `allowed_loss / stop_distance`, adjusted for contract units and estimated costs
- Rounding rule: always round down to permitted quantity step
- Maximum notional/leverage: TBD
- Reject trade when computed size violates exchange minimums or risk limits

## 10. Trade management

- Partial exits: TBD
- Break-even rule: TBD
- Trailing-stop rule: TBD
- Time stop: TBD
- Adding to a position: prohibited unless explicitly specified
- Rules must never increase initial approved risk unintentionally

## 11. Exit hierarchy

Define priority when multiple conditions occur together.

1. Emergency/risk shutdown: TBD
2. Protective stop: TBD
3. Strategy invalidation: TBD
4. Profit target/trailing exit: TBD
5. Time exit: TBD

## 12. No-trade rules

Include stale data, excessive spread, insufficient history, abnormal volatility, daily loss stop, open-risk cap, exchange degradation, and conflicting/unknown state.

## 13. Portfolio constraints

- Maximum simultaneous positions: TBD
- Maximum total open risk: TBD
- Correlation/sector exposure rule: TBD
- Symbol cooldown after exit: TBD
- Daily/weekly loss limits: TBD

## 14. Assumptions and known weaknesses

- TBD

## 15. Acceptance criteria

The strategy is automation-ready only when no operative `TBD` remains, every rule has a test case, cost assumptions are documented, and paper validation meets the testing framework without unresolved critical incidents.

