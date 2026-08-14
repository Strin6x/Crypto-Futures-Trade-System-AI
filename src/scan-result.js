const REQUIRED_DATA={gainThreshold:['change24h'],liquid:['quoteVolume'],spreadOk:['spreadBps'],green3d:['currentPrice','threeDayOpen'],mature3d:['candleAgeHours'],upperRange:['rangePosition'],resistanceQualified:['resistanceQualified'],retests:['failedRetests'],bearishRejection:['bearishRejection'],momentum3m:['momentum3m'],momentum5m:['momentum5m'],oneRRealistic:['oneRRealistic']};
export function criterionResult(candidate,{key,label,pass,enabled}){
  if(!enabled)return {key,label,status:'EXCLUDED',reason:'Excluded by the saved strategy profile for this scan.'};
  const missing=(REQUIRED_DATA[key]||[]).filter(field=>candidate[field]===null||candidate[field]===undefined||(typeof candidate[field]==='number'&&!Number.isFinite(candidate[field])));
  if(missing.length)return {key,label,status:'ERROR',reason:`Market data unavailable: ${missing.join(', ')}.`};
  return {key,label,status:pass?'PASS':'FAIL',reason:pass?'Criterion satisfied.':`${label} was not satisfied.`};
}
export function summarizeCriteria(results){return results.reduce((out,item)=>(out[item.status.toLowerCase()]++,out),{pass:0,fail:0,excluded:0,error:0});}
