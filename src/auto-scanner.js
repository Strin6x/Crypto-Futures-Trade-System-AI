export const AUTO_SCAN_INTERVAL_MS = 15 * 60 * 1000;
export const MIN_AUTO_SCAN_INTERVAL_MS = 5 * 1000;
export const MAX_AUTO_SCAN_INTERVAL_MS = 24 * 60 * 60 * 1000;

export function validateAutoScanInterval(intervalMs) {
  const value = Number(intervalMs);
  if (!Number.isFinite(value) || !Number.isInteger(value)) throw new Error('Scan interval must be a whole number of milliseconds.');
  if (value < MIN_AUTO_SCAN_INTERVAL_MS || value > MAX_AUTO_SCAN_INTERVAL_MS) throw new Error('Scan interval must be between 5 seconds and 24 hours.');
  return value;
}

export class AutoScanner {
  constructor({ run, intervalMs = AUTO_SCAN_INTERVAL_MS, clock = () => Date.now(), setTimer = setInterval, clearTimer = clearInterval, onChange = () => {} }) {
    this.run = run;
    this.intervalMs = validateAutoScanInterval(intervalMs);
    this.clock = clock;
    this.setTimer = setTimer;
    this.clearTimer = clearTimer;
    this.onChange = onChange;
    this.enabled = false;
    this.running = false;
    this.timer = null;
    this.lastScan = null;
    this.nextScan = null;
    this.lastResult = null;
    this.lastError = null;
  }

  enable({ nextScan } = {}) {
    if (this.enabled) return this.status();
    this.enabled = true;
    const requested = nextScan ? Date.parse(nextScan) : NaN;
    this.nextScan = new Date(Number.isFinite(requested) && requested > this.clock() ? requested : this.clock() + this.intervalMs).toISOString();
    this.timer = this.setTimer(() => void this.tick().catch(() => {}), Math.min(1000, this.intervalMs));
    this.onChange(this.status());
    return this.status();
  }

  disable() {
    this.enabled = false;
    this.nextScan = null;
    if (this.timer) this.clearTimer(this.timer);
    this.timer = null;
    this.onChange(this.status());
    return this.status();
  }

  setIntervalMs(intervalMs) {
    this.intervalMs = validateAutoScanInterval(intervalMs);
    if (this.enabled) this.nextScan = new Date(this.clock() + this.intervalMs).toISOString();
    this.onChange(this.status());
    return this.status();
  }

  async tick() {
    if (!this.enabled || this.running || !this.nextScan || this.clock() < Date.parse(this.nextScan)) return { skipped: true };
    return this.execute();
  }

  async execute() {
    if (this.running) return { skipped: true, reason: 'A scan is already running.' };
    this.running = true;
    try {
      this.lastResult = await this.run();
      this.lastError = null;
      return this.lastResult;
    } catch (error) {
      this.lastError = error.message;
      throw error;
    } finally {
      this.lastScan = new Date(this.clock()).toISOString();
      this.nextScan = this.enabled ? new Date(this.clock() + this.intervalMs).toISOString() : null;
      this.running = false;
      await this.onChange(this.status());
    }
  }

  status() { return { enabled: this.enabled, running: this.running, intervalMs: this.intervalMs, intervalMinutes: this.intervalMs / 60000, minIntervalMs: MIN_AUTO_SCAN_INTERVAL_MS, maxIntervalMs: MAX_AUTO_SCAN_INTERVAL_MS, lastScan: this.lastScan, nextScan: this.nextScan, lastResult: this.lastResult, lastError: this.lastError }; }
  stop() { return this.disable(); }
  dispose() { if (this.timer) this.clearTimer(this.timer); this.timer=null; }
}
