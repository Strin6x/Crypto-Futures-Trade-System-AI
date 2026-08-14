import test from 'node:test';
import assert from 'node:assert/strict';
import { markPaperShort, protectivePaperExit } from '../src/position-monitor.js';

test('paper short mark shows profit when price falls below entry', () => {
  const result=markPaperShort({entry:100,quantity:2,stop:105,target:95},98);
  assert.equal(result.unrealizedPnl,4);
  assert.equal(result.unrealizedPnlPct,2);
  assert.equal(result.rMultiple,.4);
  assert.equal(result.state,'IN PROFIT');
});

test('paper short mark warns when its protective stop is reached', () => {
  const result=markPaperShort({entry:100,quantity:1,stop:105,target:95},105);
  assert.equal(result.unrealizedPnl,-5);
  assert.equal(result.state,'STOP AT RISK');
});

test('paper protection closes a short at its configured stop or target', () => {
  const stop=protectivePaperExit(markPaperShort({entry:100,quantity:1,stop:105,target:95},106));
  const target=protectivePaperExit(markPaperShort({entry:100,quantity:1,stop:105,target:95},94));
  assert.deepEqual(stop,{price:105,reason:'STOP_LOSS'});
  assert.deepEqual(target,{price:95,reason:'TAKE_PROFIT'});
});
