import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_CONFIG, validateConfig } from './config.js';
import { loadConfig, saveConfig, loadJson, saveJson } from './config-store.js';
import { DEFAULT_CRITERIA, CRITERIA_LABELS, mergeCriteria } from './criteria.js';
import { criterionResult, summarizeCriteria } from './scan-result.js';
import { state } from './state.js';
import { PaperBroker } from './execution/paper-broker.js';
import { BinancePublicMarket } from './market/binance-public.js';
import { evaluateCandidate, deriveTradePlan } from './strategy.js';
import { RiskEngine } from './risk-engine.js';
import { AutoScanner, AUTO_SCAN_INTERVAL_MS, validateAutoScanInterval } from './auto-scanner.js';
import { scheduledPaperEntryAllowed } from './automation-policy.js';
import { markPaperShort, protectivePaperExit } from './position-monitor.js';
import { openPaperPositions, activeAutomaticEntryKeys } from './paper-position-store.js';

const root = fileURLToPath(new URL('../public/', import.meta.url));
const configPath = fileURLToPath(new URL('../data/config.json', import.meta.url));
const criteriaPath = fileURLToPath(new URL('../data/criteria.json', import.meta.url));
const auditPath = fileURLToPath(new URL('../data/scan-audit.json', import.meta.url));
const automationPath = fileURLToPath(new URL('../data/automation.json', import.meta.url));
const positionsPath = fileURLToPath(new URL('../data/paper-positions.json', import.meta.url));
let automationSaveQueue=Promise.resolve();
let positionUpdatePromise;
let config = await loadConfig(configPath);
let criteria = mergeCriteria(await loadJson(criteriaPath, DEFAULT_CRITERIA));
state.scanAudit = await loadJson(auditPath, []);
state.positions = openPaperPositions(await loadJson(positionsPath, []));
resetPaperEquity(config.paperStartingEquity);
const savedAutomation = await loadJson(automationPath, { scanEnabled: false, paperEntryEnabled: false, nextScan: null, entryKeys: [] });
const paperAutomation = { enabled: savedAutomation.paperEntryEnabled === true };
state.automaticEntryKeys = activeAutomaticEntryKeys(state.positions);
const broker = new PaperBroker(state);
const market = new BinancePublicMarket();
state.reconciliation = { ...(await broker.reconcile()), checkedAt: new Date().toISOString() };
let savedScanIntervalMs=AUTO_SCAN_INTERVAL_MS;
try { if(savedAutomation.intervalMs != null) savedScanIntervalMs=validateAutoScanInterval(savedAutomation.intervalMs); } catch {}
const autoScanner = new AutoScanner({ run: () => runScan('scheduled'), intervalMs: savedScanIntervalMs, onChange: () => queueSaveAutomation() });
autoScanner.lastScan=savedAutomation.lastScan||null;
autoScanner.lastResult=state.scanAudit.find(run=>run.trigger==='scheduled')||null;
if (savedAutomation.scanEnabled === true) autoScanner.enable({ nextScan: savedAutomation.nextScan });

const server = http.createServer(async (req, res) => {
  try {
    if (req.url === '/api/status' && req.method === 'GET') return json(res, 200, publicStatus());
    if (req.url === '/api/positions/live' && req.method === 'GET') return json(res, 200, await livePositions());
    if (req.url === '/api/config' && req.method === 'GET') return json(res, 200, config);
    if (req.url === '/api/config' && req.method === 'PUT') {
      const result = validateConfig(await body(req));
      if (result.errors.length) return json(res, 400, { errors: result.errors });
      if(result.config.paperStartingEquity!==config.paperStartingEquity&&state.positions.length) return json(res,409,{error:'Close all paper trades before changing paper starting equity.'});
      if(result.config.paperStartingEquity!==config.paperStartingEquity) resetPaperEquity(result.config.paperStartingEquity);
      config = result.config; state.mode = config.mode; await saveConfig(configPath, config);
      return json(res, 200, config);
    }
    if (req.url === '/api/config/restore-defaults' && req.method === 'POST') {
      if(state.positions.length) return json(res,409,{error:'Close all paper trades before restoring paper defaults.'});
      config=structuredClone(DEFAULT_CONFIG); state.mode=config.mode; await saveConfig(configPath,config); return json(res,200,config);
    }
    if (req.url === '/api/criteria' && req.method === 'PUT') { criteria=mergeCriteria(await body(req)); await saveJson(criteriaPath,criteria); return json(res,200,criteria); }
    if ((req.url === '/api/criteria/select-all' || req.url === '/api/criteria/restore-defaults') && req.method === 'POST') { criteria=structuredClone(DEFAULT_CRITERIA); await saveJson(criteriaPath,criteria); return json(res,200,criteria); }
    if (req.url === '/api/paper-session' && req.method === 'POST') {
      const input=await body(req); if(config.mode!=='paper' && input.active===true) return json(res,409,{error:'Paper sessions require paper mode.'}); state.paperSessionActive=input.active===true; return json(res,200,{active:state.paperSessionActive});
    }
    if (req.url === '/api/scan' && req.method === 'POST') {
      if (state.killSwitch) return json(res,409,{error:'Release the kill switch before scanning.'});
      try { return json(res,200,await runScan('manual')); }
      catch(error) { return json(res,502,{error:`Public market scan failed: ${error.message}`}); }
    }
    if (req.url === '/api/automatic-scans' && req.method === 'POST') {
      const input=await body(req);
      if(input.intervalMs != null) {
        try { autoScanner.setIntervalMs(input.intervalMs); }
        catch(error) { return json(res,400,{error:error.message}); }
      }
      if(input.enabled===true) autoScanner.enable(); else if(input.enabled===false) autoScanner.disable();
      await queueSaveAutomation();
      return json(res,200,autoScanner.status());
    }
    if (req.url === '/api/paper-entry-automation' && req.method === 'POST') {
      const input=await body(req);
      if(input.enabled===true && config.mode!=='paper') return json(res,409,{error:'Automatic paper entry requires paper mode.'});
      paperAutomation.enabled=input.enabled===true; await queueSaveAutomation();
      return json(res,200,{...paperAutomation,requiresActivePaperSession:true,reactsTo:'scheduled scans'});
    }
    if (req.url === '/api/kill-switch' && req.method === 'POST') {
      const input = await body(req); state.killSwitch = input.active !== false;
      return json(res, 200, { active: state.killSwitch, newOrdersBlocked: state.killSwitch });
    }
    if (req.url === '/api/reconcile' && req.method === 'POST') {
      state.reconciliation = { ...(await broker.reconcile()), checkedAt: new Date().toISOString() };
      return json(res, 200, state.reconciliation);
    }
    const closeMatch=/^\/api\/positions\/([^/]+)\/close$/.exec(req.url||'');
    if (closeMatch && req.method === 'POST') {
      if(config.mode!=='paper') return json(res,409,{error:'Manual close is available only for paper positions.'});
      const position=state.positions.find(item=>item.id===decodeURIComponent(closeMatch[1])&&item.status==='OPEN');
      if(!position) return json(res,404,{error:'Open paper position not found.'});
      const live=await market.positionMark(position);
      const closed=await settlePaperPosition(position,live.markPrice,'MANUAL');
      return json(res,200,{closed});
    }
    if (req.url?.startsWith('/api/')) return json(res, 404, { error: 'Not found' });
    const requested = req.url === '/' ? 'index.html' : req.url.slice(1);
    if (requested.includes('..')) return json(res, 400, { error: 'Invalid path' });
    const file = await readFile(join(root, requested));
    res.writeHead(200, { 'Content-Type': mime(extname(requested)), 'X-Content-Type-Options': 'nosniff' }); res.end(file);
  } catch (error) {
    if (error.code === 'ENOENT') return json(res, 404, { error: 'Not found' });
    json(res, 500, { error: error.message });
  }
});

function publicStatus() {
  const required=['entryTimeoutSeconds','maxSlippageBps','stopBufferTicks','minimum24hGainPct','maximumSpreadBps','resistanceToleranceBps','resistanceMinimumReactions','rejectionMinimumWickBodyRatio','supportClearanceBufferBps','rejectionBelowResistanceBps','rejectionAboveResistanceBps','breakdownBufferBps','entryFreshnessBps'];
  if(config.volumeGuardEnabled) required.push('minimum24hQuoteVolume');
  const missing=required.filter(k=>config[k]==null);
  return { ...state, automaticScans:autoScanner.status(), paperAutomation:{...paperAutomation,requiresActivePaperSession:true,reactsTo:'scheduled scans'}, criteria:{values:criteria,labels:CRITERIA_LABELS}, onboarding:{ready:missing.length===0,missing,steps:[{done:true,text:'App is running in paper-only mode.'},{done:missing.length===0,text:missing.length?`Configure ${missing.length} required strategy controls.`:'Required controls are configured.'},{done:state.paperSessionActive,text:'Start the paper session (only needed for paper entries).'},{done:Boolean(state.lastScan),text:'Run a public Binance market scan.'}]}, liveTradingEnabled: false, credentialsPresent: false, config: { ...config } };
}
function resetPaperEquity(value){state.startOfDayEquity=Number(value);state.equity=Number(value);state.dailyRealizedPnl=0;state.unrealizedPnl=0;state.consecutiveLosses=0;}
async function livePositions(){
  if(positionUpdatePromise) return positionUpdatePromise;
  positionUpdatePromise=refreshLivePositions();
  try { return await positionUpdatePromise; } finally { positionUpdatePromise=null; }
}
async function refreshLivePositions(){
  const open=state.positions.filter(position=>position.status==='OPEN');
  const updates=await Promise.all(open.map(async position=>{
    try {
      const live=await market.positionMark(position);
      return {position,live,marked:markPaperShort(position,live.markPrice)};
    } catch(error) {
      return {position,liveError:`Live price unavailable: ${error.message}`};
    }
  }));
  const positions=[]; const closed=[];
  for(const update of updates){
    if(update.liveError){ positions.push({...update.position,liveError:update.liveError,updatedAt:new Date().toISOString()}); continue; }
    const protection=protectivePaperExit(update.marked);
    if(protection){ closed.push(await settlePaperPosition(update.position,protection.price,protection.reason,{persist:false})); continue; }
    positions.push({...update.position,...update.marked,candles:update.live.candles,chartStartsAt:update.live.chartStartsAt,updatedAt:new Date().toISOString()});
  }
  if(closed.length) await saveJson(positionsPath,state.positions);
  state.unrealizedPnl=positions.reduce((total,position)=>total+(Number(position.unrealizedPnl)||0),0);
  return {positions,closed,updatedAt:new Date().toISOString()};
}
async function settlePaperPosition(position, markPrice, closeReason, {persist=true}={}){
  const closed=await broker.closePosition(position.id,markPrice,closeReason);
  state.equity+=closed.realizedPnl; state.dailyRealizedPnl+=closed.realizedPnl;
  state.consecutiveLosses=closed.realizedPnl<0?state.consecutiveLosses+1:0;
  const details={
    MANUAL:['PAPER MANUAL CLOSE','Operator closed the paper position.'],
    STOP_LOSS:['PAPER STOP-LOSS','Paper stop-loss was triggered automatically.'],
    TAKE_PROFIT:['PAPER TAKE-PROFIT','Paper target was reached automatically.']
  }[closeReason]||['PAPER CLOSE','Paper position closed.'];
  state.trades.unshift({time:closed.closedAt,symbol:closed.symbol,event:details[0],price:closed.mark,realizedPnl:closed.realizedPnl,reason:details[1]});
  if(persist) await saveJson(positionsPath,state.positions);
  return closed;
}
function decorate(candidate,cfg,criteriaSnapshot){
  const entry=candidate.entryPrice||candidate.currentPrice;
  const target=Number(candidate.support);
  candidate.oneRRealistic=Boolean(target>0 && target<entry*(1-(cfg.supportClearanceBufferBps??0)/10000));
  const evaluation=evaluateCandidate(candidate,cfg,criteriaSnapshot);
  const checks=Object.entries(evaluation.checks).map(([key,pass])=>criterionResult(candidate,{key,label:CRITERIA_LABELS[key],pass,enabled:criteriaSnapshot[key]}));
  const checkSummary=summarizeCriteria(checks);
  return {...candidate,eligible:evaluation.eligible&&!checkSummary.error,checks,checkSummary,criteriaSnapshot,activeCriteria:evaluation.appliedChecks,disabledCriteria:evaluation.excludedChecks,missingConfiguration:evaluation.missingConfiguration};
}
async function runScan(trigger){
  if(state.scanInProgress) return recordAndSaveBlockedRun(trigger,'A scan is already running.');
  state.scanInProgress=true;
  try {
  if(state.killSwitch) return recordAndSaveBlockedRun(trigger,'Emergency kill switch is active.');
  const startedAt=new Date().toISOString(); const applied=structuredClone(criteria);
  try {
    const raw=await market.scan(config); state.candidates=raw.map(candidate=>decorate(candidate,config,applied)); state.lastScan=new Date().toISOString(); state.scanError=null;
    const scheduledEntry=trigger==='scheduled' && scheduledPaperEntryAllowed({enabled:paperAutomation.enabled,paperSessionActive:state.paperSessionActive,mode:config.mode,killSwitch:state.killSwitch});
    const manualEntry=trigger==='manual' && state.paperSessionActive && config.mode==='paper';
    const entries=(scheduledEntry||manualEntry) ? await simulateEligible(trigger) : [];
    const candidateOutcomes=state.candidates.map(c=>{const entry=entries.find(e=>e.symbol===c.symbol);const {checks,checkSummary,criteriaSnapshot,...conditions}=c;const noEntryReason=trigger==='scheduled'&&!paperAutomation.enabled?'Automatic paper entry is off.':trigger==='scheduled'&&!state.paperSessionActive?'Paper session is stopped.':'Paper session is inactive.';return {symbol:c.symbol,eligible:c.eligible,action:entry?.opened?'opened':entry?.reason||(c.eligible?noEntryReason:'One or more selected criteria failed.'),conditions,summary:checkSummary,checks};});
    const eligibleCount=state.candidates.filter(c=>c.eligible).length;
    const scanSummary=`Scanned ${state.candidates.length} current pair(s); ${eligibleCount} meet all active criteria.`;
    const entrySummary=entries.some(e=>e.opened)?`${entries.filter(e=>e.opened).length} paper trade(s) opened.`:(trigger==='scheduled'&&!paperAutomation.enabled?'Automatic paper entry is off.':trigger==='scheduled'&&!state.paperSessionActive?'Paper session is stopped; no paper entry attempted.':'No paper trade opened.');
    const result={trigger,startedAt,scannedAt:state.lastScan,criteriaSnapshot:applied,activeCriteria:Object.keys(applied).filter(k=>applied[k]),disabledCriteria:Object.keys(applied).filter(k=>!applied[k]),candidateOutcomes,entries,scanSummary,entrySummary,summary:`${scanSummary} ${entrySummary}`};
    state.scanAudit.unshift(result); state.scanAudit=state.scanAudit.slice(0,20); await saveJson(auditPath,state.scanAudit); if(trigger==='scheduled') await queueSaveAutomation();
    return {candidates:state.candidates,lastScan:state.lastScan,result};
  } catch(error) { state.scanError=error.message; recordBlockedRun(trigger,`Public market scan failed: ${error.message}`,startedAt,applied); await saveJson(auditPath,state.scanAudit); throw error; }
  } finally { state.scanInProgress=false; }
}
function recordBlockedRun(trigger,reason,startedAt=new Date().toISOString(),criteriaSnapshot=structuredClone(criteria)){const scannedAt=new Date().toISOString();state.lastScan=scannedAt;const result={trigger,startedAt,scannedAt,criteriaSnapshot,candidateOutcomes:[],entries:[],summary:`No trade: ${reason}`};state.scanAudit.unshift(result);state.scanAudit=state.scanAudit.slice(0,20);return {candidates:[],lastScan:scannedAt,result};}
async function recordAndSaveBlockedRun(...args){const result=recordBlockedRun(...args);await saveJson(auditPath,state.scanAudit);return result;}
async function simulateEligible(trigger){const outcomes=[];for(const c of state.candidates.filter(x=>x.eligible)){const candleId=String(Math.floor(Date.now()/259200000));const key=`${c.symbol}:${candleId}`;if(state.positions.some(p=>p.symbol===c.symbol)){outcomes.push({symbol:c.symbol,opened:false,candleId,trigger,reason:'An open position already exists for this pair.'});continue;}if(trigger==='scheduled'&&state.automaticEntryKeys.includes(key)){outcomes.push({symbol:c.symbol,opened:false,candleId,trigger,reason:'Automatic entry already opened for this pair in the current 3-day candle.'});continue;}const risk=new RiskEngine(config,state).assess({symbol:c.symbol,candleId});if(!risk.allowed){outcomes.push({symbol:c.symbol,opened:false,candleId,trigger,reason:risk.reasons.join(' ')});continue;}const plan=deriveTradePlan({equity:state.equity,entry:c.entryPrice||c.currentPrice,dailyResistanceWick:c.resistance,rejectionWick:c.rejectionWick,tickSize:c.tickSize,nearbySupport:c.support},config);if(!plan.accepted){outcomes.push({symbol:c.symbol,opened:false,candleId,trigger,reason:plan.reason||'Trade plan rejected.'});continue;}const p=await broker.placeEntry({...plan,symbol:c.symbol,entryTimeframe:c.entryTimeframe,autoEntryKey:trigger==='scheduled'?key:null});if(trigger==='scheduled')state.automaticEntryKeys.push(key);await saveJson(positionsPath,state.positions);state.trades.push({time:p.openedAt,symbol:c.symbol,event:'PAPER ENTRY',trigger,timeframe:c.entryTimeframe,price:p.entry,stop:p.stop,target:p.target,tp1:p.exitPlan?.tp1});outcomes.push({symbol:c.symbol,opened:true,candleId,trigger,positionId:p.id,reason:`Simulated ${c.entryTimeframe} paper trade opened.`});}return outcomes;}
async function saveAutomation(){await saveJson(automationPath,{scanEnabled:autoScanner.enabled,paperEntryEnabled:paperAutomation.enabled,intervalMs:autoScanner.intervalMs,nextScan:autoScanner.nextScan,lastScan:autoScanner.lastScan,entryKeys:state.automaticEntryKeys});}
function queueSaveAutomation(){automationSaveQueue=automationSaveQueue.catch(()=>{}).then(()=>saveAutomation());return automationSaveQueue;}
async function body(req) { const chunks=[]; for await (const c of req) chunks.push(c); return JSON.parse(Buffer.concat(chunks).toString() || '{}'); }
function json(res, status, data) { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)); }
function mime(ext) { return ({ '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'text/javascript; charset=utf-8' })[ext] || 'application/octet-stream'; }

// The original app uses 3000 and the UI edition uses 3001. Keep this Test
// System separate on 3002 by default.
const port = Number(process.env.PORT || 3002);
server.listen(port, '127.0.0.1', () => console.log(`Control room: http://127.0.0.1:${port} (paper mode; live disabled)`));
const protectionMonitor=setInterval(()=>void livePositions().catch(()=>{}),3000);
function shutdown(){autoScanner.dispose();clearInterval(protectionMonitor);server.close();}
process.once('SIGINT',shutdown); process.once('SIGTERM',shutdown);
