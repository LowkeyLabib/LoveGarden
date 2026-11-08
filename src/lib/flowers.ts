import type {Seed} from './types';
export const FLOWER_LIFETIME_MS=120_000;
export const FLOWER_FADE_MS=2500;
export function flowerExpiresAt(seed:Seed){return seed.opened_at?Date.parse(seed.opened_at)+FLOWER_LIFETIME_MS:null;}
export function isActiveFlower(seed:Seed,now:number){const expiry=flowerExpiresAt(seed);return !seed.removed_at&&(expiry===null||now<expiry);}
export function isCollectedFlower(seed:Seed){return !!seed.opened_at;}
// A missing previous snapshot means first load or returning from a hidden tab: no replay.
export function departingFlowers(previous:Seed[]|null,current:Seed[],now:number){
 if(!previous)return [];
 const live=new Set(current.filter(seed=>isActiveFlower(seed,now)).map(seed=>seed.id));
 return previous.filter(seed=>!live.has(seed.id));
}
