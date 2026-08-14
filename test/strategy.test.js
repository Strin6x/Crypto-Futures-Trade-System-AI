import test from 'node:test'; import assert from 'node:assert/strict';
import { DEFAULT_CONFIG, validateConfig } from '../src/config.js';
import { deriveTradePlan, evaluateCandidate } from '../src/strategy.js';

test('recommended defaults fully configure an otherwise valid paper candidate',()=>{
  const result=evaluateCandidate({gainerRank:1,change24h:90,contractType:'PERPETUAL',quoteAsset:'USDT',quoteVolume:1e9,spreadBps:1,currentPrice:9,threeDayOpen:8,candleAgeHours:60,rangePosition:.8,resistanceQualified:true,failedRetests:2,bearishRejection:true,supportBroken:true,momentum3m:'bearish',momentum5m:'bearish',oneRRealistic:true},DEFAULT_CONFIG);
  assert.equal(result.eligible,true); assert.deepEqual(result.missingConfiguration,[]);
});
test('trade sizing uses no more than configured equity risk and uses first support as the paper target',()=>{
  const config={...DEFAULT_CONFIG,entryTimeoutSeconds:30,maxSlippageBps:5,stopBufferTicks:2};
  const plan=deriveTradePlan({equity:1000,entry:10,dailyResistanceWick:10.3,rejectionWick:10.2,tickSize:.01,nearbySupport:9},config);
  assert.equal(plan.accepted,true); assert.equal(plan.stop,10.32); assert.equal(plan.cashRisk,10); assert.equal(plan.target,9); assert.equal(plan.exitPlan.tp1,9);
});
test('live mode and excessive limits are rejected',()=>{const {errors}=validateConfig({...DEFAULT_CONFIG,mode:'live',liveTradingEnabled:true,maxLeverage:20});assert.ok(errors.length>=3)});
test('current 24h gain threshold is independently enforced from optional volume guard',()=>{
  const candidate={gainerRank:1,change24h:49,contractType:'PERPETUAL',quoteAsset:'USDT',quoteVolume:1e9,spreadBps:1,currentPrice:9,threeDayOpen:8,candleAgeHours:60,rangePosition:.8,resistanceQualified:true,failedRetests:2,bearishRejection:true,supportBroken:true,momentum3m:'bearish',momentum5m:'bearish',oneRRealistic:true};
  const config={...DEFAULT_CONFIG,maximumSpreadBps:10,resistanceToleranceBps:10,resistanceMinimumReactions:3,rejectionMinimumWickBodyRatio:1.5,supportClearanceBufferBps:10};
  let result=evaluateCandidate(candidate,config); assert.equal(result.checks.gainThreshold,true); assert.equal(result.checks.liquid,true);
  result=evaluateCandidate({...candidate,change24h:19},config); assert.equal(result.checks.gainThreshold,false); assert.equal(result.checks.liquid,true);
});
test('enabled volume guard is a distinct liquidity check',()=>{
  const base={gainerRank:1,change24h:90,contractType:'PERPETUAL',quoteAsset:'USDT',quoteVolume:50,spreadBps:1,currentPrice:9,threeDayOpen:8,candleAgeHours:60,rangePosition:.8,resistanceQualified:true,failedRetests:2,bearishRejection:true,supportBroken:true,momentum3m:'bearish',momentum5m:'bearish',oneRRealistic:true};
  const result=evaluateCandidate(base,{...DEFAULT_CONFIG,volumeGuardEnabled:true,minimum24hQuoteVolume:100}); assert.equal(result.checks.gainThreshold,true); assert.equal(result.checks.liquid,false);
});
