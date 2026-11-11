import type {GardenState,Seed} from '../lib/types';
import {iso,scenery,decorSlots} from './world.ts';
import {isActiveFlower} from '../lib/flowers.ts';
export type Person='labib'|'mehezad';
export type Pose='idle'|'walk'|'sit'|'plant'|'water'|'sad'|'smoke';
export type Direction='se'|'sw'|'ne'|'nw';
export type Point={u:number;v:number};
export type CharacterPose={person:Person;pose:Pose;direction:Direction;frame:number;x:number;y:number;depth:number;hearts:boolean};
type Job={key:string;seedId:string;kind:'plant'|'water';spot:number;time:number};
type Actor={person:Person;point:Point;direction:Direction;pose:Pose;route:Point[];goal:string;queue:Job[];job:Job|null;holdUntil:number;blocked:boolean};
const inverse=(x:number,y:number):Point=>({u:((x-320)/16+(y-64)/8)/2,v:((y-64)/8-(x-320)/16)/2});
const distance=(a:Point,b:Point)=>{const aa=iso(a.u,a.v),bb=iso(b.u,b.v);return Math.hypot(aa.x-bb.x,aa.y-bb.y);};
export function directionTo(a:Point,b:Point):Direction{const aa=iso(a.u,a.v),bb=iso(b.u,b.v);return `${bb.y<aa.y?'n':'s'}${bb.x<aa.x?'w':'e'}`;}
const size=(name:string)=>name==='cottage'?1.7:name==='sign'?1:name==='fountain'?1.1:/oak|pine|willow|cherry|tree/.test(name)?.85:name==='bench'?.65:/bush|hydrangea|rock/.test(name)?.55:.3;
export class WalkingMap{
 private obstacles:{point:Point;radius:number}[];
 private storm:boolean;
 constructor(decorations:GardenState['decorations'],storm=false){
  this.storm=storm;
  this.obstacles=[...scenery.filter(s=>/oak|pine|willow|cherry|cottage|sign|bench|bush|hydrangea|rock/.test(s.name)).map(s=>({point:inverse(s.x,s.y),radius:size(s.name)})),...decorations.flatMap(d=>{const p=decorSlots[d.slot];return p?[{point:inverse(p.x,p.y),radius:size(d.catalog_id)}]:[];})];
 }
 canWalk(p:Point){
  if(p.u<1||p.u>18.5||p.v<1||p.v>16.5)return false;
  if(this.storm)return true;
  if(((p.u-3.1)/2.9)**2+((p.v-11.2)/3.35)**2<1)return false;
  for(let id=0;id<15;id++)if(Math.abs(p.u-(7+id%5*2))<.8&&Math.abs(p.v-(6+Math.floor(id/5)*2))<.8)return false;
  return !this.obstacles.some(o=>Math.abs(p.u-o.point.u)<o.radius&&Math.abs(p.v-o.point.v)<o.radius);
 }
 private nearest(p:Point){let best:Point|null=null,score=Infinity;for(let u=1;u<=18.5;u+=.5)for(let v=1;v<=16.5;v+=.5){const q={u,v},d=distance(q,p);if(d<score&&this.canWalk(q)){best=q;score=d;}}return best;}
 path(from:Point,to:Point):Point[]|null{
  const start=this.nearest(from),end=this.nearest(to);if(!start||!end)return null;
  const key=(p:Point)=>`${p.u},${p.v}`,queue=[start],parents=new Map<string,Point|null>([[key(start),null]]);let found:Point|null=null;
  for(let i=0;i<queue.length;i++){
   const p=queue[i];if(key(p)===key(end)){found=p;break;}
   for(const [du,dv] of [[.5,0],[0,.5],[-.5,0],[0,-.5]]){const q={u:p.u+du,v:p.v+dv};if(!parents.has(key(q))&&this.canWalk(q)){parents.set(key(q),p);queue.push(q);}}
  }
  if(!found)return null;
  const route:Point[]=[];for(let p:Point|null=found;p;p=parents.get(key(p))??null)route.unshift(p);
  if(distance(from,route[0])<.5)route.shift();return route;
 }
}
const actor=(person:Person,point:Point):Actor=>({person,point,direction:'se',pose:'idle',route:[],goal:'',queue:[],job:null,holdUntil:0,blocked:false});
const stroll:Point[]=[{u:5.5,v:4.5},{u:11,v:4.5},{u:17,v:4.5},{u:17,v:12.5},{u:11,v:12.5},{u:5.5,v:12.5}];
const wander:Record<Person,Point[]>={labib:[{u:5.5,v:7.5},{u:9,v:4.5},{u:5.5,v:12.5}],mehezad:[{u:17,v:11.5},{u:14,v:4.5},{u:11,v:12.5}]};
/** Cosmetic actors: observe successful public changes, never call game mutations. */
export class CharacterDirector{
 private actors=[actor('labib',{u:5.5,v:6.5}),actor('mehezad',{u:17,v:9.5})];
 private previousSeeds:Map<string,Seed>|null=null;
 private seeds:Seed[]|null=null;
 private decorations:GardenState['decorations']|null=null;
 private storm=false;
 private map=new WalkingMap([]);
 private bench=scenery.find(s=>s.name==='bench')!;
 update(state:GardenState,now:number,elapsed:number,reduced=false):CharacterPose[]{
  if(this.decorations!==state.decorations||this.storm!==state.angryMode){
   this.decorations=state.decorations;this.storm=state.angryMode;this.map=new WalkingMap(state.decorations,this.storm);
   const placed=[...state.decorations].filter(d=>d.catalog_id==='bench'&&decorSlots[d.slot]).sort((a,b)=>a.inventory_id.localeCompare(b.inventory_id))[0];
   this.bench=placed?{name:'bench',...decorSlots[placed.slot]}:scenery.find(s=>s.name==='bench')!;
   for(const a of this.actors){a.goal='';a.route=[];if(this.storm){a.queue=[];a.job=null;a.holdUntil=0;}}
  }
  if(this.seeds!==state.seeds){
   const old=this.previousSeeds;this.seeds=state.seeds;this.previousSeeds=new Map(state.seeds.map(s=>[s.id,s]));
   if(old&&!this.storm&&!reduced)for(const seed of state.seeds){
    if(!isActiveFlower(seed,now))continue;const before=old.get(seed.id);
    const add=(person:Person,kind:Job['kind'],stamp:string)=>{const time=Date.parse(stamp);if(now-time>30_000||now<time-2000)return;const a=this.actors.find(a=>a.person===person)!;a.queue.push({seedId:seed.id,key:`${seed.id}-${kind}-${stamp}`,kind,spot:seed.spot,time});a.queue=a.queue.slice(-4);};
    if(!before)add('labib','plant',seed.planted_at);
    if(seed.watered_at&&before&&!before.watered_at)add('mehezad','water',seed.watered_at);
   }
  }
  const cycle=Math.floor((now-state.epoch)/120_000),phase=((now-state.epoch)%120_000+120_000)%120_000/1000,benchUV=inverse(this.bench.x,this.bench.y);
  const poses:CharacterPose[]=this.actors.filter(a=>!this.storm||a.person==='labib').map((a,index)=>{
   const offset=a.person==='labib'?-.5:.5;
   if(reduced){a.queue=[];a.job=null;const p=this.storm?iso(10,10):iso(9+offset,12.5);return {person:a.person,pose:this.storm?'sad':'idle',direction:'se',frame:0,...p,depth:p.y,hearts:state.rainbowMode&&!this.storm};}
   if(a.job&&!state.seeds.some(s=>s.id===a.job!.seedId&&isActiveFlower(s,now))){a.job=null;a.goal='';a.holdUntil=0;}
   if(!a.job&&a.queue.length){a.job=a.queue.shift()!;a.goal='';a.holdUntil=0;}
   let target:Point,goal:string,rest:Pose='idle';
   if(this.storm){target={u:10,v:10};goal='sad';rest='sad';}
   else if(a.job){const s=a.job.spot;target={u:7+s%5*2,v:7+Math.floor(s/5)*2};goal=a.job.key;rest=a.job.kind;}
   else if(phase>=80){target={u:benchUV.u+offset,v:benchUV.v+1.5};goal=`bench-${cycle}`;rest=a.person==='labib'&&phase>=100&&phase<108&&cycle%2===0?'smoke':'sit';}
   else if(phase>=40||state.rainbowMode){const segment=Math.floor((phase>=40?phase-40:phase)/10)%stroll.length;const p=stroll[segment];target={u:p.u+offset,v:p.v};goal=`together-${cycle}-${phase>=40?1:0}-${segment}`;}
   else{const segment=Math.floor(phase/14);target=wander[a.person][segment%3];goal=`wander-${cycle}-${segment}`;}
   if(goal!==a.goal){a.goal=goal;const path=this.map.path(a.point,target);a.route=path??[];a.blocked=path===null;a.holdUntil=0;if(a.blocked&&a.job){a.job=null;a.goal='';}}
   let remaining=Math.min(.2,Math.max(0,elapsed))*34;
   while(a.route.length&&remaining>0){const p=a.route[0],d=distance(a.point,p);if(d>.01)a.direction=directionTo(a.point,p);if(d<=remaining){a.point=p;a.route.shift();remaining-=d;}else{const t=remaining/d;a.point={u:a.point.u+(p.u-a.point.u)*t,v:a.point.v+(p.v-a.point.v)*t};remaining=0;}}
   a.pose=a.route.length?'walk':a.blocked||distance(a.point,target)>28?'idle':rest;
   if(!a.route.length&&a.job&&!a.blocked){
    const s=a.job.spot;a.direction=directionTo(a.point,{u:7+s%5*2,v:6+Math.floor(s/5)*2});
    if(!a.holdUntil)a.holdUntil=now+4200;
    if(now>=a.holdUntil){a.job=null;a.goal='';a.holdUntil=0;a.pose='idle';}
   }
   let p=iso(a.point.u,a.point.v),depth=p.y;
   if(a.pose==='sit'||a.pose==='smoke'){
    // Feet are aligned to the existing isometric seat; sort just after the bench.
    p={x:this.bench.x+(a.person==='labib'?-14:7),y:this.bench.y+(a.person==='labib'?-5:5)};depth=this.bench.y+1+index*.1;a.direction='sw';
   }
   if(a.pose==='sad')a.direction='se';
   const speed=a.pose==='walk'?150:a.pose==='smoke'?850:280;
   return {person:a.person,pose:a.pose,direction:a.direction,frame:a.pose==='idle'||a.pose==='sad'||a.pose==='sit'?0:Math.floor(now/speed)%4,...p,depth,hearts:state.rainbowMode&&!this.storm};
  });
  if(!poses.some(p=>p.person==='mehezad'&&p.pose==='sit'))for(const p of poses)if(p.pose==='smoke')p.pose='sit';
  return poses;
 }
}
