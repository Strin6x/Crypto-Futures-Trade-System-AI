# Core Glossary

## Market and contract terms

**Spot:** Buying or selling the asset itself for immediate settlement.

**Futures/perpetual contract:** A derivative whose value follows an underlying asset. Crypto perpetuals usually have no expiry and use funding payments to help track spot price.

**Long:** A position that benefits when price rises.

**Short:** A position that benefits when price falls.

**Leverage:** Exposure divided by posted margin. Leverage magnifies both gains and losses; it does not improve the strategy’s edge.

**Margin:** Collateral supporting a leveraged position. Isolated margin limits collateral to a position; cross margin can expose more account equity.

**Liquidation:** Forced position closure when margin becomes insufficient. Liquidation price is not a safe substitute for a stop-loss.

**Funding rate:** Periodic payment between long and short perpetual holders. Its sign, timing, and size affect holding cost.

## Orders and execution

**Bid / ask:** Highest displayed buying price / lowest displayed selling price.

**Spread:** Ask minus bid. It is an immediate execution cost.

**Market order:** Executes immediately against available liquidity; price is not guaranteed.

**Limit order:** Executes only at the specified price or better; execution is not guaranteed.

**Stop order:** Activates after a trigger price is reached, commonly for entry or loss protection.

**Stop-loss:** An order or rule intended to cap loss. Fast moves, gaps, or thin liquidity can produce a worse fill.

**Take-profit:** An order or rule that closes some or all of a profitable position.

**Trailing stop:** A stop whose reference follows favorable price movement but does not move back when price reverses.

**Slippage:** Difference between expected and actual execution price.

**Maker / taker fee:** Fee for adding liquidity / removing liquidity.

**Reduce-only:** An instruction preventing an exit order from accidentally increasing or reversing a position.

## Price and structure

**Candlestick:** Open, high, low, and close for a fixed time interval. The body spans open to close; wicks show extremes.

**Timeframe:** Duration represented by one candle, such as 5 minutes or 4 hours.

**Swing high / low:** A local peak / trough defined using an explicit lookback rule.

**Uptrend:** A defined sequence commonly characterized by higher highs and higher lows.

**Downtrend:** A defined sequence commonly characterized by lower highs and lower lows.

**Range:** Price rotating between defined boundaries without an accepted directional trend.

**Support / resistance:** Areas where buying / selling has previously been strong enough to affect price. They are zones, not guaranteed barriers.

**Break of structure (BOS):** Price crossing a defined structural point in the trend direction.

**Change of character (CHoCH):** A proposed early structure shift against the previous trend. Its exact algorithm must be specified before automation.

**Liquidity:** Ability to trade size with limited price impact. Traders also use the term for clusters of resting orders near obvious levels.

**Volatility:** Magnitude or variability of price movement, not its direction.

## Indicators and measurements

**SMA:** Arithmetic mean of prices across a fixed number of periods.

**EMA:** Exponential moving average. It weights recent observations more heavily than an SMA and therefore responds faster, but still lags price.

**ATR:** Average True Range. A volatility measure based on recent price ranges; it does not predict direction.

**RSI:** Relative Strength Index. A bounded momentum oscillator comparing recent gains and losses. “Overbought” does not automatically mean price must fall.

**Volume:** Amount traded during a period. Definitions vary by exchange and contract.

**Open interest:** Total outstanding derivative contracts. It is not the same as volume.

## Risk and performance

**Position size:** Quantity of the asset or contracts held.

**Risk per trade:** Intended loss if the planned stop executes, including estimated costs.

**R-multiple:** Profit or loss divided by initial planned risk. A result of `+2R` earned twice the amount initially risked.

**Risk/reward ratio:** Planned downside relative to planned upside; it does not include probability.

**Win rate:** Winning trades divided by total closed trades.

**Expectancy:** Average outcome per trade: `(win probability × average win) − (loss probability × average loss)`, after costs.

**Drawdown:** Decline from an equity peak to a subsequent trough.

**Break-even stop:** Moving the protective stop near entry after favorable movement. Fees and slippage mean entry price may not be true financial break-even.

**Scalping / intraday / swing:** Very short holding periods / positions normally closed the same day / positions held across days or longer. The strategy must define exact time limits.

