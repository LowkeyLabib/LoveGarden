import {availablePondSpots, decorSlots, hidingPlaces, spots} from '../garden/world.ts';
import {growth} from '../lib/clock.mjs';
import {isActiveFlower} from '../lib/flowers.ts';
import type {GardenState} from '../lib/types';

export type WorldSprite = {key:string; name:string; x:number; y:number; depth:number};

export function worldObjects(state:GardenState, now:number):WorldSprite[] {
 const objects:WorldSprite[]=[];
 const occupied=new Map(state.seeds.filter(seed=>isActiveFlower(seed,now)).map(seed=>[seed.spot,seed]));
 for(const spot of [...spots,...availablePondSpots(state.decorations)]){
  const seed=occupied.get(spot.id);
  const water='pondSlot' in spot;
  const depth=water&&typeof spot.pondSlot==='number'?Math.max(spot.y,decorSlots[spot.pondSlot].y+1):spot.y;
  const progress=seed?growth(seed.watered_at,now,state.epoch):0;
  const stage=!seed?.watered_at?0:progress===1?3:progress<.33?1:2;
  objects.push({key:'bed-'+spot.id,name:seed?'flower-'+seed.flower_type+'-'+stage:water?'lily-spot':'marker',
   x:spot.x+(!seed&&!water?16:0),y:spot.y-(!seed&&!water?1:0),depth});
 }
 for(const d of state.decorations){
  const bay=decorSlots[d.slot];
  if(bay)objects.push({key:'decor-'+d.inventory_id,name:d.catalog_id,x:bay.x,y:bay.y,depth:bay.y});
 }
 for(const gift of state.gifts){
  const p=hidingPlaces[gift.location];
  if(p&&!gift.claimed_at)objects.push({key:'gift-'+gift.id,name:'gift-'+gift.kind,x:p.x,y:p.y,depth:p.y});
 }
 return objects;
}
