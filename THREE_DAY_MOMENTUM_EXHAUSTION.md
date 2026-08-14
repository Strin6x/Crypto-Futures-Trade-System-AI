# Three-Day Momentum Exhaustion — Paper Profile

This profile is an experimental, paper-only interpretation of the strategy. It is a screening and simulation tool, not a promise of profit and not a live-trading system.

## What the profile looks for

1. A USDT perpetual pair that is among the current top five Futures gainers and is still up over the last 24 hours.
2. A green active three-day candle in its day-three monitoring period (48–72 hours old; 60 hours is the preferred point to begin watching).
3. Current price between 70% and 90% of the active three-day candle range, measured from the candle low toward its high.
4. An established daily resistance level near the top of that range.
5. The first completed rejection at that resistance followed by a close below a previously confirmed nearby swing low. The app checks 1m, 3m, 5m, and 15m data and uses the earliest completed confirmation.

## Starting paper settings

- Minimum 24-hour gain: 20%
- Day-three monitoring window: 48–72 hours; preferred at 60 hours
- Three-day range zone: 70–90%
- Daily resistance reactions: 3
- Resistance tolerance: 35 bps
- Rejection search envelope: 75 bps below to 50 bps above resistance
- Rejection wick/body ratio: at least 0.5
- Support-break buffer: 10 bps
- TP1 support clearance: 0 bps for the current paper test
- Entry freshness: within 20 bps of the completed breakdown
- Risk per paper trade: 1%; maximum leverage: 10x

## Protective trade plan

The stop is placed above the higher of the daily resistance wick and the rejection wick, plus the configured tick buffer. The first structural support is the paper trade target (TP1). TP2 and TP3 are intentionally left for operator review until additional support levels and partial-close handling are separately validated.

## Evidence and limits

The historical replay that informed this profile produced 16 in-sample entries and a temporal split with 9 earlier and 7 later entries. That is useful for checking that the rule can trigger, but it is far below the 30-trade threshold for judging a strategy. Continue in paper mode, do not modify the rules during the observation window, and review the logged entries before considering Testnet.
