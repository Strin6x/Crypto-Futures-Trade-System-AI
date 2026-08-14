const TESTNET_HOST = 'https://demo-fapi.binance.com';

export class BinanceTestnetBroker {
  constructor({ apiKey, apiSecret }) {
    this.apiKey = apiKey; this.apiSecret = apiSecret;
    if (!apiKey || !apiSecret) throw new Error('Testnet credentials are missing from the server environment.');
  }
  async placeEntry() {
    throw new Error('Testnet order submission is intentionally gated until signed API integration and reconciliation are verified.');
  }
  async reconcile() {
    return { ok: false, mode: 'testnet', host: TESTNET_HOST, positionsChecked: 0, discrepancies: ['Signed account reconciliation is not configured. Trading remains blocked.'] };
  }
  async verifyProtection() { return false; }
}

export function assertSafeEndpoint(url) {
  const parsed = new URL(url);
  if (parsed.origin !== TESTNET_HOST) throw new Error('Refusing non-testnet Binance endpoint.');
  return true;
}
