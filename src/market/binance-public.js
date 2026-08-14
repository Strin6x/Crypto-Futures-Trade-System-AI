import { findFirstMultiTimeframeEntry } from './multi-timeframe-entry.js';

const HOST = 'https://fapi.binance.com';

export class BinancePublicMarket {
  constructor(fetcher = fetch) { this.fetcher = fetcher; }
  async scan(config) {
    const [tickers, exchange, books] = await Promise.all([
      this.get('/fapi/v1/ticker/24hr'), this.get('/fapi/v1/exchangeInfo'), this.get('/fapi/v1/ticker/bookTicker')
    ]);
    const symbols = new Map(exchange.symbols.filter(s => s.status === 'TRADING' && s.contractType === 'PERPETUAL' && s.quoteAsset === 'USDT').map(s => [s.symbol, s]));
    const bookMap = new Map(books.map(b => [b.symbol, b]));
    const top = tickers.filter(t => symbols.has(t.symbol) && Number(t.lastPrice) > 0).sort((a,b) => Number(b.priceChangePercent)-Number(a.priceChangePercent)).slice(0,5);
    return Promise.all(top.map((ticker, i) => this.enrich(ticker, symbols.get(ticker.symbol), bookMap.get(ticker.symbol), i + 1, config)));
  }
  async enrich(t, info, book, rank, config) {
    const [threeDay, daily, m15, m5, m3, m1] = await Promise.all([
      this.get('/fapi/v1/klines',{symbol:t.symbol,interval:'3d',limit:2}), this.get('/fapi/v1/klines',{symbol:t.symbol,interval:'1d',limit:500}),
      this.get('/fapi/v1/klines',{symbol:t.symbol,interval:'15m',limit:300}), this.get('/fapi/v1/klines',{symbol:t.symbol,interval:'5m',limit:80}), this.get('/fapi/v1/klines',{symbol:t.symbol,interval:'3m',limit:80}), this.get('/fapi/v1/klines',{symbol:t.symbol,interval:'1m',limit:80})
    ]);
    const candle=threeDay.at(-1), price=Number(t.lastPrice), low=Number(candle[3]), high=Number(candle[2]);
    const resistance=qualifyActiveRunResistance(m15, Number(candle[0]), config);
    const structure=lowerTimeframe(m15, resistance.level, config);
    const entry=findFirstMultiTimeframeEntry({barsByTimeframe:{'1m':m1,'3m':m3,'5m':m5,'15m':m15},resistance:resistance.level,currentPrice:price,config});
    const bid=Number(book?.bidPrice||price), ask=Number(book?.askPrice||price);
    return {
      symbol:t.symbol,gainerRank:rank,change24h:Number(t.priceChangePercent),currentPrice:price,quoteVolume:Number(t.quoteVolume),
      contractType:info.contractType,quoteAsset:info.quoteAsset,spreadBps:((ask-bid)/price)*10000,
      threeDayOpen:Number(candle[1]),threeDayHigh:high,threeDayLow:low,candleAgeHours:(Date.now()-Number(candle[0]))/36e5,rangePosition:high===low?0:(price-low)/(high-low),
      resistance:resistance.level,resistanceReactions:resistance.reactions,resistanceQualified:resistance.qualified,
      ...structure,failedRetests:entry.found?2:structure.failedRetests,bearishRejection:entry.found,support:entry.found?entry.support:structure.support,rejectionWick:entry.found?entry.rejectionWick:structure.rejectionWick,entryTimeframe:entry.found?entry.timeframe:null,entryPrice:entry.found?entry.entryPrice:null,entryFresh:entry.found?entry.entryFresh:false,entryReason:entry.reason||null,momentum3m:momentum(m3),momentum5m:momentum(m5),tickSize:Number(info.filters.find(f=>f.filterType==='PRICE_FILTER')?.tickSize||0),scannedAt:new Date().toISOString()
    };
  }
  async positionMark(position) {
    const openedAt=Date.parse(position.openedAt);
    const startTime=Math.max(Date.now()-24*60*60*1000,openedAt-60_000);
    const [ticker,candles]=await Promise.all([
      this.get('/fapi/v1/ticker/price',{symbol:position.symbol}),
      this.get('/fapi/v1/klines',{symbol:position.symbol,interval:'1m',startTime,limit:1440})
    ]);
    return { markPrice:Number(ticker.price), candles:candles.map(c=>({time:Number(c[6]),close:Number(c[4])})), chartStartsAt:new Date(startTime).toISOString() };
  }
  async get(path, params={}) { const url=new URL(path,HOST); Object.entries(params).forEach(([k,v])=>url.searchParams.set(k,v)); const res=await this.fetcher(url,{signal:AbortSignal.timeout(12000)}); if(!res.ok) throw new Error(`Binance public data returned ${res.status}`); return res.json(); }
}

export function qualifyResistance(daily, price, config) {
  const tolerance=(config.resistanceToleranceBps??0)/10000;
  const highs=daily.slice(0,-1).map(k=>Number(k[2])).filter(h=>h>=price*(1-tolerance));
  if(!highs.length) return {level:null,reactions:0,qualified:false};
  const level=Math.min(...highs), reactions=highs.filter(h=>Math.abs(h-level)/level<=tolerance).length;
  return {level,reactions,qualified:config.resistanceMinimumReactions!=null && reactions>=config.resistanceMinimumReactions};
}
export function qualifyActiveRunResistance(bars, runStart, config) {
  const closed=bars.slice(0,-1).filter(bar=>Number(bar[0])>=runStart);
  if (!closed.length) return {level:null,reactions:0,qualified:false};
  const level=Math.max(...closed.map(bar=>Number(bar[2]))), tolerance=(config.resistanceToleranceBps??0)/10000;
  const reactions=closed.filter(bar=>Math.abs(Number(bar[2])-level)/level<=tolerance).length;
  return {level,reactions,qualified:config.resistanceMinimumReactions!=null && reactions>=config.resistanceMinimumReactions};
}
function lowerTimeframe(ks, resistance, config) {
  const closed=ks.slice(0,-1), recent=closed.slice(-12), tol=(config.resistanceToleranceBps??0)/10000;
  const tests=resistance?recent.filter(k=>Math.abs(Number(k[2])-resistance)/resistance<=tol):[];
  const rejection=recent.at(-1), body=Math.abs(Number(rejection[4])-Number(rejection[1])), wick=Number(rejection[2])-Math.max(Number(rejection[1]),Number(rejection[4]));
  const bearishRejection=Boolean(resistance && Number(rejection[4])<Number(rejection[1]) && Number(rejection[4])<=resistance && config.rejectionMinimumWickBodyRatio!=null && wick/Math.max(body,Number.EPSILON)>=config.rejectionMinimumWickBodyRatio);
  const prior=recent.slice(0,-1), swingLow=Math.min(...prior.slice(-6).map(k=>Number(k[3]))), currentClose=Number(rejection[4]);
  return {failedRetests:tests.length,bearishRejection,rejectionWick:Number(rejection[2]),support:swingLow,supportBroken:currentClose<swingLow,oneRRealistic:false};
}
function momentum(ks){const a=Number(ks.at(-2)[4]),b=Number(ks.at(-1)[4]);return b<a?'bearish':'not-bearish'}
