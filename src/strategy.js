export function evaluateCandidate(candidate, config, criteria = {}) {
  const checks = {
    topFiveGainer: candidate.gainerRank <= 5,
    gainThreshold: config.minimum24hGainPct != null && candidate.change24h >= config.minimum24hGainPct,
    usdMPerpetual: candidate.contractType === 'PERPETUAL' && candidate.quoteAsset === 'USDT',
    liquid: !config.volumeGuardEnabled || (config.minimum24hQuoteVolume != null && candidate.quoteVolume >= config.minimum24hQuoteVolume),
    spreadOk: config.maximumSpreadBps != null && candidate.spreadBps <= config.maximumSpreadBps,
    green3d: candidate.currentPrice > candidate.threeDayOpen,
    mature3d: candidate.candleAgeHours >= config.minimumCandleAgeHours,
    upperRange: candidate.rangePosition >= config.rangePositionMin && candidate.rangePosition <= config.rangePositionMax,
    resistanceQualified: candidate.resistanceQualified === true,
    retests: candidate.failedRetests >= config.failedRetestsMin && candidate.failedRetests <= config.failedRetestsMax,
    bearishRejection: candidate.bearishRejection === true && candidate.entryFresh !== false,
    momentum3m: candidate.momentum3m === 'bearish',
    momentum5m: candidate.momentum5m === 'bearish',
    oneRRealistic: candidate.oneRRealistic === true
  };
  const missingConfiguration = [];
  const configCriteria={minimum24hGainPct:'gainThreshold',maximumSpreadBps:'spreadOk',resistanceToleranceBps:'resistanceQualified',resistanceMinimumReactions:'resistanceQualified',rejectionMinimumWickBodyRatio:'bearishRejection',supportClearanceBufferBps:'oneRRealistic'};
  for (const [key,criterion] of Object.entries(configCriteria)) {
    if (criteria[criterion]!==false && config[key] == null) missingConfiguration.push(key);
  }
  if (criteria.liquid!==false && config.volumeGuardEnabled && config.minimum24hQuoteVolume == null) missingConfiguration.push('minimum24hQuoteVolume');
  const appliedChecks=Object.fromEntries(Object.entries(checks).filter(([key])=>criteria[key]!==false));
  const excludedChecks=Object.keys(checks).filter(key=>criteria[key]===false);
  return { eligible:Object.values(appliedChecks).every(Boolean)&&missingConfiguration.length===0,checks,appliedChecks,excludedChecks,missingConfiguration };
}

export function deriveTradePlan({ equity, entry, dailyResistanceWick, rejectionWick, tickSize, nearbySupport }, config) {
  if ([config.stopBufferTicks, config.maxSlippageBps, config.entryTimeoutSeconds].some(v => v == null)) {
    return { accepted: false, reason: 'Execution thresholds require operator configuration.' };
  }
  const stop = roundUp(Math.max(dailyResistanceWick, rejectionWick) + config.stopBufferTicks * tickSize, tickSize);
  const riskPerUnit = stop - entry;
  if (!(riskPerUnit > 0)) return { accepted: false, reason: 'Stop must be above short entry.' };
  const cashRisk = equity * (config.riskPerTradePct / 100);
  const quantity = cashRisk / riskPerUnit;
  const target = Number(nearbySupport);
  const minimumTargetDistance = (config.supportClearanceBufferBps ?? 0) / 10_000;
  if (!(target > 0 && target < entry * (1 - minimumTargetDistance))) return { accepted: false, reason: 'First structural support is too close to use as a paper target.' };
  return { accepted: true, side: 'SHORT', entry, stop, target, quantity, cashRisk, leverageCap: config.maxLeverage, exitPlan: { tp1: target, tp2: null, tp3: null, note: 'The first confirmed support is the paper target. TP2 and TP3 require later structural levels and partial-close handling.' } };
}

function roundUp(value, step) { return Math.ceil((value - Number.EPSILON) / step) * step; }
