export const DEFAULT_CONFIG = Object.freeze({
  strategyProfile: "three_day_momentum_exhaustion",
  mode: "paper",
  liveTradingEnabled: false,
  paperStartingEquity: 10000,
  riskPerTradePct: 1,
  maxLeverage: 10,
  maxPositions: 3,
  dailyLossHaltPct: 6,
  consecutiveLossHalt: 3,
  minimumCandleAgeHours: 48,
  preferredCandleAgeHours: 60,
  rangePositionMin: 0.7,
  rangePositionMax: 0.9,
  failedRetestsMin: 2,
  failedRetestsMax: 3,
  historyDays: 730,
  entryTimeoutSeconds: 45,
  maxSlippageBps: 10,
  stopBufferTicks: 2,
  minimum24hGainPct: 20,
  volumeGuardEnabled: false,
  minimum24hQuoteVolume: 10000000,
  maximumSpreadBps: 15,
  resistanceToleranceBps: 35,
  resistanceMinimumReactions: 3,
  rejectionMinimumWickBodyRatio: 0.5,
  supportClearanceBufferBps: 0,
  rejectionBelowResistanceBps: 75,
  rejectionAboveResistanceBps: 50,
  breakdownBufferBps: 10,
  entryFreshnessBps: 20,
  momentum: { minimum3mReturnPct: null, minimum5mReturnPct: null }
});

export function validateConfig(input) {
  const config = { ...DEFAULT_CONFIG, ...input, momentum: { ...DEFAULT_CONFIG.momentum, ...input.momentum } };
  const errors = [];
  if (!['paper', 'testnet'].includes(config.mode)) errors.push('Mode must be paper or testnet.');
  if (config.strategyProfile !== 'three_day_momentum_exhaustion') errors.push('Only the paper-only three-day momentum exhaustion profile is available in this UI app.');
  if (config.liveTradingEnabled !== false) errors.push('Live trading is permanently disabled in version one.');
  if (!(config.paperStartingEquity >= 10 && config.paperStartingEquity <= 1000000)) errors.push('Paper starting equity must be between $10 and $1,000,000.');
  if (config.riskPerTradePct <= 0 || config.riskPerTradePct > 2) errors.push('Risk per trade must be between 0 and 2%.');
  if (config.maxLeverage <= 0 || config.maxLeverage > 10) errors.push('Leverage must be between 1x and 10x.');
  if (config.maxPositions < 1 || config.maxPositions > 3) errors.push('Maximum positions must be between 1 and 3.');
  if (config.dailyLossHaltPct <= 0 || config.dailyLossHaltPct > 6) errors.push('Daily loss halt cannot exceed 6%.');
  if (config.consecutiveLossHalt > 3) errors.push('Consecutive-loss halt cannot exceed 3 losses.');
  if (config.minimum24hGainPct < 0) errors.push('Minimum 24h gain must be zero or greater.');
  if (config.minimumCandleAgeHours < 48 || config.minimumCandleAgeHours > 72) errors.push('Day-three monitoring must start between 48 and 72 hours.');
  if (config.rangePositionMin < .5 || config.rangePositionMin >= config.rangePositionMax) errors.push('Three-day range zone must be valid.');
  if (config.rejectionBelowResistanceBps < 0 || config.rejectionAboveResistanceBps < 0 || config.breakdownBufferBps < 0 || config.entryFreshnessBps < 0) errors.push('Multi-timeframe entry buffers must be zero or greater.');
  if (config.volumeGuardEnabled && (!(config.minimum24hQuoteVolume > 0))) errors.push('Enter a positive minimum 24h volume or disable the optional volume guard.');
  return { config, errors };
}

export function mergeSavedConfig(saved = {}) {
  return validateConfig({ ...structuredClone(DEFAULT_CONFIG), ...saved }).config;
}
