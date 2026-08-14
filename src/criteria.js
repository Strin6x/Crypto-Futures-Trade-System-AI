export const CRITERIA_LABELS=Object.freeze({
  topFiveGainer:'Top-five Futures gainer', gainThreshold:'Currently up over 24 hours', usdMPerpetual:'Active USDT perpetual', liquid:'Optional liquidity guard', spreadOk:'Maximum bid/ask spread', green3d:'Green active 3-day candle', mature3d:'Day-three monitoring window', upperRange:'Price inside 70-90% of 3-day range', resistanceQualified:'Active 3-day resistance', retests:'Confirmed lower-timeframe resistance interaction', bearishRejection:'Multi-timeframe resistance rejection', momentum3m:'3m momentum context (review only)', momentum5m:'5m momentum context (review only)', oneRRealistic:'Clear path to first structural target'
});
export const DEFAULT_CRITERIA=Object.freeze({...Object.fromEntries(Object.keys(CRITERIA_LABELS).map(key=>[key,true])),momentum3m:false,momentum5m:false});
export function mergeCriteria(saved={}){return Object.fromEntries(Object.keys(DEFAULT_CRITERIA).map(key=>[key,saved[key]!==false]));}
