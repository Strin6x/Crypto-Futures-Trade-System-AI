import assert from 'node:assert/strict';
import test from 'node:test';
import { PaperBroker } from '../src/execution/paper-broker.js';
import { timeBasedPaperAction } from '../src/position-monitor.js';

function position(minutesOpen, timeExits = { tp1Done: false, tp2Done: false }) {
  return {
    id: 'paper-1',
    entry: 100,
    quantity: 3,
    originalQuantity: 3,
    openedAt: new Date(Date.now() - minutesOpen * 60_000).toISOString(),
    timeExits
  };
}

test('time-based exits close profitable paper shorts at five, fifteen, and sixty minutes in order', () => {
  assert.deepEqual(timeBasedPaperAction(position(5), 99), { type: 'TP1', fraction: 1 / 3 });
  assert.deepEqual(
    timeBasedPaperAction(position(15, { tp1Done: true, tp2Done: false }), 99),
    { type: 'TP2', fraction: 1 / 3, moveStopToTp1: true }
  );
  assert.deepEqual(
    timeBasedPaperAction(position(60, { tp1Done: true, tp2Done: true }), 99),
    { type: 'TP3', fraction: 1 }
  );
});

test('time-based exits do not close a paper short that is not in profit', () => {
  assert.equal(timeBasedPaperAction(position(60), 100), null);
  assert.equal(timeBasedPaperAction(position(60), 101), null);
});

test('paper broker tracks partial paper closes and the final cumulative result', async () => {
  const state = { positions: [] };
  const broker = new PaperBroker(state);
  const opened = await broker.placeEntry({ symbol: 'TESTUSDT', side: 'SHORT', entry: 100, stop: 105, target: 95, quantity: 3 });

  const first = await broker.closePartial(opened.id, 99, 1 / 3, 'TIME_TP1');
  const second = await broker.closePartial(opened.id, 98, 1 / 3, 'TIME_TP2');
  const final = await broker.closePosition(opened.id, 97, 'TIME_TP3');

  assert.equal(first.quantity, 1);
  assert.equal(second.quantity, 1);
  assert.equal(final.quantity, 1);
  assert.equal(final.realizedPnl, 6);
  assert.equal(state.positions.length, 0);
});
