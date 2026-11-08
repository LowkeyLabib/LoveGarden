import test from 'node:test';
import assert from 'node:assert/strict';
import {isActiveFlower,isCollectedFlower,departingFlowers,flowerExpiresAt} from '../src/lib/flowers.ts';
const claimed=Date.parse('2026-01-01T00:09:30Z');
const seed={id:'flower',spot:0,flower_type:'rose',planted_at:'2026-01-01T00:00:00Z',watered_at:'2026-01-01T00:01:00Z',opened_at:new Date(claimed).toISOString()};
test('expiration uses the claim plus two real minutes, including across nightfall and reloads',()=>{
 assert.equal(flowerExpiresAt(seed),claimed+120000);
 assert.equal(isActiveFlower(seed,claimed+119999),true);
 assert.equal(isActiveFlower(seed,claimed+120000),false);
 assert.equal(isActiveFlower(JSON.parse(JSON.stringify(seed)),claimed+86400000),false);
 assert.equal(isActiveFlower({...seed,opened_at:null},claimed+86400000),true);
 assert.equal(isCollectedFlower(seed),true);
});
test('manual removal immediately frees a spot and only claimed flowers count as collected',()=>{
 const removed={...seed,removed_at:new Date(claimed+1000).toISOString()};
 assert.equal(isActiveFlower(removed,claimed+1000),false);
 assert.equal(isCollectedFlower(removed),true);
 assert.equal(isCollectedFlower({...removed,opened_at:null}),false);
});
test('fade is only triggered for a previously visible plant, never expired flowers on first load',()=>{
 assert.deepEqual(departingFlowers(null,[seed],claimed+120000),[]);
 assert.deepEqual(departingFlowers([seed],[seed],claimed+119999),[]);
 assert.deepEqual(departingFlowers([seed],[seed],claimed+120000),[seed]);
 assert.deepEqual(departingFlowers([], [seed],claimed+120001),[]);
 assert.deepEqual(departingFlowers([seed],[{...seed,removed_at:new Date(claimed).toISOString()}],claimed),[seed]);
});
