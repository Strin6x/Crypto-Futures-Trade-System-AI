import test from 'node:test';
import assert from 'node:assert/strict';
import { openPaperPositions, activeAutomaticEntryKeys } from '../src/paper-position-store.js';

test('only open persisted paper positions restore after a restart', () => {
  const restored=openPaperPositions([{id:'open',status:'OPEN'},{id:'closed',status:'CLOSED'},null]);
  assert.deepEqual(restored,[{id:'open',status:'OPEN'}]);
});

test('automatic-entry locks come only from real restored open positions', () => {
  assert.deepEqual(activeAutomaticEntryKeys([{status:'OPEN',autoEntryKey:'AVNTUSDT:123'},{status:'OPEN',autoEntryKey:'AVNTUSDT:123'}]),['AVNTUSDT:123']);
});
