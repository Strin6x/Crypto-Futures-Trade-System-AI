import test from 'node:test';
import assert from 'node:assert/strict';
import { initializeDetailedSnapshot } from '../public/dashboard-state.js';

test('detailed scan snapshot is cloned from the first dashboard status only', () => {
  const first={candidates:[{symbol:'FIRSTUSDT'}],criteria:{labels:{gain:'Gain'}},lastScan:'first',scanError:null};
  const snapshot=initializeDetailedSnapshot(undefined,first);
  first.candidates[0].symbol='MUTATED';
  const polled={candidates:[{symbol:'LIVEUSDT'}],criteria:{labels:{gain:'Changed'}},lastScan:'second',scanError:'new error'};
  assert.strictEqual(initializeDetailedSnapshot(snapshot,polled),snapshot);
  assert.deepEqual(snapshot,{candidates:[{symbol:'FIRSTUSDT'}],criterionLabels:{gain:'Gain'},lastScan:'first',scanError:null});
});

test('dashboard provides separate live and reload-only candidate tables', async () => {
  const {readFile}=await import('node:fs/promises');
  const [html,app]=await Promise.all([readFile(new URL('../public/index.html',import.meta.url),'utf8'),readFile(new URL('../public/app.js',import.meta.url),'utf8')]);
  assert.match(html,/Live overview <span>Updates automatically<\/span>/);
  assert.match(html,/Detailed scan snapshot <span>Updates when you reload the page<\/span>/);
  assert.match(app,/\$\('#live-candidates'\)\.innerHTML=/);
  assert.match(app,/if\(!detailedSnapshotRendered\)/);
  assert.match(app,/function liveOverview\(candidates\).*?<th>Summary<\/th><\/tr>/s);
});

test('automatic refresh does not overwrite an unsaved criteria draft', async () => {
  const {readFile}=await import('node:fs/promises');
  const app=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
  assert.match(app,/let criteriaDirty=false/);
  assert.match(app,/function renderCriteria\(\)\{\s*if\(criteriaDirty\)return/);
  assert.match(app,/Unsaved criteria changes\. Click Save criteria/);
});

test('automatic refresh updates only the live overview rather than rerendering the dashboard', async () => {
  const {readFile}=await import('node:fs/promises');
  const app=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
  assert.match(app,/async function refreshLiveOverview\(\)/);
  assert.match(app,/\$\('#live-candidates'\)\.innerHTML=/);
  assert.match(app,/setInterval\(\(\)=>void refreshLiveOverview\(\)/);
  assert.doesNotMatch(app,/setInterval\(\(\)=>void load\(\)\.catch/);
});
