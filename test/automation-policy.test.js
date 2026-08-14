import test from 'node:test';
import assert from 'node:assert/strict';
import { AutoScanner } from '../src/auto-scanner.js';
import { scheduledPaperEntryAllowed } from '../src/automation-policy.js';

test('scheduled public scans run with paper inactive and no eligible candidate', async () => {
  let scans=0; let now=1_800_000_000_000;
  const scanner=new AutoScanner({intervalMs:5000,clock:()=>now,setTimer:()=>1,clearTimer:()=>{},run:async()=>{scans++;return {candidates:[],scanSummary:'Scanned 0 current pair(s); 0 meet all active criteria.'}}});
  scanner.enable(); now+=5000; await scanner.tick();
  assert.equal(scans,1);
  assert.match(scanner.status().lastResult.scanSummary,/0 meet all active criteria/);
});

test('automatic paper entry requires separate opt-in and active paper session', () => {
  assert.equal(scheduledPaperEntryAllowed({enabled:false,paperSessionActive:true,mode:'paper',killSwitch:false}),false);
  assert.equal(scheduledPaperEntryAllowed({enabled:true,paperSessionActive:false,mode:'paper',killSwitch:false}),false);
  assert.equal(scheduledPaperEntryAllowed({enabled:true,paperSessionActive:true,mode:'paper',killSwitch:false}),true);
  assert.equal(scheduledPaperEntryAllowed({enabled:true,paperSessionActive:true,mode:'testnet',killSwitch:false}),false);
});

test('automatic scan UI exposes independent scan and paper-entry APIs', async () => {
  const { readFile }=await import('node:fs/promises');
  const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
  const app=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
  assert.match(html,/Save scan frequency/);
  assert.match(html,/5 seconds/);
  assert.match(html,/15 minutes/);
  assert.match(html,/1 hour/);
  assert.match(html,/Minimum 5 seconds for public API stability/);
  assert.match(html,/keeps scanning whether the paper session is running or any pair qualifies/);
  assert.match(app,/\/api\/automatic-scans/);
  assert.match(app,/renderAutomation\(\)/);
  assert.match(app,/setInterval\(\(\)=>void refreshLiveOverview\(\)\.catch\(\(\)=>\{\}\),2000\)/);
  assert.match(app,/if\(loadPromise\)return loadPromise/);
  assert.match(app,/\/api\/paper-entry-automation/);
});
