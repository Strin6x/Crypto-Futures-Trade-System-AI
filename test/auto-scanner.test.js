import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { AutoScanner, AUTO_SCAN_INTERVAL_MS, MIN_AUTO_SCAN_INTERVAL_MS, MAX_AUTO_SCAN_INTERVAL_MS, validateAutoScanInterval } from '../src/auto-scanner.js';
import { loadJson, saveJson } from '../src/config-store.js';

test('automatic scanning is off until explicitly enabled and schedules 15 minutes ahead', () => {
  let now=1_800_000_000_000; let callback; const scanner=new AutoScanner({run:async()=>({ok:true}),clock:()=>now,setTimer:fn=>(callback=fn,1),clearTimer:()=>{}});
  assert.equal(scanner.status().enabled,false);
  scanner.enable();
  assert.equal(Date.parse(scanner.status().nextScan)-now,AUTO_SCAN_INTERVAL_MS);
  assert.equal(typeof callback,'function');
});

test('due scans cannot overlap and reschedule from completion time', async () => {
  let now=1_800_000_000_000; let release; let calls=0;
  const scanner=new AutoScanner({run:async()=>{calls++;await new Promise(resolve=>release=resolve);return {summary:'done'}},intervalMs:5000,clock:()=>now,setTimer:()=>1,clearTimer:()=>{}});
  scanner.enable(); now+=5000;
  const first=scanner.tick(); const second=await scanner.tick();
  assert.equal(second.skipped,true); assert.equal(calls,1);
  now+=25; release(); await first;
  assert.equal(Date.parse(scanner.status().nextScan),now+5000);
});

test('disable clears the server timer cleanly', () => {
  let cleared=false; const scanner=new AutoScanner({run:async()=>{},setTimer:()=>7,clearTimer:id=>{cleared=id===7}});
  scanner.enable(); scanner.disable(); assert.equal(cleared,true); assert.equal(scanner.status().nextScan,null);
});

test('scan interval validation enforces the documented safe range', () => {
  assert.equal(validateAutoScanInterval(MIN_AUTO_SCAN_INTERVAL_MS),5000);
  assert.equal(validateAutoScanInterval(MAX_AUTO_SCAN_INTERVAL_MS),86400000);
  assert.throws(()=>validateAutoScanInterval(4999),/between 5 seconds and 24 hours/);
  assert.throws(()=>validateAutoScanInterval(86400001),/between 5 seconds and 24 hours/);
  assert.throws(()=>validateAutoScanInterval(5000.5),/whole number/);
});

test('changing an enabled interval persists status and immediately reschedules countdown', () => {
  let now=1_800_000_000_000; let persisted;
  const scanner=new AutoScanner({run:async()=>{},clock:()=>now,setTimer:()=>1,clearTimer:()=>{},onChange:value=>{persisted=value}});
  scanner.enable(); scanner.setIntervalMs(5000);
  assert.equal(scanner.status().intervalMs,5000);
  assert.equal(Date.parse(scanner.status().nextScan)-now,5000);
  assert.equal(persisted.intervalMs,5000);
});

test('rescheduling during a running scan still prevents overlap', async () => {
  let now=1_800_000_000_000; let release; let calls=0;
  const scanner=new AutoScanner({run:async()=>{calls++;await new Promise(resolve=>release=resolve)},intervalMs:5000,clock:()=>now,setTimer:()=>1,clearTimer:()=>{}});
  scanner.enable(); now+=5000; const running=scanner.tick(); scanner.setIntervalMs(60000);
  assert.equal((await scanner.tick()).skipped,true); assert.equal(calls,1);
  release(); await running;
  assert.equal(Date.parse(scanner.status().nextScan)-now,60000);
});

test('a selected interval survives the local automation JSON round trip', async () => {
  const directory=await mkdtemp(join(tmpdir(),'scan-interval-')); const path=join(directory,'automation.json');
  try {
    const scanner=new AutoScanner({run:async()=>{},setTimer:()=>1,clearTimer:()=>{}}); scanner.setIntervalMs(300000);
    await saveJson(path,{scanEnabled:scanner.enabled,intervalMs:scanner.intervalMs});
    const saved=await loadJson(path,{});
    const restored=new AutoScanner({run:async()=>{},intervalMs:saved.intervalMs,setTimer:()=>1,clearTimer:()=>{}});
    assert.equal(restored.status().intervalMs,300000);
    assert.equal(saved.scanEnabled,false);
  } finally { await rm(directory,{recursive:true,force:true}); }
});

test('an empty saved automation file safely falls back to defaults', async () => {
  const directory=await mkdtemp(join(tmpdir(),'scan-empty-')); const path=join(directory,'automation.json');
  try {
    await writeFile(path,'','utf8');
    assert.deepEqual(await loadJson(path,{scanEnabled:false}),{scanEnabled:false});
  } finally { await rm(directory,{recursive:true,force:true}); }
});
