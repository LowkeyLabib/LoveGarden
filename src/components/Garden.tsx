import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, ReactNode } from 'react';
import type { GardenState, Seed, Gift } from '../lib/types';
import { growth, clockState } from '../lib/clock.mjs';
import {isActiveFlower,departingFlowers,FLOWER_FADE_MS} from '../lib/flowers';
import { Icon } from './Art';
import StormScene from './StormScene';
import { PixelSprite } from '../garden/PixelSprite';
import {useCharacters} from '../garden/useCharacters';
import {CharacterSprite} from '../garden/CharacterSprite';
import {DecorationLights,PondLife} from '../garden/DecorationDetails';
import {connectGardenCamera} from '../garden/camera';
import { iso, spots, hidingPlaces, decorSlots, scenery, gardenBounds } from '../garden/world';
export { spots, hidingPlaces, decorSlots } from '../garden/world';

type Props={state:GardenState;now:number;onSpot:(n:number)=>void;onSeed:(s:Seed)=>void;onGift:(g:Gift)=>void;onPlace:(slot:number)=>void;placing:string|null};
type Effect={id:string;x:number;y:number;kind:'water'|'bloom'|'gift'};
const diamond='0,-15 29,0 0,15 -29,0';
const cameraHintKey='lovegarden.camera-hint-dismissed';
export default function Garden({state,now,onSpot,onSeed,onGift,onPlace,placing}:Props){
 const characters=useCharacters(state,now);
 const wardrobes=useMemo(()=>{
  const variants=new Map((state.fashion?.variants??[]).map(item=>[`${item.catalog_id}:${item.character}:${item.slot}`,item.sprite_ref]));
  const equipped=new Map((state.fashion?.equipped??[]).map(item=>[`${item.character}:${item.slot}`,item.catalog_id]));
  const layers=(character:'LABIB'|'MEHEZAD')=>['outfit','headwear','accessory'].flatMap(slot=>{
   const catalogId=equipped.get(`${character}:${slot}`);
   const sprite=catalogId&&variants.get(`${catalogId}:${character}:${slot}`);
   return sprite?[sprite]:[];
  });
  const result={labib:layers('LABIB'),mehezad:layers('MEHEZAD')};
  return result;
 },[state.fashion]);
 const ref=useRef<SVGSVGElement>(null);
 const camera=useRef<ReturnType<typeof connectGardenCamera>>(null);
 const [showCameraHint,setShowCameraHint]=useState(()=>{
  try{return localStorage.getItem(cameraHintKey)!=='1';}catch{return true;}
 });
 useLayoutEffect(()=>{
  const controls=connectGardenCamera(ref.current!,()=>{
   setShowCameraHint(false);
   try{localStorage.setItem(cameraHintKey,'1');}catch{/* Storage may be unavailable. */}
  });
  camera.current=controls;
  return ()=>{controls.dispose();camera.current=null;};
 },[]);
 const visiblePlants=useRef<Seed[]|null>(null);
 const [departures,setDepartures]=useState<{seed:Seed;stage:number;until:number}[]>([]);
 const [awake,setAwake]=useState(document.visibilityState==='visible');
 useEffect(()=>{const visibility=()=>{visiblePlants.current=null;setDepartures([]);setAwake(document.visibilityState==='visible');};document.addEventListener('visibilitychange',visibility);return()=>document.removeEventListener('visibilitychange',visibility);},[]);
 useEffect(()=>{
  if(!awake||state.angryMode){visiblePlants.current=null;return;}
  const leaving=departingFlowers(visiblePlants.current,state.seeds,now);
  visiblePlants.current=state.seeds.filter(seed=>isActiveFlower(seed,now));
  if(leaving.length&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches)setDepartures(old=>[...old,...leaving.map(seed=>({seed,stage:!seed.watered_at?0:growth(seed.watered_at,now,state.epoch)===1?3:growth(seed.watered_at,now,state.epoch)<.33?1:2,until:performance.now()+FLOWER_FADE_MS}))]);
 },[state.seeds,state.epoch,state.angryMode,now,awake]);
 useEffect(()=>{if(!departures.length)return;const timer=window.setTimeout(()=>setDepartures(old=>old.filter(item=>item.until>performance.now())),Math.max(0,Math.min(...departures.map(item=>item.until))-performance.now()));return()=>window.clearTimeout(timer);},[departures]);
 const [effects,setEffects]=useState<Effect[]>([]);
 const previous=useRef<Map<string,{watered:boolean;bloom:boolean;claimed:boolean}>|null>(null);
 const cycle=clockState(now,state.epoch);
 const lighting=state.rainbowMode?0:cycle.night;
 const placingItem=state.inventory.find(item=>item.id===placing);
 const placingSize=state.catalog.find(item=>item.id===placingItem?.catalog_id)?.placement_size??0;
 const occupiedBays=new Set(state.decorations.filter(d=>d.inventory_id!==placing).map(d=>d.slot));
 // Feedback observes public state transitions; rewards and growth remain authoritative.
 useEffect(()=>{
  const next=new Map<string,{watered:boolean;bloom:boolean;claimed:boolean}>(), additions:Effect[]=[];
  for(const seed of state.seeds.filter(seed=>isActiveFlower(seed,now))){const value={watered:!!seed.watered_at,bloom:growth(seed.watered_at,now,state.epoch)===1,claimed:false};next.set(seed.id,value);const old=previous.current?.get(seed.id),p=spots[seed.spot];if(old&&p){if(!old.watered&&value.watered)additions.push({...p,id:seed.id,kind:'water'});else if(!old.bloom&&value.bloom)additions.push({...p,id:seed.id,kind:'bloom'});}}
  for(const gift of state.gifts){const value={watered:false,bloom:false,claimed:!!gift.claimed_at};next.set(gift.id,value);const old=previous.current?.get(gift.id),p=hidingPlaces[gift.location];if(old&&!old.claimed&&value.claimed&&p)additions.push({id:gift.id,...p,kind:'gift'});}
  previous.current=next;if(additions.length)setEffects(e=>[...e,...additions]);
 },[state.seeds,state.gifts,state.epoch,now]);
 useEffect(()=>{if(!effects.length)return;const timeout=window.setTimeout(()=>setEffects([]),1500);return()=>window.clearTimeout(timeout);},[effects]);
 const objectProps=(label:string,action:()=>void)=>({role:'button',tabIndex:0,'aria-label':label,className:'world-object',onClick:action,onKeyDown:(e:KeyboardEvent)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();action();}}});
 const objects:{key:string;y:number;x:number;node:ReactNode}[]=scenery.map((s,i)=>({key:`scene-${i}`,x:s.x,y:s.y,node:<g className={s.name==='butterfly-small'?'garden-butterfly':undefined} style={{animationDelay:`${-i*.37}s`}}><PixelSprite {...s}/></g>}));
 for(const spot of spots){const seed=state.seeds.find(s=>s.spot===spot.id&&isActiveFlower(s,now));const value=seed?growth(seed.watered_at,now,state.epoch):0;const stage=!seed?.watered_at?0:value===1?3:value<.33?1:2;const status=!seed?.watered_at?'needs water':stage===3?'in bloom':stage===1?'sprouting':'budding';
  objects.push({key:`plot-${spot.id}`,x:spot.x,y:spot.y,node:<g transform={`translate(${spot.x} ${spot.y})`}><g {...objectProps(seed?`Plot ${spot.id+1}: ${seed.flower_type}, ${status}`:`Empty plot ${spot.id+1}${state.role==='GARDENER'?', plant a memory':''}`,()=>seed?onSeed(seed):onSpot(spot.id))}>
   <polygon points={diamond} className="plot-focus"/>{seed&&<rect x="-16" y="-38" width="32" height="42" fill="transparent"/>}</g>
   {seed?<><PixelSprite name={`flower-${seed.flower_type}-${stage}`}/>{stage===3&&!seed.opened_at&&<path className="bloom-spark" d="M17-33v6m-3-3h6" stroke="#fff1ad" strokeWidth="2"/>}{!seed.watered_at&&state.role==='CARETAKER'&&<path d="m13-18 3-5 3 5v3h-6Z" fill="#bcf0ee" stroke="#38677e"/>}</>:<PixelSprite name="marker" x={16} y={-1}/>}
   <title>{seed?`${seed.flower_type} · ${status}`:`Plot ${spot.id+1}`}</title>
  </g>});
 }
 for(const {seed,stage} of departures){const p=spots[seed.spot];if(p&&!state.seeds.some(s=>s.spot===seed.spot&&isActiveFlower(s,now)))objects.push({key:'departing-'+seed.id,x:p.x,y:p.y,node:<g transform={`translate(${p.x} ${p.y})`} pointerEvents="none" aria-hidden="true"><g className="flower-departure"><PixelSprite name={`flower-${seed.flower_type}-${stage}`}/>{[-15,-7,1,9,17].map((x,i)=><g key={x} transform={`translate(${x} ${-17-i%3*7})`}><path className="departure-petal" d="M0 0h3v2H1v1H0Z" fill={seed.flower_type==='bluebell'?'#b8d8e3':seed.flower_type==='daisy'?'#f7dfa3':'#efbacb'} style={{animationDelay:`${i*.09}s`}}/></g>)}</g></g>});}
 for(const gift of state.gifts){const p=hidingPlaces[gift.location];if(!p||gift.claimed_at)continue;objects.push({key:gift.id,...p,node:<g transform={`translate(${p.x} ${p.y})`}><g {...objectProps(`Discover ${gift.kind} ${p.name.toLowerCase()}`,()=>onGift(gift))}><rect className="gift-focus" x="-19" y="-38" width="38" height="45" rx="2"/></g><PixelSprite name={`gift-${gift.kind}`}/><path className="bloom-spark" d="M18-32v6m-3-3h6" stroke="#fff1ad" strokeWidth="2"/></g>});}
 for(const decoration of state.decorations){const p=decorSlots[decoration.slot];if(p)objects.push({key:decoration.inventory_id,...p,node:<g data-decoration={decoration.catalog_id} data-slot={decoration.slot} transform={`translate(${p.x} ${p.y})`}><PixelSprite name={decoration.catalog_id}/>{decoration.catalog_id==='koi-pond'&&<PondLife/>}</g>});}
 for(const character of characters)objects.push({key:`character-${character.person}`,x:character.x,y:character.depth,node:<CharacterSprite character={character} layers={wardrobes[character.person]}/>});
 objects.sort((a,b)=>a.y-b.y||a.x-b.x);
 const cottages=scenery.filter(s=>s.name==='cottage').concat(state.decorations.filter(d=>d.catalog_id==='cottage'&&decorSlots[d.slot]).map(d=>({name:'cottage',...decorSlots[d.slot]}))); 
 const lamps=scenery.filter(s=>s.name==='lantern').concat(state.decorations.filter(d=>d.catalog_id==='lantern'&&decorSlots[d.slot]).map(d=>({name:'lantern',...decorSlots[d.slot]})));
 return <div className="garden-world" style={{'--night':lighting} as CSSProperties} data-light={cycle.day?'day':'night'} data-sleeping={!awake} data-angry={state.angryMode} data-rainbow={state.rainbowMode}>
 <svg ref={ref} className="garden-canvas" aria-label={state.angryMode?"Angry Mode: an empty garden under gentle rain. All memories are preserved.":"Interactive isometric LoveGarden. Drag to explore; pinch, scroll, or use buttons to zoom."}>
  <title>Mehezad and Labib's LoveGarden</title>
  <defs><radialGradient id="lamp-light"><stop stopColor="#ffda78" stopOpacity=".5"/><stop offset="1" stopColor="#ffd879" stopOpacity="0"/></radialGradient></defs>
  <rect x={gardenBounds.x-1600} y={gardenBounds.y-1000} width={4480} height={2728} fill="transparent" aria-hidden="true"/>
  {state.angryMode?<StormScene>{characters.map(character=><CharacterSprite key={character.person} character={character} layers={wardrobes[character.person]}/>)}</StormScene>:<>
  {state.rainbowMode&&<image href="/art/rainbow.png" width="720" height="450" style={{imageRendering:'pixelated'}} pointerEvents="none"/>}
  <image href="/art/terrain.png" {...gardenBounds} style={{imageRendering:'pixelated'}} pointerEvents="none"/>
  <g transform={`translate(${iso(-2.8,11).x} ${iso(-2.8,11).y})`}><PondLife main/></g>
  <g pointerEvents="none" opacity={.8-lighting*.5}>{[[2.3,10],[3.2,11.5],[4.4,11.5],[3,12.4]].map(([u,v],i)=>{const p=iso(u,v);return <g key={i} transform={`translate(${p.x} ${p.y})`}><path className="pond-glimmer" d="M-6 0h4m3 1h6m-2 2h3" fill="none" stroke="#d2e6ce" strokeWidth="1" style={{animationDelay:`${-i*1.3}s`}}/></g>;})}</g>
  {spots.map(p=><PixelSprite key={p.id} name="plot" x={p.x} y={p.y}/>)}
  {objects.map(o=><g key={o.key}>{o.node}</g>)}
  <rect className="dusk-veil" x="-1000" y="-1000" width="3000" height="3000" fill="#f3bc9b" opacity={cycle.day?Math.sin(lighting*Math.PI)*.14:0} pointerEvents="none"/>
  <rect className="night-veil" x="-1000" y="-1000" width="3000" height="3000" fill="#25334f" opacity={lighting*.46} pointerEvents="none"/>
  <g opacity={lighting} pointerEvents="none">{state.decorations.map(d=>{const p=decorSlots[d.slot];return p&&<DecorationLights key={d.inventory_id} kind={d.catalog_id} {...p}/>;})}</g>
  <g opacity={lighting} pointerEvents="none">{lamps.map((p,i)=><g key={i}><circle cx={p.x+11} cy={p.y-32} r="29" fill="url(#lamp-light)"/><rect x={p.x+7} y={p.y-35} width="8" height="10" fill="#ffe6a1" className="pixel-glow"/></g>)}{cottages.map((p,i)=><g key={i} transform={`translate(${p.x} ${p.y})`}><circle cx="14" cy="-20" r="16" fill="url(#lamp-light)"/></g>)}{Array.from({length:12},(_,i)=><rect key={i} className="pixel-firefly" x={165+i*27} y={183+(i*37)%130} width="2" height="2" fill="#fff1ab" style={{animationDelay:`${-i*.7}s`}}/>)}</g>
  <g opacity={1-lighting*.75} pointerEvents="none">{[[569,160],[583,179],[555,170],[351,317],[371,320]].map(([x,y],i)=><g key={i} transform={`translate(${x} ${y})`}><path className="garden-petal" d="M0 0h3v1h-1v2H0Z" fill="#f6c6d0" style={{animationDelay:`${-i*3.3}s`}}/></g>)}</g>
  {placing&&decorSlots.map((p,i)=>!occupiedBays.has(i)&&p.capacity>=placingSize&&<g key={i} transform={`translate(${p.x} ${p.y})`} {...objectProps(`Place decoration in slot ${i+1}`,()=>onPlace(i))}><polygon points={diamond} className="placement-target"/><text className="slot-number" textAnchor="middle" y="4">{i+1}</text></g>)}
  <g pointerEvents="none">{effects.map((effect,i)=><g key={`${effect.id}-${i}`} transform={`translate(${effect.x} ${effect.y-20})`}><g className="world-feedback">{[-12,-5,2,9,16].map((x,n)=><rect key={x} x={x} y={-n%3*5} width="3" height={effect.kind==='water'?6:3} fill={effect.kind==='water'?'#b9f2f2':'#ffe6a0'}/>)}<text textAnchor="middle" y="-18">{effect.kind==='water'?'Watered':effect.kind==='bloom'?'In bloom!':'Discovered!'}</text></g></g>)}</g>
 </>}
 </svg>
 <div className="camera-controls"><button aria-label="Zoom in" onClick={()=>camera.current?.zoom(1.2)}><Icon name="plus"/></button><button aria-label="Zoom out" onClick={()=>camera.current?.zoom(1/1.2)}><Icon name="minus"/></button><button className="camera-reset" onClick={()=>camera.current?.reset()}><Icon name="reset" size={17}/><span>Reset View</span></button></div>
 {showCameraHint&&!state.angryMode&&!placing&&<div className="camera-hint"><span>Drag to explore • Scroll to zoom</span><span>Drag to explore • Pinch to zoom</span></div>}
 {(state.angryMode||placing)&&<div className="world-caption">{state.angryMode?'A quiet moment in the rain.':'Choose a numbered diamond'}</div>}
 </div>;
}


