# Testing and Validation Framework

## Validation ladder

1. **Rule tests:** formulas, boundaries, timeframes, rounding, and missing data.
2. **Historical backtest:** chronological data with realistic fees, funding, spread, slippage, and delistings where applicable.
3. **Out-of-sample test:** untouched period or walk-forward segments.
4. **Paper test:** real-time signals and simulated fills.
5. **Testnet:** exchange integration, order lifecycle, protective orders, recovery, and reconciliation.
6. **Small live pilot:** requires explicit approval and separate live release plan; not currently authorized.

## Bias controls

Check look-ahead bias, survivorship bias, data snooping/overfitting, selection bias, candle-boundary mistakes, unrealistic fills, missing costs, and repeated tuning against the same holdout period.

## Minimum report

- Strategy/config/data versions and date range
- Number of opportunities and trades
- Net expectancy and profit factor after costs
- Win rate, average win/loss, and R distribution
- Maximum drawdown and losing streak
- Exposure, turnover, and holding time
- Results by symbol, regime, and time period
- Sensitivity to costs and nearby parameter values
- Incidents, rejected decisions, and unresolved discrepancies

## Approval gates

Numeric thresholds remain `TBD` until deliberately chosen. Approval must consider robustness and risk, not only net profit. Any material rule change returns the system to the appropriate earlier validation stage.

