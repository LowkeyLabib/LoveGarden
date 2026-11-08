import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent, ReactNode } from 'react';
import type { GardenState, Seed, Gift } from '../lib/types';
import { growth, clockState } from '../lib/clock.mjs';
import {isActiveFlower,departingFlowers,FLOWER_FADE_MS} from '../lib/flowers';
import { Icon } from './Art';
import { PixelSprite } from '../garden/PixelSprite';
import { iso, spots, hidingPlaces, decorSlots, scenery } from '../garden/world';
export { spots, hidingPlaces, decorSlots } from '../garden/world';

type Props={state:GardenState;now:number;onSpot:(n:number)=>void;onSeed:(s:Seed)=>void;onGift:(g:Gift)=>void;onPlace:(slot:number)=>void;placing:string|null};
type Effect={id:string;x:number;y:number;kind:'water'|'bloom'|'gift'};
const initialCamera={x:344,y:214,zoom:1};
const diamond='0,-15 29,0 0,15 -29,0';
export default function Garden({state,now,onSpot,onSeed,onGift,onPlace,placing}:Props){
 const ref=useRef<SVGSVGElement>(null);
 const [aspect,setAspect]=useState(1.7);
 const visiblePlants=useRef<Seed[]|null>(null);
 const [departures,setDepartures]=useState<{seed:Seed;stage:number;until:number}[]>([]);
 const [awake,setAwake]=useState(document.visibilityState==='visible');
 useEffect(()=>{const visibility=()=>{visiblePlants.current=null;setDepartures([]);setAwake(document.visibilityState==='visible');};document.addEventListener('visibilitychange',visibility);return()=>document.removeEventListener('visibilitychange',visibility);},[]);
 useEffect(()=>{
  if(!awake){visiblePlants.current=null;return;}
  const leaving=departingFlowers(visiblePlants.current,state.seeds,now);
  visiblePlants.current=state.seeds.filter(seed=>isActiveFlower(seed,now));
  if(leaving.length&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches)setDepartures(old=>[...old,...leaving.map(seed=>({seed,stage:!seed.watered_at?0:growth(seed.watered_at,now,state.epoch)===1?3:growth(seed.watered_at,now,state.epoch)<.33?1:2,until:performance.now()+FLOWER_FADE_MS}))]);
 },[state.seeds,state.epoch,now,awake]);
 useEffect(()=>{if(!departures.length)return;const timer=window.setTimeout(()=>setDepartures(old=>old.filter(item=>item.until>performance.now())),Math.max(0,Math.min(...departures.map(item=>item.until))-performance.now()));return()=>window.clearTimeout(timer);},[departures]);
 const [camera,setCamera]=useState(initialCamera);
 const [effects,setEffects]=useState<Effect[]>([]);
 const previous=useRef<Map<string,{watered:boolean;bloom:boolean;claimed:boolean}>|null>(null);
 const pointers=useRef(new Map<number,{x:number;y:number}>());
 const drag=useRef({x:0,y:0,startX:0,startY:0,distance:0,moved:false});
 const cycle=clockState(now,state.epoch);
 const height=480/camera.zoom,width=height*aspect;
 const limit=(x:number,y:number,zoom:number)=>({x:Math.max(120,Math.min(565,x)),y:Math.max(105,Math.min(345,y)),zoom:Math.max(.75,Math.min(2.5,zoom))});
 const zoom=(factor:number)=>setCamera(c=>limit(c.x,c.y,c.zoom*factor));
 useEffect(()=>{const el=ref.current!;const observer=new ResizeObserver(([entry])=>setAspect(entry.contentRect.width/Math.max(1,entry.contentRect.height)));observer.observe(el);
 const wheel=(e:WheelEvent)=>{if(e.ctrlKey){e.preventDefault();setCamera(c=>({...c,zoom:Math.max(.75,Math.min(2.5,c.zoom*(e.deltaY>0?.95:1.05)))}));}};
 el.addEventListener('wheel',wheel,{passive:false});return()=>{observer.disconnect();el.removeEventListener('wheel',wheel);};},[]);
 // Feedback observes public state transitions; rewards and growth remain authoritative.
 useEffect(()=>{
  const next=new Map<string,{watered:boolean;bloom:boolean;claimed:boolean}>(), additions:Effect[]=[];
  for(const seed of state.seeds.filter(seed=>isActiveFlower(seed,now))){const value={watered:!!seed.watered_at,bloom:growth(seed.watered_at,now,state.epoch)===1,claimed:false};next.set(seed.id,value);const old=previous.current?.get(seed.id),p=spots[seed.spot];if(old&&p){if(!old.watered&&value.watered)additions.push({...p,id:seed.id,kind:'water'});else if(!old.bloom&&value.bloom)additions.push({...p,id:seed.id,kind:'bloom'});}}
  for(const gift of state.gifts){const value={watered:false,bloom:false,claimed:!!gift.claimed_at};next.set(gift.id,value);const old=previous.current?.get(gift.id),p=hidingPlaces[gift.location];if(old&&!old.claimed&&value.claimed&&p)additions.push({id:gift.id,...p,kind:'gift'});}
  previous.current=next;if(additions.length)setEffects(e=>[...e,...additions]);
 },[state.seeds,state.gifts,state.epoch,now]);
 useEffect(()=>{if(!effects.length)return;const timeout=window.setTimeout(()=>setEffects([]),1500);return()=>window.clearTimeout(timeout);},[effects]);
 const pointerDown=(e:PointerEvent<SVGSVGElement>)=>{
  if(e.button!==0)return;
  pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});(e.target as Element).setPointerCapture(e.pointerId);
  const arr=[...pointers.current.values()];drag.current={x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,distance:arr.length===2?Math.hypot(arr[0].x-arr[1].x,arr[0].y-arr[1].y):0,moved:arr.length>1};
 };
 const pointerMove=(e:PointerEvent<SVGSVGElement>)=>{
  if(!pointers.current.has(e.pointerId))return;pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});const arr=[...pointers.current.values()];
  if(arr.length===2){const d=Math.hypot(arr[0].x-arr[1].x,arr[0].y-arr[1].y);if(drag.current.distance>0)zoom(d/drag.current.distance);drag.current.distance=d;drag.current.moved=true;}
  else if(drag.current.moved||Math.hypot(e.clientX-drag.current.startX,e.clientY-drag.current.startY)>6){const k=height/ref.current!.clientHeight;setCamera(c=>limit(c.x-(e.clientX-drag.current.x)*k,c.y-(e.clientY-drag.current.y)*k,c.zoom));drag.current.moved=true;}
  drag.current.x=e.clientX;drag.current.y=e.clientY;
 };
 const pointerEnd=(e:PointerEvent<SVGSVGElement>)=>{pointers.current.delete(e.pointerId);const remaining=[...pointers.current.values()][0];if(remaining){drag.current.x=remaining.x;drag.current.y=remaining.y;}const target=e.target as Element;if(target.hasPointerCapture(e.pointerId))target.releasePointerCapture(e.pointerId);};
 const objectProps=(label:string,action:()=>void)=>({role:'button',tabIndex:0,'aria-label':label,className:'world-object',onClick:()=>{if(!drag.current.moved)action();},onKeyDown:(e:KeyboardEvent)=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();action();}}});
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
 for(const decoration of state.decorations){const p=decorSlots[decoration.slot];if(p)objects.push({key:decoration.inventory_id,...p,node:<g data-decoration={decoration.catalog_id} data-slot={decoration.slot}><PixelSprite name={decoration.catalog_id} {...p}/></g>});}
 objects.sort((a,b)=>a.y-b.y||a.x-b.x);
 const cottages=scenery.filter(s=>s.name==='cottage').concat(state.decorations.filter(d=>d.catalog_id==='cottage'&&decorSlots[d.slot]).map(d=>({name:'cottage',...decorSlots[d.slot]}))); 
 const lamps=scenery.filter(s=>s.name==='lantern').concat(state.decorations.filter(d=>d.catalog_id==='lantern'&&decorSlots[d.slot]).map(d=>({name:'lantern',...decorSlots[d.slot]})));
 return <div className="garden-world" style={{'--night':cycle.night} as CSSProperties} data-light={cycle.day?'day':'night'} data-sleeping={!awake}>
 <svg ref={ref} className="garden-canvas" viewBox={`${camera.x+(aspect<.8?24:0)-width/2} ${camera.y-height/2} ${width} ${height}`} aria-label="Interactive isometric LoveGarden. Drag to explore; pinch or use buttons to zoom." onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={pointerEnd}>
  <title>Mehezad and Labib's LoveGarden</title>
  <defs><radialGradient id="lamp-light"><stop stopColor="#ffda78" stopOpacity=".5"/><stop offset="1" stopColor="#ffd879" stopOpacity="0"/></radialGradient></defs>
  <image href="/art/terrain.png" x="0" y="0" width="720" height="450" style={{imageRendering:'pixelated'}} pointerEvents="none"/>
  <g pointerEvents="none" opacity={.8-cycle.night*.5}>{[[2.3,10],[3.2,11.5],[4.4,11.5],[3,12.4]].map(([u,v],i)=>{const p=iso(u,v);return <g key={i} transform={`translate(${p.x} ${p.y})`}><path className="pond-glimmer" d="M-6 0h4m3 1h6m-2 2h3" fill="none" stroke="#d2e6ce" strokeWidth="1" style={{animationDelay:`${-i*1.3}s`}}/></g>;})}</g>
  {spots.map(p=><PixelSprite key={p.id} name="plot" x={p.x} y={p.y}/>)}
  {objects.map(o=><g key={o.key}>{o.node}</g>)}
  <rect className="dusk-veil" x="-1000" y="-1000" width="3000" height="3000" fill="#f3bc9b" opacity={cycle.day?Math.sin(cycle.night*Math.PI)*.14:0} pointerEvents="none"/>
  <rect className="night-veil" x="-1000" y="-1000" width="3000" height="3000" fill="#25334f" opacity={cycle.night*.46} pointerEvents="none"/>
  <g opacity={cycle.night} pointerEvents="none">{lamps.map((p,i)=><g key={i}><circle cx={p.x+11} cy={p.y-32} r="29" fill="url(#lamp-light)"/><rect x={p.x+7} y={p.y-35} width="8" height="10" fill="#ffe6a1" className="pixel-glow"/></g>)}{cottages.map((p,i)=><g key={i} transform={`translate(${p.x} ${p.y})`}><circle cx="14" cy="-20" r="16" fill="url(#lamp-light)"/></g>)}{Array.from({length:12},(_,i)=><rect key={i} className="pixel-firefly" x={165+i*27} y={183+(i*37)%130} width="2" height="2" fill="#fff1ab" style={{animationDelay:`${-i*.7}s`}}/>)}</g>
  <g opacity={1-cycle.night*.75} pointerEvents="none">{[[569,160],[583,179],[555,170],[351,317],[371,320]].map(([x,y],i)=><g key={i} transform={`translate(${x} ${y})`}><path className="garden-petal" d="M0 0h3v1h-1v2H0Z" fill="#f6c6d0" style={{animationDelay:`${-i*3.3}s`}}/></g>)}</g>
  {placing&&decorSlots.map((p,i)=><g key={i} transform={`translate(${p.x} ${p.y})`} {...objectProps(`Place decoration in slot ${i+1}`,()=>onPlace(i))}><polygon points="0,-16 30,0 0,16 -30,0" className="placement-target"/><text className="slot-number" textAnchor="middle" y="4">{i+1}</text></g>)}
  <g pointerEvents="none">{effects.map((effect,i)=><g key={`${effect.id}-${i}`} transform={`translate(${effect.x} ${effect.y-20})`}><g className="world-feedback">{[-12,-5,2,9,16].map((x,n)=><rect key={x} x={x} y={-n%3*5} width="3" height={effect.kind==='water'?6:3} fill={effect.kind==='water'?'#b9f2f2':'#ffe6a0'}/>)}<text textAnchor="middle" y="-18">{effect.kind==='water'?'Watered':effect.kind==='bloom'?'In bloom!':'Discovered!'}</text></g></g>)}</g>
 </svg>
 <div className="camera-controls"><button aria-label="Zoom in" onClick={()=>zoom(1.2)}><Icon name="plus"/></button><button aria-label="Zoom out" onClick={()=>zoom(1/1.2)}><Icon name="minus"/></button><button aria-label="Center garden" onClick={()=>setCamera(initialCamera)}><Icon name="reset" size={19}/></button></div>
 <div className="world-caption">{placing?'Choose a numbered diamond':'Drag to explore · Pinch or + / − to zoom'}</div>
 </div>;
}


