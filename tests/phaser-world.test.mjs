import test from 'node:test';
import assert from 'node:assert/strict';
import {worldObjects} from '../src/migration/worldObjects.ts';
import {spots,decorSlots,availablePondSpots,hidingPlaces} from '../src/garden/world.ts';
import {EPOCH} from '../src/lib/clock.mjs';

test('Phaser uses saved slots, existing growth and pond occlusion',()=>{
 const slot=decorSlots.findIndex(b=>b.capacity>=2);
 const decorations=[{inventory_id:'pond',catalog_id:'koi-pond',slot}];
 const lily=availablePondSpots(decorations).find(p=>p.pondSlot===slot);
 const state={decorations,seeds:[{id:'lily',spot:lily.id,flower_type:'moon-lily',watered_at:new Date(EPOCH).toISOString()}],
  gifts:[{id:'box',kind:'box',location:0}],epoch:EPOCH};
 const view=worldObjects(state,EPOCH+301000);
 const flower=view.find(p=>p.name==='flower-moon-lily-3');
 assert.equal(flower.x,lily.x);assert.equal(flower.y,lily.y);assert.ok(flower.depth>decorSlots[slot].y);
 assert.equal(view.filter(p=>p.name==='marker').length,spots.length);
 assert.equal(view.find(p=>p.key==='gift-box').x,hidingPlaces[0].x);
 assert.ok(!worldObjects({...state,decorations:[]},EPOCH).some(p=>p.key===flower.key));
});
