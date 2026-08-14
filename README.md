# Gainer Reversal Control Room

Local-first version-one dashboard and trading-engine foundation for a short-only Binance USDⓈ-M gainer-reversal strategy.

## Safety boundary

- Paper mode is the default and only executable broker.
- Binance Futures Testnet has a server-side adapter and reconciliation contract, but order submission stays gated until signed integration and protective-order verification are implemented and tested.
- Live mode is rejected by configuration validation; production Binance endpoints are refused by tests.
- API credentials, when eventually configured, are read only from server environment variables and are never returned to the browser.

## Run locally

Requires Node.js 20 or newer. There are no third-party runtime dependencies.

```powershell
npm test
npm run check
npm start
```

Open `http://127.0.0.1:3002`. The Test System uses port 3002 by default so it can run beside the original app on port 3000 and the UI edition on port 3001. The app opens with editable paper-testing defaults; review them before starting a session. They are research-informed starting assumptions, not guaranteed-profitable settings.

## Guided paper workflow

1. Review the saved strategy controls and adjust them only before a paper-observation run.
2. Start the paper session from the checklist.
3. Click **Scan Binance now**. The server reads only unauthenticated public Futures tickers, contract metadata, order-book quotes, and candles.
4. Review the pass/fail chips on each of the five current gainers. A simulated short is opened only when every strategy check and portfolio-risk control passes.

You can separately enable **Automatic Binance scans**. They default to every 15 minutes, and the frequency can be changed or selected from presets in the dashboard. The setting is stored in `data/automation.json` and safely reschedules an enabled scanner without overlapping runs. The supported range is 5 seconds (a public-API stability safeguard) through 24 hours. This repeats the same public-data scan while the server is running, even when the paper session is stopped or no candidate qualifies. Automatic paper entries are a different, default-off control and require an active paper session; they only react to scheduled scan results.

No API key is needed for this phase. Testnet submission remains gated and live/production order endpoints remain prohibited.

See [THREE_DAY_MOMENTUM_EXHAUSTION.md](./THREE_DAY_MOMENTUM_EXHAUSTION.md) for the current paper profile and [gainer-reversal-short-strategy.md](./gainer-reversal-short-strategy.md) for the original specification.
