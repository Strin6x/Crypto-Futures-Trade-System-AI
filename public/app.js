import { initializeDetailedSnapshot } from './dashboard-state.js';

const $ = s => document.querySelector(s);
let status;
let detailedSnapshot;
let detailedSnapshotRendered=false;
let countdownTimer;
let statusPollTimer;
let loadPromise;
let livePositions=[];
let livePositionsError='';
let positionPollTimer;
let criteriaDirty=false;
let criteriaDraft;
let liveOverviewRefreshPromise;
let aiReview;
const labels={paperStartingEquity:'Paper starting equity (USDT)',riskPerTradePct:'Risk / trade (%)',maxLeverage:'Maximum leverage',maxPositions:'Maximum positions',dailyLossHaltPct:'Daily loss halt (%)',consecutiveLossHalt:'Loss streak halt',minimumCandleAgeHours:'Start watching day 3 (h)',preferredCandleAgeHours:'Preferred day-3 check (h)',entryTimeoutSeconds:'Limit timeout (s)',maxSlippageBps:'Fallback slippage (bps)',stopBufferTicks:'Stop buffer (ticks)',minimum24hGainPct:'Minimum current 24h gain (%)',minimum24hQuoteVolume:'Optional minimum 24h volume (USDT)',maximumSpreadBps:'Maximum bid/ask spread (bps)',resistanceToleranceBps:'Daily resistance tolerance (bps)',resistanceMinimumReactions:'Minimum daily resistance reactions',rejectionMinimumWickBodyRatio:'Minimum rejection wick/body ratio',rejectionBelowResistanceBps:'Rejection may sit below resistance (bps)',rejectionAboveResistanceBps:'Rejection may exceed resistance (bps)',breakdownBufferBps:'Support-break buffer (bps)',entryFreshnessBps:'Maximum entry freshness (bps)',supportClearanceBufferBps:'TP1 support clearance (bps)'};

async function load(){
  if(loadPromise)return loadPromise;
  loadPromise=(async()=>{status=await api('/api/status');if(status.positions.some(position=>position.status==='OPEN'))await refreshLivePositions();else{livePositions=[];livePositionsError=''}detailedSnapshot=initializeDetailedSnapshot(detailedSnapshot,status);render()})();
  try{return await loadPromise}finally{loadPromise=null}
}
function render(){
  $('#mode').textContent=status.mode.toUpperCase();
  $('#session').textContent=status.paperSessionActive?'Stop paper session':'Start paper session';
  $('#automatic-scans').textContent=status.automaticScans.enabled?'Disable automatic Binance scans':'Enable automatic Binance scans';
  $('#automatic-scans').className=status.automaticScans.enabled?'danger':'secondary';
  $('#paper-automation').textContent=status.paperAutomation.enabled?'Disable automatic paper entries':'Enable automatic paper entries';
  $('#paper-automation').className=status.paperAutomation.enabled?'danger':'secondary';
  $('#paper-automation-status').innerHTML=row(status.paperAutomation.enabled,status.paperAutomation.enabled?(status.paperSessionActive?'Enabled · reacts only to scheduled scan results':'Enabled, waiting for an active paper session'):'Disabled · scheduled scans still run independently');
  renderAutomation();
  showInterval(status.automaticScans.intervalMs);
  $('#onboarding').innerHTML=status.onboarding.steps.map(s=>row(s.done,s.text)).join('')+(status.onboarding.missing.length?`<p class="muted">Fill the highlighted blank controls below. These values must come from your paper-testing decisions; the app will not guess them.</p>`:'<p class="muted">Three-day exhaustion profile is ready. Entry uses the first fresh 1m, 3m, 5m, or 15m bearish rejection at active resistance, with support below as the target.</p>');
  $('#scan-time').textContent=status.lastScan?`Updated ${new Date(status.lastScan).toLocaleTimeString()}`:'Not scanned';
  renderCriteria();
  $('#kill').textContent=status.killSwitch?'Release kill switch':'Engage kill switch'; $('#kill').classList.toggle('active',status.killSwitch);
  const remaining=Math.max(0,status.startOfDayEquity*.06+status.dailyRealizedPnl);
  $('#metrics').innerHTML=[['Equity',money(status.equity)],['Daily P&L',money(status.dailyRealizedPnl)],['Open risk',money(0)],['Loss allowance',money(remaining)],['Positions',`${status.positions.length} / ${status.config.maxPositions}`]].map(x=>`<div class="metric"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join('');
  renderActiveTrades(); syncPositionPolling();
  $('#risk').innerHTML=status.killSwitch?row(false,'New entries blocked'):row(true,'Risk limits clear')+row(true,`${status.consecutiveLosses} / ${status.config.consecutiveLossHalt} consecutive losses`)+row(true,'Live endpoints disabled');
  const r=status.reconciliation; $('#reconcile').innerHTML=row(r.ok,`${r.positionsChecked} positions checked`)+row(r.discrepancies.length===0,r.discrepancies[0]||'No discrepancies')+`<p class="muted">${new Date(r.checkedAt).toLocaleString()}</p>`;
  $('#live-candidates').innerHTML=status.candidates.length?liveOverview(status.candidates):candidateState(status.scanError);
  if(!detailedSnapshotRendered){$('#detailed-candidates').innerHTML=detailedSnapshot.candidates.length?candidateMatrix(detailedSnapshot.candidates,detailedSnapshot.criterionLabels):candidateState(detailedSnapshot.scanError);detailedSnapshotRendered=true}
  $('#positions').innerHTML=status.positions.length?table(status.positions):'No paper or testnet positions. The desk is flat.';
  $('#trades').innerHTML=status.trades.length?table(status.trades):'No completed trades yet. Every decision and fill will be recorded here.'; renderAiReview();
  $('#config').innerHTML=`<div class="field"><label>Paper strategy profile</label><input value="Three-Day Momentum Exhaustion" disabled><span class="muted">Frozen paper-research profile. It scans current gainers, watches the green third day near active resistance, and enters only on a fresh multi-timeframe bearish rejection.</span></div><div class="field"><label>Execution mode</label><select data-key="mode"><option>paper</option><option>testnet</option></select></div>`+Object.entries(labels).map(([key,label])=>`<div class="field"><label>${label}</label><input type="number" step="any" data-key="${key}" value="${status.config[key]??''}" placeholder="${key==='minimum24hQuoteVolume'?'Optional when guard is off':'Required before trading'}"></div>`).join('')+`<div class="field"><label><input type="checkbox" data-key="volumeGuardEnabled" ${status.config.volumeGuardEnabled?'checked':''}> Enable optional volume guard</label><span class="muted">Filters out thin markets where simulated fills may be unrealistic. It is separate from percentage gain.</span></div>`;
  $('[data-key=mode]').value=status.config.mode;
}
function renderCriteria(){
  if(criteriaDirty)return;
  criteriaDraft={...status.criteria.values};
  $('#criteria').innerHTML=Object.entries(status.criteria.labels).map(([key,label])=>`<div class="field"><label><input type="checkbox" data-criterion="${key}" ${criteriaDraft[key]?'checked':''}> ${label}</label></div>`).join('');
}
async function refreshLivePositions(){
  try { const data=await api('/api/positions/live');livePositions=data.positions;livePositionsError='';if(data.closed?.length)setTimeout(()=>void load(),0); }
  catch(error){livePositionsError=error.message;}
}
function syncPositionPolling(){
  const hasOpen=status?.positions.some(position=>position.status==='OPEN');
  if(hasOpen&&!positionPollTimer)positionPollTimer=setInterval(()=>void refreshLivePositions().then(renderActiveTrades),3000);
  if(!hasOpen&&positionPollTimer){clearInterval(positionPollTimer);positionPollTimer=null;}
}
function renderActiveTrades(){
  const host=$('#active-trades');if(!host)return;
  if(livePositionsError){host.innerHTML=`<div class="data-state error-state"><b>Live price unavailable</b><span>${escapeHtml(livePositionsError)}</span></div>`;return;}
  if(!livePositions.length){host.textContent='No active paper trades. A live execution card will appear here when a paper entry opens.';return;}
  host.innerHTML=`<div class="active-trade-grid">${livePositions.map(activeTradeCard).join('')}</div>`;
}
function activeTradeCard(position){
  if(position.liveError)return `<div class="trade-card"><strong>${escapeHtml(position.symbol)}</strong><p class="muted">${escapeHtml(position.liveError)}</p></div>`;
  const pnlClass=position.unrealizedPnl>=0?'profit':'loss';
  return `<article class="trade-card"><div class="trade-card-head"><div><span class="eyebrow">${escapeHtml(position.symbol)} · ${escapeHtml(position.side)}</span><h3>${position.state}</h3><span class="trade-time">Opened ${new Date(position.openedAt).toLocaleString()}</span></div><div class="pnl ${pnlClass}"><span>Unrealized P&amp;L</span><strong>${signedMoney(position.unrealizedPnl)}</strong><small>${signedNumber(position.unrealizedPnlPct,2)}% · ${signedNumber(position.rMultiple,2)}R</small></div></div><div class="trade-levels"><div><span>Entry</span><strong>${number(position.entry,8)}</strong></div><div><span>Live price</span><strong>${number(position.mark,8)}</strong></div><div><span>Stop</span><strong>${number(position.stop,8)}</strong></div><div><span>TP1 target</span><strong>${number(position.target,8)}</strong></div></div>${executionChart(position)}<div class="trade-actions"><button class="secondary" type="button" data-close-position="${escapeHtml(position.id)}">Close paper trade</button><span class="muted">Closes at the latest public mark price.</span></div><p class="muted live-note">Updates about every 3 seconds from public Binance Futures prices. Chart begins near the paper entry and shows one-minute closes.</p></article>`;
}
function executionChart(position){
  const candles=position.candles||[];const values=[position.entry,position.stop,position.target,position.mark,...candles.map(c=>c.close)].filter(Number.isFinite);
  if(values.length<2)return '<div class="chart-empty">Awaiting enough public price points for the chart.</div>';
  const min=Math.min(...values),max=Math.max(...values),range=Math.max(max-min,Number.EPSILON),width=620,height=148,pad=12;
  const points=candles.map((c,index)=>`${pad+(index/(Math.max(candles.length-1,1)))*(width-pad*2)},${height-pad-((c.close-min)/range)*(height-pad*2)}`).join(' ');
  const y=value=>height-pad-((value-min)/range)*(height-pad*2);
  return `<div class="execution-chart" role="img" aria-label="Live price chart for ${escapeHtml(position.symbol)}"><svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none"><line class="chart-line entry-line" x1="0" x2="${width}" y1="${y(position.entry)}" y2="${y(position.entry)}"/><line class="chart-line stop-line" x1="0" x2="${width}" y1="${y(position.stop)}" y2="${y(position.stop)}"/><line class="chart-line target-line" x1="0" x2="${width}" y1="${y(position.target)}" y2="${y(position.target)}"/><polyline class="price-line" points="${points}"/></svg><div class="chart-legend"><span><i class="entry-key"></i>Entry</span><span><i class="stop-key"></i>Stop</span><span><i class="target-key"></i>Target</span></div></div>`;
}
function renderAutomation(){const a=status.automaticScans;const last=a.lastScan?new Date(a.lastScan).toLocaleString():'Never';const next=a.nextScan?new Date(a.nextScan).toLocaleString():'Not scheduled';const seconds=a.nextScan?Math.max(0,Math.ceil((Date.parse(a.nextScan)-Date.now())/1000)):0;$('#automatic-scans-status').innerHTML=row(a.enabled,a.running?'Public Binance scan in progress':a.enabled?`Enabled · next scan in ${Math.floor(seconds/60)}m ${seconds%60}s`:'Disabled')+`<p class="muted">Last scheduled scan: ${last}<br>Next scheduled scan: ${next}</p>`;$('#automatic-scans-result').textContent=a.lastError?`Last scheduled scan failed: ${a.lastError}`:a.lastResult?.result?.scanSummary||a.lastResult?.scanSummary||'No scheduled scan result yet.';clearInterval(countdownTimer);if(a.enabled)countdownTimer=setInterval(()=>{if(status?.automaticScans?.enabled)renderAutomation()},1000)}
async function refreshLiveOverview(){
  if(liveOverviewRefreshPromise)return liveOverviewRefreshPromise;
  liveOverviewRefreshPromise=(async()=>{
    const next=await api('/api/status');
    status.candidates=next.candidates;status.lastScan=next.lastScan;status.scanError=next.scanError;status.automaticScans=next.automaticScans;
    $('#live-candidates').innerHTML=status.candidates.length?liveOverview(status.candidates):candidateState(status.scanError);
    $('#scan-time').textContent=status.lastScan?`Updated ${new Date(status.lastScan).toLocaleTimeString()}`:'Not scanned';
    renderAutomation();
  })();
  try{return await liveOverviewRefreshPromise}finally{liveOverviewRefreshPromise=null}
}
function syncStatusPolling(enabled){if(enabled&&!statusPollTimer)statusPollTimer=setInterval(()=>void refreshLiveOverview().catch(()=>{}),2000);if(!enabled&&statusPollTimer){clearInterval(statusPollTimer);statusPollTimer=null}}
function showInterval(ms){syncStatusPolling(status.automaticScans.enabled);const choices=[[3600000,'3600000'],[60000,'60000'],[1000,'1000']];const [unit]=choices.find(([factor])=>ms%factor===0)||choices[2];$('#scan-interval-value').value=ms/unit;$('#scan-interval-unit').value=String(unit)}
async function saveScanInterval(intervalMs){try{const updated=await api('/api/automatic-scans',{method:'POST',body:JSON.stringify({intervalMs})});status.automaticScans=updated;showInterval(updated.intervalMs);renderAutomation();$('#scan-interval-note').textContent='Scan frequency saved locally. The next scan has been rescheduled.'}catch(e){$('#scan-interval-note').textContent=e.message}}
function row(ok,text){return `<div class="status"><i class="dot ${ok?'':'bad'}"></i><span>${text}</span></div>`}
function renderAiReview(){const host=$('#ai-review-result');if(!host||!aiReview)return;const r=aiReview;host.innerHTML=`<b>${r.status==='ready_for_review'?'Ready for evidence review':'More paper data needed'}</b><span>${r.closedTrades} closed · ${r.wins} wins · ${r.losses} losses · ${r.winRatePct??'—'}% win rate</span><span>${r.recommendations.map(escapeHtml).join(' ')}</span>`;}
function candidateState(error){return error?`<div class="data-state error-state"><b>Scan data error</b><span>${escapeHtml(error)}</span></div>`:'<div class="data-state"><b>No scan results yet</b><span>Click “Scan Binance now” to retrieve the current five leading USDⓈ-M Futures gainers.</span></div>'}
function liveOverview(candidates){return `<div class="matrix-scroll"><table class="scan-matrix live-overview"><thead><tr><th class="sticky pair-col">Pair</th><th class="sticky decision-col">Decision</th><th>24h gain</th><th>Latest price</th><th>24h volume</th><th>Spread</th><th>Summary</th></tr></thead><tbody>${candidates.map(c=>`<tr>${overviewCells(c)}</tr>`).join('')}</tbody></table></div>`}
function candidateMatrix(candidates,criterionLabels){const keys=Object.keys(criterionLabels);return `<div class="matrix-toolbar"><span>Results use the criteria snapshot saved when this scan ran.</span><button id="toggle-matrix" class="secondary" type="button">Compact criteria</button></div><div class="matrix-scroll"><table class="scan-matrix"><thead><tr><th class="sticky pair-col">Pair</th><th class="sticky decision-col">Decision</th><th>24h gain</th><th>Latest price</th><th>24h volume</th><th>Spread</th><th>Summary</th>${keys.map(k=>`<th class="criterion-col" title="${escapeHtml(criterionLabels[k])}">${escapeHtml(criterionLabels[k])}</th>`).join('')}</tr></thead><tbody>${candidates.map(c=>matrixRow(c,keys)).join('')}</tbody></table></div>`}
function overviewCells(c){const s=c.checkSummary;return `<th scope="row" class="sticky pair-col">#${c.gainerRank} ${escapeHtml(c.symbol)}</th><td class="sticky decision-col"><span class="decision ${c.eligible?'pass':'fail'}">${c.eligible?'ELIGIBLE':'BLOCKED'}</span></td><td>${number(c.change24h,2)}%</td><td>${number(c.currentPrice,8)}</td><td>${compactNumber(c.quoteVolume)}</td><td>${number(c.spreadBps,2)} bps</td><td><span class="summary" aria-label="${s.pass} passed, ${s.fail} failed, ${s.excluded} excluded, ${s.error} errors">${s.pass}P · ${s.fail}F · ${s.excluded}X · ${s.error}E</span></td>`}
function matrixRow(c,keys){const byKey=Object.fromEntries(c.checks.map(x=>[x.key,x]));return '<tr>'+overviewCells(c)+keys.map(k=>statusCell(byKey[k],c.symbol)).join('')+'</tr>'}
function statusCell(item,symbol){if(!item)return `<td class="criterion-col"><span class="result error" aria-label="ERROR for ${escapeHtml(symbol)}">ERROR</span></td>`;return `<td class="criterion-col"><details class="result-detail"><summary class="result ${item.status.toLowerCase()}" title="${escapeHtml(item.reason)}" aria-label="${item.status}: ${escapeHtml(item.label)} for ${escapeHtml(symbol)}">${item.status}</summary><span>${escapeHtml(item.reason)}</span></details></td>`}
function number(value,digits){return Number.isFinite(value)?Number(value).toLocaleString(undefined,{maximumFractionDigits:digits}):'DATA ERROR'}
function compactNumber(value){return Number.isFinite(value)?new Intl.NumberFormat(undefined,{notation:'compact',maximumFractionDigits:2}).format(value):'DATA ERROR'}
function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function table(rows){const keys=Object.keys(rows[0]).slice(0,6);return `<table><thead><tr>${keys.map(k=>`<th>${k}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${keys.map(k=>`<td>${r[k]}</td>`).join('')}</tr>`).join('')}</tbody></table>`}
function money(v){return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(v)}
function signedMoney(value){return `${value>=0?'+':'-'}${money(Math.abs(value))}`}
function signedNumber(value,digits){return `${value>=0?'+':''}${number(value,digits)}`}
async function api(url,options){const res=await fetch(url,{headers:{'Content-Type':'application/json'},...options});const data=await res.json();if(!res.ok)throw new Error(data.errors?.join(' ')||data.error);return data}
$('#kill').onclick=async()=>{await api('/api/kill-switch',{method:'POST',body:JSON.stringify({active:!status.killSwitch})});load()};
$('#recheck').onclick=async()=>{await api('/api/reconcile',{method:'POST'});load()};
$('#session').onclick=async()=>{await api('/api/paper-session',{method:'POST',body:JSON.stringify({active:!status.paperSessionActive})});load()};
$('#automatic-scans').onclick=async()=>{try{await api('/api/automatic-scans',{method:'POST',body:JSON.stringify({enabled:!status.automaticScans.enabled})});await load()}catch(e){alert(e.message)}};
$('#save-scan-interval').onclick=()=>saveScanInterval(Number($('#scan-interval-value').value)*Number($('#scan-interval-unit').value));
document.querySelectorAll('.interval-preset').forEach(button=>button.onclick=()=>saveScanInterval(Number(button.dataset.ms)));
$('#paper-automation').onclick=async()=>{try{await api('/api/paper-entry-automation',{method:'POST',body:JSON.stringify({enabled:!status.paperAutomation.enabled})});await load()}catch(e){alert(e.message)}};
$('#scan').onclick=async()=>{const b=$('#scan');b.disabled=true;b.textContent='Scanning…';try{await api('/api/scan',{method:'POST'});await load()}catch(e){alert(e.message);await load()}finally{b.disabled=false;b.textContent='Scan Binance now'}};
$('#restore').onclick=async()=>{if(!confirm('Restore all recommended paper defaults?'))return;await api('/api/config/restore-defaults',{method:'POST'});await load();$('#config-note').textContent='Recommended paper defaults restored and saved on this device.'};
$('#criteria').addEventListener('change',event=>{if(!event.target.matches('[data-criterion]'))return;criteriaDirty=true;criteriaDraft={};document.querySelectorAll('[data-criterion]').forEach(el=>criteriaDraft[el.dataset.criterion]=el.checked);$('#criteria-note').textContent='Unsaved criteria changes. Click Save criteria to apply them to the next scan.';});
$('#save-criteria').onclick=async()=>{const values={...criteriaDraft};await api('/api/criteria',{method:'PUT',body:JSON.stringify(values)});criteriaDirty=false;await load();$('#criteria-note').textContent='Criteria saved locally and will be recorded with the next scan.'};
$('#select-all').onclick=async()=>{await api('/api/criteria/select-all',{method:'POST'});criteriaDirty=false;await load();$('#criteria-note').textContent='All strategy criteria selected.'};
$('#restore-criteria').onclick=async()=>{await api('/api/criteria/restore-defaults',{method:'POST'});criteriaDirty=false;await load();$('#criteria-note').textContent='Default criteria restored.'};
$('#save').onclick=async()=>{const next={...status.config};document.querySelectorAll('[data-key]').forEach(el=>next[el.dataset.key]=el.type==='number'?(el.value===''?null:Number(el.value)):el.type==='checkbox'?el.checked:el.value);try{await api('/api/config',{method:'PUT',body:JSON.stringify(next)});$('#config-note').textContent='Configuration saved on the server.';load()}catch(e){$('#config-note').textContent=e.message}};
load();
$('#run-ai-review').onclick=async()=>{const b=$('#run-ai-review');b.disabled=true;b.textContent='Reviewing…';try{aiReview=await api('/api/ai/review');renderAiReview()}catch(error){$('#ai-review-result').textContent=`AI review unavailable: ${error.message}`}finally{b.disabled=false;b.textContent='Run AI review'}};
document.addEventListener('click',async event=>{const closeButton=event.target.closest('[data-close-position]');if(closeButton){if(!confirm('Close this paper trade at the latest public market price?'))return;closeButton.disabled=true;closeButton.textContent='Closing…';try{await api(`/api/positions/${encodeURIComponent(closeButton.dataset.closePosition)}/close`,{method:'POST'});await load()}catch(error){alert(error.message);closeButton.disabled=false;closeButton.textContent='Close paper trade'}return;}if(event.target.id==='toggle-matrix'){const matrix=$('#detailed-candidates .scan-matrix');matrix?.classList.toggle('compact');event.target.textContent=matrix?.classList.contains('compact')?'Expand criteria':'Compact criteria';}});
