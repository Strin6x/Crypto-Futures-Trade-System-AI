# Binance Futures Gainer-Reversal Short Strategy

**Status:** Draft v0.1
**Purpose:** Define a rule-based, automated short-selling strategy for selected Binance USDⓈ-M Futures pairs.
**Important:** This document describes a strategy to test. It does not guarantee profit. It must be backtested and run in paper/testnet mode before any live use.

---

## 1. Strategy in plain English

The strategy looks for coins that have risen sharply and appear in Binance's 24-hour top-gainer list. It does **not** short a coin simply because it has gone up.

Instead, it waits for all of the following:

1. The move is late enough in the active 3-day candle.
2. Price is near the top of that 3-day candle's range.
3. Price has reached a meaningful long-term daily resistance level.
4. On the 15-minute chart, price fails to break that resistance after two or three attempts.
5. Sellers take control: price prints a bearish rejection at resistance and breaks below nearby 15-minute support.

Only then does the bot open a short position. The stop-loss is based on the higher of the daily-resistance wick and the 15-minute rejection wick. The profit target equals the amount at risk (a 1:1 reward-to-risk target, also called **1R**).

---

## 2. Scope of version one

Version one trades only **gainers** and only opens **short** positions. The losers/long strategy is intentionally outside the first version and may be designed after this strategy is proven through testing.

The bot will use Binance USDⓈ-M Futures only. A coin that appears in the spot-market gainer list is eligible only if it also has a suitable, active Futures contract.

---

## 3. Core definitions

| Term | Meaning in this strategy |
|---|---|
| **3-day candle** | A price candle covering three calendar days. It provides the larger setup context. |
| **Daily resistance** | A price area where price has previously struggled to rise above, confirmed from the 1-day chart using up to two years of history. |
| **Retest** | Price returns to the resistance level after moving away from it. |
| **Bearish rejection** | Price tests resistance but is pushed back down by sellers, normally leaving an upper wick and closing below the level. |
| **Breakdown** | Price falls below the nearby 15-minute support or swing low after the rejection. |
| **Wick high** | The highest price reached within a candle, including its thin upper shadow. |
| **1R** | The same amount of profit as the maximum planned loss. If the stop represents a $20 loss, the 1R target is a $20 profit. |
| **Account equity** | The current total value of the trading account used for risk calculations. |

---

## 4. Candidate selection

### 4.1 Gainer scan

1. Retrieve Binance's current 24-hour top-gainer ranking.
2. Select the first five gainers.
3. Check whether each selected coin has an active USDⓈ-M perpetual Futures contract.
4. Reject any pair that fails the liquidity or spread checks.

### 4.2 Why this filter exists

The gainer list finds coins with unusually strong recent moves. The Futures and liquidity checks prevent the bot from entering markets where execution is poor, spreads are unusually wide, or a stop order may fill badly.

### 4.3 To be configured before backtesting

- Minimum 24-hour Futures volume.
- Maximum permitted bid-ask spread.
- Treatment of newly listed coins with limited daily history.

---

## 5. Higher-timeframe setup

### 5.1 3-day candle timing

The active 3-day candle must be at least **48 hours old** before the bot considers a trade. The preferred window is around **60 hours** into the candle.

The strategy does not trade in the first 48 hours of a new 3-day candle. This gives the market time to establish meaningful support and resistance levels.

### 5.2 3-day candle condition

The active 3-day candle must be green: its current price must be above its opening price.

### 5.3 Upper-range requirement

The current price must sit between **75% and 90%** of the active 3-day candle range, measured from the candle low toward its high.

```
range_position = (current_price - three_day_low)
                 / (three_day_high - three_day_low)
```

The setup is eligible only when:

```
0.75 <= range_position <= 0.90
```

### 5.4 Example

If the active 3-day candle has a low of $8.00 and a high of $12.00, its range is $4.00.

- 75% of the range is $11.00.
- 90% of the range is $11.60.

Price must be between $11.00 and $11.60 before the bot can look for the lower-timeframe short signal.

---

## 6. Daily resistance qualification

### 6.1 Primary level

The bot identifies a meaningful resistance level from the **1-day chart** using up to **two years of price history**.

This daily resistance is the main structural level for the trade. It is used for both the short setup and the protective stop-loss.

### 6.2 Required behavior at resistance

Price must reach or approach the qualified daily resistance. A short signal is not valid merely because price is high in the 3-day candle; the market must also show actual rejection at this daily level.

### 6.3 To be configured before backtesting

The following must be made numerical so the bot can apply them consistently:

- How close price must be to resistance to count as a test.
- How many historical daily reactions are required for a level to qualify.
- Whether resistance is a single exact price or a narrow price zone.

---

## 7. Entry confirmation and short entry

### 7.1 Retest structure

After price reaches the qualified resistance:

1. Use the 15-minute chart to observe the retest structure.
2. Price must test the resistance **two or three times**.
3. It must fail to break above and remain above the resistance.

### 7.2 Bearish rejection

After the failed retest, the bot requires a bearish rejection at or just below resistance. In plain terms: buyers push price upward, but sellers force it back down before the candle closes.

The rejection commonly has a noticeable upper wick and closes below the resistance level.

### 7.3 Breakdown confirmation

The bot waits until price breaks below the nearest 15-minute support or swing low created during the retest structure.

The 15-minute chart is the primary confirmation timeframe. The 3-minute and 5-minute charts are used only to confirm that short-term selling momentum agrees with the 15-minute breakdown.

### 7.4 Entry rule

Open a short position only when all conditions below are true:

1. The candidate passed the gainer, Futures, liquidity, and spread checks.
2. The 3-day candle is at least 48 hours old and is green.
3. Price is between 75% and 90% of the active 3-day candle range.
4. A qualified daily resistance is present.
5. The 15-minute chart shows two or three failed resistance retests.
6. A bearish rejection occurs at or below resistance.
7. Price breaks below the nearby 15-minute support/swing low.
8. The 3-minute and 5-minute charts confirm bearish momentum.
9. No risk-control limit blocks a new trade.

### 7.5 To be configured before backtesting

- Minimum upper-wick length for the rejection candle.
- Minimum candle-body or closing requirement.
- Exact definition of the 15-minute swing low.
- Exact 3-minute and 5-minute bearish-momentum tests.

---

## 8. Entry order execution

1. Submit a limit sell order at the planned breakdown-entry price.
2. Wait for a short configurable period, initially expected to be 30–60 seconds.
3. If the order has not filled, market-entry fallback is allowed only if the current price remains within a configurable maximum slippage distance of the planned entry.
4. If price has moved too far, cancel the setup. The bot must not chase the move.

---

## 9. Stop-loss

### 9.1 Stop placement

For every short position, calculate both:

1. The highest wick of the confirmed daily-resistance level.
2. The highest wick of the 15-minute bearish-rejection candle.

The stop-loss is placed slightly above the higher of those two values.

```
stop_loss = max(daily_resistance_wick_high,
                rejection_wick_high) + stop_buffer
```

### 9.2 Why the higher wick is used

Using the higher wick protects the trade against a valid retest of either relevant level. The trade is only invalidated when price moves beyond both the large-timeframe resistance and the lower-timeframe rejection high.

### 9.3 Stop behavior

- The stop-loss is submitted immediately after the entry fills.
- The stop must never be widened after entry.
- When triggered, it closes the short using a protective market-style exit.
- The buffer above the wick must be configurable and rounded to Binance's permitted price increment.

---

## 10. Position sizing and leverage

### 10.1 Risk limit

Each trade may risk a maximum of **2% of current account equity**.

Example: if account equity is $1,000, the planned maximum loss at the stop is $20.

### 10.2 Position-size calculation

The bot calculates size from the distance between entry and stop. It does not use the same size on every trade.

```
maximum_cash_risk = account_equity × 0.02
price_risk_per_unit = stop_loss - entry_price
position_quantity = maximum_cash_risk / price_risk_per_unit
```

The final quantity must be adjusted to Binance's minimum quantity, quantity step size, and maximum leverage rules.

### 10.3 Leverage

Maximum allowed leverage is **10×**. The bot may use less than 10× when that is sufficient to support the calculated position size safely.

### 10.4 Skip condition

If the technical stop is so distant that a valid 2%-risk position cannot be placed within the leverage, contract, or minimum-order constraints, the bot skips the trade.

---

## 11. Take-profit

### 11.1 Target

The take-profit target is **1R**. This means the expected profit equals the maximum amount at risk.

For a short position:

```
take_profit = entry_price - (stop_loss - entry_price)
```

### 11.2 Example

If a trade enters at $10.00 and its stop is $10.40, the price risk is $0.40 per unit. The 1R take-profit is $9.60.

### 11.3 Full exit

When the 1R take-profit is reached, close **100% of the position**. Version one does not use partial profit-taking or trailing stops.

### 11.4 Support check

Before entering, the bot must confirm that the next meaningful support does not make the 1R target unrealistic. If the likely support is too close, skip the trade.

---

## 12. Portfolio and daily safeguards

| Control | Rule |
|---|---|
| Maximum risk per trade | 2% of current account equity |
| Maximum leverage | 10× |
| Maximum simultaneous positions | 3 |
| Maximum daily realized loss | 6% of account equity |
| Consecutive-loss pause | Pause after 3 losing trades |
| Same-coin re-entry | Not allowed during the same 3-day candle after a stop-loss |

### 12.1 Daily-loss halt

When realized losses for the day reach 6% of equity, the bot must stop opening new positions until the next trading day.

### 12.2 Consecutive-loss halt

After three consecutive losing trades, the bot must stop opening new positions until the next trading day.

### 12.3 Existing positions

When a halt is triggered, the bot does not open new positions. Existing positions remain protected by their stop-loss and take-profit orders unless a later rule explicitly states otherwise.

---

## 13. Same-coin re-entry

If a position in a coin is stopped out, the bot must not open another position in that same coin during the current 3-day candle. It may still trade a different coin that satisfies every strategy and risk rule.

This protects version one from repeatedly trading a volatile gainer after the market has invalidated the original short thesis.

---

## 14. Required implementation safety features

The web application and trading engine must include:

1. A visible emergency **kill switch** that prevents new orders and can optionally close positions.
2. A complete trade log: candidate, signal conditions, entry, stop, target, size, fees, fill price, and exit reason.
3. Position and risk dashboard showing open risk, daily P&L, loss streak, and remaining daily-loss allowance.
4. Independent verification that stop-loss and take-profit orders exist after every entry.
5. A paper/testnet mode using the same strategy rules as live mode.
6. API keys stored securely and never exposed to the browser.
7. A startup reconciliation check that compares the bot's records with actual Binance positions and orders.

---

## 15. Testing sequence

1. Complete the configurable numerical rules in this document.
2. Backtest using historical Binance Futures data with fees, spreads, slippage, and realistic order fills.
3. Review win rate, average win/loss, maximum drawdown, missed fills, and performance by coin.
4. Run the same logic in Binance Futures testnet/paper mode.
5. Review every paper trade before considering a small, controlled live deployment.

No live trading should be enabled until the strategy logic and risk controls are verified through the preceding steps.
