import test from 'node:test'; import assert from 'node:assert/strict'; import { assertSafeEndpoint, BinanceTestnetBroker } from '../src/execution/binance-testnet.js';
test('production Binance endpoint is refused',()=>assert.throws(()=>assertSafeEndpoint('https://fapi.binance.com/fapi/v1/order'),/Refusing/));
test('testnet placement remains gated',async()=>{const broker=new BinanceTestnetBroker({apiKey:'test',apiSecret:'test'});await assert.rejects(()=>broker.placeEntry({}),/intentionally gated/)});
