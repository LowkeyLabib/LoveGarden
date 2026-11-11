import test from 'node:test';
import assert from 'node:assert/strict';
import {CharacterDirector,WalkingMap} from '../src/garden/characters.ts';
import {decorSlots} from '../src/garden/world.ts';
const epoch=Date.parse('2026-01-01T00:00:00Z');
const garden=()=>({seeds:[],gifts:[],decorations:[],catalog:[],inventory:[],transactions:[],balance:0,role:'GUEST',epoch,serverTime:epoch,angryMode:false,rainbowMode:false});
const run=(director,state,start,seconds)=>{const history=[];for(let t=0;t<=seconds;t+=.1)history.push(director.update(state,start+t*1000,.1));return history;};
test('walking routes avoid plots, water, scenery and placed decorations',()=>{
 const map=new WalkingMap([{inventory_id:'test',catalog_id:'cottage',slot:0}]);
 const path=map.path({u:5.5,v:6.5},{u:17,v:12.5});assert.ok(path?.length);
 assert.ok(path.every(p=>map.canWalk(p)));assert.equal(map.canWalk({u:3,v:11}),false);assert.equal(map.canWalk({u:7,v:6}),false);assert.equal(map.canWalk({u:7,v:14}),false);
 for(let i=1;i<path.length;i++)assert.ok(Math.abs(path[i].u-path[i-1].u)+Math.abs(path[i].v-path[i-1].v)<=.5001);
});
test('idle routine includes roaming, walking together, sitting and occasional shared bench smoking',()=>{
 const state=garden(),before=JSON.stringify(state),history=run(new CharacterDirector(),state,epoch,120);
 assert.ok(history.some(pair=>pair.every(p=>p.pose==='walk')&&Math.hypot(pair[0].x-pair[1].x,pair[0].y-pair[1].y)<35));
 assert.ok(history.some(pair=>pair.every(p=>p.pose==='sit')));
 assert.ok(history.some(pair=>pair.some(p=>p.person==='labib'&&p.pose==='smoke')));
 for(const pair of history)if(pair.some(p=>p.pose==='smoke'))assert.ok(pair.some(p=>p.person==='mehezad'&&p.pose==='sit'));
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
test('characters use saved bench placement and cancel actions for removed flowers',()=>{
 const state=garden();state.decorations=[{inventory_id:'bench',catalog_id:'bench',slot:1}];
 const director=new CharacterDirector(),history=run(director,state,epoch+80000,30);
 const seated=history.find(pair=>pair.every(p=>p.pose==='sit'));assert.ok(seated);
 assert.equal(seated[0].x,decorSlots[1].x-14);assert.equal(seated[1].y,decorSlots[1].y+5);assert.equal(state.decorations[0].slot,1);
 const time=epoch+111000;state.seeds=[{id:'removed',spot:6,flower_type:'rose',planted_at:new Date(time).toISOString(),watered_at:null,opened_at:null}];director.update(state,time,.1);
 state.seeds=[{...state.seeds[0],removed_at:new Date(time+1000).toISOString()}];
 assert.ok(run(director,state,time+1000,10).every(pair=>pair.every(p=>p.pose!=='plant')));
});
