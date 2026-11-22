import test from 'node:test';
import assert from 'node:assert/strict';
import {CharacterDirector,WalkingMap} from '../src/garden/characters.ts';
import {decorSlots} from '../src/garden/world.ts';
const epoch=Date.parse('2026-01-01T00:00:00Z');
const garden=()=>({seeds:[],gifts:[],decorations:[],catalog:[],inventory:[],transactions:[],fashion:{variants:[],equipped:[]},balance:0,role:'GUEST',epoch,serverTime:epoch,angryMode:false,rainbowMode:false,noDataMode:false});
const run=(director,state,start,seconds)=>{const history=[];for(let t=0;t<=seconds;t+=.1)history.push(director.update(state,start+t*1000,.1));return history;};
test('walking routes avoid plots, water, scenery and placed decorations',()=>{
 const map=new WalkingMap([{inventory_id:'test',catalog_id:'cottage',slot:0}]);
 const path=map.path({u:5.5,v:6.5},{u:17,v:12.5});assert.ok(path?.length);
 assert.ok(path.every(p=>map.canWalk(p)));assert.equal(map.canWalk({u:3,v:11}),false);assert.equal(map.canWalk({u:7,v:6}),false);assert.equal(map.canWalk({u:7,v:14}),false);
 for(let i=1;i<path.length;i++)assert.ok(Math.abs(path[i].u-path[i-1].u)+Math.abs(path[i].v-path[i-1].v)<=.5001);
});
test('Labib follows Mehezad and both can still sit together',()=>{
 const state=garden(),before=JSON.stringify(state),history=run(new CharacterDirector(),state,epoch,120);
 const separation=([a,b])=>Math.hypot(a.x-b.x,a.y-b.y);
 assert.ok(history.some(pair=>pair.every(p=>p.pose==='walk')&&separation(pair)<35));
 const following=history.slice(280,750);
 assert.ok(following.filter(pair=>separation(pair)<38).length>following.length*.8);
 assert.ok(following.every(pair=>separation(pair)>=16));
 assert.ok(history.some(pair=>pair.every(p=>p.pose==='sit')));
 assert.ok(history.every(pair=>pair.every(p=>!p.gesture)));
 assert.equal(JSON.stringify(state),before);
});
test('successful plant and water transitions animate the right person without replaying old records',()=>{
 const state=garden(),director=new CharacterDirector();director.update(state,epoch,0);
 const seed={id:'seed',spot:6,flower_type:'rose',planted_at:new Date(epoch+1000).toISOString(),watered_at:null,opened_at:null};
 state.seeds=[seed];const planting=run(director,state,epoch+1000,20);assert.ok(planting.some(pair=>pair.some(p=>p.person==='labib'&&p.pose==='plant')));
 state.seeds=[{...seed,watered_at:new Date(epoch+22000).toISOString()}];const watering=run(director,state,epoch+22000,20);assert.ok(watering.some(pair=>pair.some(p=>p.person==='mehezad'&&p.pose==='water')));
 assert.ok(run(new CharacterDirector(),state,epoch+240000,10).every(pair=>pair.every(p=>p.pose!=='plant'&&p.pose!=='water')));
});
test('Angry Mode leaves only a sad Labib; Rainbow Mode restores both with hearts',()=>{
 const state=garden(),director=new CharacterDirector();state.angryMode=true;const storm=run(director,state,epoch,20);
 assert.ok(storm.every(pair=>pair.length===1&&pair[0].person==='labib'&&!pair[0].hearts));assert.equal(storm.at(-1)[0].pose,'sad');
 state.angryMode=false;state.rainbowMode=true;const pair=director.update(state,epoch+21000,.1);assert.equal(pair.length,2);assert.ok(pair.every(p=>p.hearts));
});
test('reduced motion uses stable poses and never smokes or runs walking animation',()=>{
 const state=garden(),director=new CharacterDirector();const first=director.update(state,epoch,0,true),later=director.update(state,epoch+110000,110,true);
 assert.deepEqual(first,later);assert.ok(later.every(p=>p.pose==='idle'&&p.frame===0));
});
test('a shared swing visit walks both characters to their seats without jumps',()=>{
 const state=garden();
 state.decorations=[{inventory_id:'swing',catalog_id:'garden-swing',slot:10}];
 const history=run(new CharacterDirector(),state,epoch+196_000,40);
 const seated=history.find(pair=>pair.every(p=>p.pose==='sit'));
 assert.ok(seated);
 assert.ok(seated.every(p=>Math.abs(p.x-decorSlots[10].x)<12&&Math.abs(p.y-decorSlots[10].y)<8));
 for(let i=1;i<history.length;i++)for(let n=0;n<2;n++){
  const a=history[i-1][n],b=history[i][n];
  assert.ok(Math.hypot(b.x-a.x,b.y-a.y)<3.5);
 }
});
test('characters use saved bench placement and cancel actions for removed flowers',()=>{
 const state=garden();state.decorations=[{inventory_id:'bench',catalog_id:'bench',slot:1}];
 const director=new CharacterDirector(),history=run(director,state,epoch+80000,30);
 const seated=history.find(pair=>pair.every(p=>p.pose==='sit'));assert.ok(seated);
 assert.equal(seated[0].x,decorSlots[1].x-14);assert.equal(seated[1].y,decorSlots[1].y+5);assert.equal(state.decorations[0].slot,1);
 const time=epoch+111000;state.seeds=[{id:'removed',spot:6,flower_type:'rose',planted_at:new Date(time).toISOString(),watered_at:null,opened_at:null}];director.update(state,time,.1);
 state.seeds=[{...state.seeds[0],removed_at:new Date(time+1000).toISOString()}];
 assert.ok(run(director,state,time+1000,10).every(pair=>pair.every(p=>p.pose!=='plant')));
});
test('viewers share rare smoking opportunities, both outcomes, and a close follow after the catch',()=>{
 const state=garden(),caretaker={...state,role:'CARETAKER'},before=JSON.stringify(state);
 const guest=new CharacterDirector(),member=new CharacterDirector();
 const starts=[],caught=[],closeAfterCatch=[];
 let previous,finishTime,afterThrow;
 for(let elapsed=0;elapsed<=920_000;elapsed+=80){
  const now=epoch+elapsed,pair=guest.update(state,now,.08);
  if(elapsed===254_000)caretaker.decorations=[];
  const local=member.update(caretaker,now,.08);
  const [labib,mehezad]=pair;
  assert.deepEqual(local,pair);
  const gap=Math.hypot(labib.x-mehezad.x,labib.y-mehezad.y);
  if(labib.gesture==='lookout'&&previous!=='lookout'){
   assert.ok(gap>=85);
   starts.push(elapsed);
  }
  if(previous==='smoking'&&!labib.gesture)finishTime=elapsed-starts.at(-1);
  if(mehezad.gesture&&mehezad.gesture!==caught.at(-1))caught.push(mehezad.gesture);
  if(previous==='smoking'&&labib.gesture==='surprised')assert.ok(gap<84);
  if(mehezad.gesture==='throw')afterThrow=elapsed;
  if(afterThrow&&elapsed>afterThrow+1500&&elapsed<afterThrow+30_000)closeAfterCatch.push(gap);
  previous=labib.gesture;
 }
 assert.equal(starts.length,2);
 assert.ok(starts[1]-starts[0]>=9*60_000&&starts[1]-starts[0]<=15*60_000);
 assert.ok(finishTime>=15_000&&finishTime<=20_000);
 assert.deepEqual(caught,['hurry','scold','bonk','snatch','throw']);
 assert.ok(closeAfterCatch.filter(gap=>gap>=16&&gap<27).length>closeAfterCatch.length*.7);
 assert.equal(JSON.stringify(state),before);
 const resumed=guest.update(state,epoch+2_000_000,0);
 assert.ok(resumed.every(p=>!p.gesture));
 const fresh=new CharacterDirector().update(state,epoch+starts[1]+3000,0);
 assert.ok(fresh.every(p=>!p.gesture));
});
