import test from 'node:test'; import assert from 'node:assert/strict';
import { qualifyResistance } from '../src/market/binance-public.js';
test('daily resistance requires configured reaction count',()=>{const daily=[[0,0,110,0,0],[0,0,110.05,0,0],[0,0,90,0,0]];const r=qualifyResistance(daily,100,{resistanceToleranceBps:10,resistanceMinimumReactions:2});assert.equal(r.qualified,true);assert.equal(r.reactions,2)});
test('daily resistance remains blocked when threshold is blank',()=>{const r=qualifyResistance([[0,0,110,0,0],[0,0,90,0,0]],100,{resistanceToleranceBps:10,resistanceMinimumReactions:null});assert.equal(r.qualified,false)});
