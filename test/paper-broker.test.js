import test from 'node:test';
import assert from 'node:assert/strict';
import { PaperBroker } from '../src/execution/paper-broker.js';

test('a manual paper close uses the latest mark and removes only the open position', async () => {
  const state={positions:[]}; const broker=new PaperBroker(state);
  const opened=await broker.placeEntry({side:'SHORT',entry:100,stop:105,target:95,quantity:2});
  const closed=await broker.closePosition(opened.id,98);
  assert.equal(closed.status,'CLOSED');
  assert.equal(closed.closeReason,'MANUAL');
  assert.equal(closed.realizedPnl,4);
  assert.equal(state.positions.length,0);
});
