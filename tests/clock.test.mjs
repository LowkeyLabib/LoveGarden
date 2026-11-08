import test from 'node:test';
import assert from 'node:assert/strict';
import { EPOCH, daylightTotal, growth, clockState } from '../src/lib/clock.mjs';
const iso = milliseconds => new Date(EPOCH+milliseconds).toISOString();
test('daylight growth pauses at sunset and resumes next sunrise',()=>{
 assert.equal(growth(null,EPOCH),0);
 assert.equal(growth(iso(0),EPOCH+299_000),299/300);
 assert.equal(growth(iso(0),EPOCH+300_000),1);
 assert.equal(growth(iso(540_000),EPOCH+600_000),.2);
 assert.equal(growth(iso(540_000),EPOCH+1_199_999),.2);
 assert.equal(growth(iso(540_000),EPOCH+1_440_000),1);
 assert.equal(growth(iso(700_000),EPOCH+1_200_000),0);
 assert.equal(growth(iso(700_000),EPOCH+1_500_000),1);
 assert.equal(growth(iso(0),EPOCH+20*1_200_000),1);
 assert.equal(growth(iso(100_000),EPOCH),0);
 assert.equal(daylightTotal(EPOCH-1),0);
 assert.equal(daylightTotal(EPOCH-900_000),-300_000);
});
test('the shared game clock has exact ten-minute phases',()=>{
 assert.equal(clockState(EPOCH).day,true);
 assert.equal(clockState(EPOCH).seconds,600);
 assert.equal(clockState(EPOCH+599_999).day,true);
 assert.equal(clockState(EPOCH+600_000).day,false);
 assert.equal(clockState(EPOCH+1_200_000).day,true);
 assert.equal(clockState(EPOCH+1_199_000).seconds,1);
});
