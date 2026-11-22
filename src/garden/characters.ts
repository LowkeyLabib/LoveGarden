import type {GardenState,Seed} from '../lib/types';
import {iso,groundPoint,scenery,decorSlots,grid,pondRadius,spots,decorationRadius,spotById} from './world.ts';
import {isActiveFlower} from '../lib/flowers.ts';
export type Person='labib'|'mehezad';
export type Pose='idle'|'walk'|'sit'|'plant'|'water'|'sad'|'smoke';
export type Direction='se'|'sw'|'ne'|'nw';
export type Point={u:number;v:number};
export type Gesture='lookout'|'light'|'smoking'|'surprised'|'hurry'|'scold'|'bonk'|'snatch'|'throw'|'embarrassed';
export type CharacterPose={person:Person;pose:Pose;direction:Direction;frame:number;x:number;y:number;depth:number;hearts:boolean;gesture?:Gesture;gestureTime?:number;idleHeart?:boolean};
type Job={key:string;seedId:string;kind:'plant'|'water';spot:number;time:number};
type Actor={person:Person;point:Point;direction:Direction;pose:Pose;route:Point[];goal:string;queue:Job[];job:Job|null;holdUntil:number;blocked:boolean;retryAt:number};
type Activity={target:Point;goal:string;rest?:Pose;seat?:Point;speed?:number};
const inverse=groundPoint;
const walkBounds={minU:grid.minU+1,maxU:grid.maxU-1,minV:grid.minV+1,maxV:grid.maxV-1};
const distance=(a:Point,b:Point)=>{const aa=iso(a.u,a.v),bb=iso(b.u,b.v);return Math.hypot(aa.x-bb.x,aa.y-bb.y);};
const between=(a:Point,b:Point,t:number):Point=>({u:a.u+(b.u-a.u)*t,v:a.v+(b.v-a.v)*t});
export function directionTo(a:Point,b:Point):Direction{const aa=iso(a.u,a.v),bb=iso(b.u,b.v);return `${bb.y<aa.y?'n':'s'}${bb.x<aa.x?'w':'e'}`;}
const size=(name:string)=>name==='cottage'?1.7:name==='sign'?1:name==='fountain'?1.1:/oak|pine|willow|cherry|tree/.test(name)?.85:name==='bench'?.65:/bush|hydrangea|rock/.test(name)?.55:.3;
export class WalkingMap{
 private obstacles:{point:Point;radius:number}[];
 private storm:boolean;
 private walkableCells=new Map<string,boolean>();
 constructor(decorations:GardenState['decorations'],storm=false){
  this.storm=storm;
  this.obstacles=[...scenery.filter(s=>/oak|pine|willow|cherry|cottage|sign|bench|bush|hydrangea|rock/.test(s.name)).map(s=>({point:inverse(s.x,s.y),radius:size(s.name)})),...decorations.flatMap(d=>{const p=decorSlots[d.slot];return p?[{point:p,radius:decorationRadius(d.catalog_id)||size(d.catalog_id)}]:[];})];
 }
 canWalk(p:Point){
  if(p.u<walkBounds.minU||p.u>walkBounds.maxU||p.v<walkBounds.minV||p.v>walkBounds.maxV)return false;
  if(this.storm)return true;
  if(pondRadius(p.u,p.v)<1.11)return false;
  if(spots.some(spot=>Math.abs(p.u-spot.u)<.8&&Math.abs(p.v-spot.v)<.8))return false;
  return !this.obstacles.some(o=>Math.abs(p.u-o.point.u)<o.radius&&Math.abs(p.v-o.point.v)<o.radius);
 }
 canTravel(from:Point,to:Point){
  const steps=Math.max(1,Math.ceil(distance(from,to)/2));
  for(let i=1;i<=steps;i++)if(!this.canWalk(between(from,to,i/steps)))return false;
  return true;
 }
 private nearest(p:Point,connected=false,avoid?:Point){
  let best:Point|null=null,score=Infinity;
  const clearance=avoid?Math.min(19,distance(p,avoid)):0;
  const search=(minU:number,maxU:number,minV:number,maxV:number)=>{
   for(let u=minU;u<=maxU;u+=.5)for(let v=minV;v<=maxV;v+=.5){
    const q={u,v},d=distance(q,p);
    if(d<score&&this.cellIsWalkable(q)&&(!connected||this.canTravel(p,q))&&
     (!avoid||distance(q,avoid)>=clearance&&distance(between(p,q,.5),avoid)>=clearance-.01)){best=q;score=d;}
   }
  };
  const u=Math.round(p.u*2)/2,v=Math.round(p.v*2)/2;
  search(Math.max(walkBounds.minU,u-2),Math.min(walkBounds.maxU,u+2),Math.max(walkBounds.minV,v-2),Math.min(walkBounds.maxV,v+2));
  if(score>24)search(walkBounds.minU,walkBounds.maxU,walkBounds.minV,walkBounds.maxV);
  return best;
 }
 private cellIsWalkable(point:Point){
  if(point.u<walkBounds.minU||point.u>walkBounds.maxU||point.v<walkBounds.minV||point.v>walkBounds.maxV)return false;
  const key=`${point.u},${point.v}`;
  const cached=this.walkableCells.get(key);
  if(cached!==undefined)return cached;
  const valid=this.canWalk(point);
  this.walkableCells.set(key,valid);
  return valid;
 }
 path(from:Point,to:Point,avoid?:Point):Point[]|null{
  const start=this.nearest(from,this.canWalk(from),avoid),end=this.nearest(to);if(!start||!end)return null;
  const clearance=avoid?Math.min(19,distance(start,avoid)):0;
  const key=(p:Point)=>`${p.u},${p.v}`,queue=[start],parents=new Map<string,Point|null>([[key(start),null]]);let found:Point|null=null;
  for(let i=0;i<queue.length;i++){
   const p=queue[i];if(key(p)===key(end)){found=p;break;}
   for(const [du,dv] of [[.5,0],[0,.5],[-.5,0],[0,-.5]]){
    const q={u:p.u+du,v:p.v+dv};
    if(!parents.has(key(q))&&this.cellIsWalkable(q)&&(!avoid||distance(q,avoid)>=clearance)){
     parents.set(key(q),p);queue.push(q);
    }
   }
  }
  if(!found)return null;
  const route:Point[]=[];for(let p:Point|null=found;p;p=parents.get(key(p))??null)route.unshift(p);
  if(distance(from,route[0])<.5)route.shift();return route;
 }
}
const actor=(person:Person,point:Point):Actor=>({person,point,direction:'se',pose:'idle',route:[],goal:'',queue:[],job:null,holdUntil:0,blocked:false,retryAt:0});
const stroll:Point[]=[{u:5.5,v:4.5},{u:11,v:4.5},{u:17,v:4.5},{u:17,v:12.5},{u:11,v:12.5},{u:5.5,v:12.5}];
const socialKinds=new Set(['garden-swing','picnic-spot','romantic-gazebo','rose-heart-arch','koi-pond']);
const quietSpots=[{u:4.5,v:5.5},{u:5.5,v:8.5},{u:5.5,v:12.5},{u:3,v:3.5}];
const wanderTargets=[
 [{u:19,v:4.5},{u:17,v:11.5},{u:11,v:13},{u:14,v:4.5}],
 [{u:17,v:9.5},{u:5.5,v:8.5},{u:5.5,v:12.5},{u:11,v:4.5}],
];
function hash(value:number){
 const mixed=Math.imul(value^0x6a09e667,0x45d9f3b);
 const scrambled=Math.imul(mixed^(mixed>>>16),0x45d9f3b);
 return (scrambled^(scrambled>>>16))>>>0;
}
const normalGap=28,closeGap=20;
const cycleMs=120_000;
const smokingCooldown=8*60_000;
const sceneDuration=2800;
type SmokingScene=
 |{kind:'sneak-away';spot:Point;until:number}
 |{kind:'smoking';started:number;until:number}
 |{kind:'caught';detected:number;until:number;arrived:number|null;approach:Point}
 |{kind:'embarrassed';started:number;until:number};
type Mark={point:Point;at:number};

/** Arc-length marks preserve the corners of the leader's actual route. */
class WalkingTrail{
 private marks:Mark[];
 constructor(point:Point){this.marks=[{point,at:0}];}
 get end(){return this.marks[this.marks.length-1].at;}
 get start(){return this.marks[0].at;}
 add(point:Point){
  const last=this.marks[this.marks.length-1],length=distance(last.point,point);
  if(length<.001)return;
  this.marks.push({point,at:last.at+length});
  while(this.marks.length>2&&this.marks[1].at<this.end-140)this.marks.shift();
 }
 point(at:number){
  const index=this.marks.findIndex(mark=>mark.at>=at);
  if(index<0)return this.marks[this.marks.length-1].point;
  const end=this.marks[index],start=this.marks[index-1];
  return start?between(start.point,end.point,(at-start.at)/(end.at-start.at)):end.point;
 }
 route(from:number,to:number){
  const corners=this.marks.filter(mark=>mark.at>Math.min(from,to)&&mark.at<Math.max(from,to));
  if(to<from)corners.reverse();
  return [...corners.map(mark=>mark.point),this.point(to)];
 }
}

function advance(a:Actor,seconds:number,speed:number,other?:Point,onStep?:(point:Point)=>void){
 let remaining=seconds*speed,moved=0;
 while(a.route.length&&remaining>0){
  const next=a.route[0],length=distance(a.point,next),step=Math.min(remaining,length);
  const point=step>=length?next:between(a.point,next,step/length);
  // A standing character yields space. Routes still progress if the pair starts close.
  if(other&&distance(point,other)<17&&distance(point,other)<distance(a.point,other)-.001)break;
  if(length>.01)a.direction=directionTo(a.point,next);
  a.point=point;onStep?.(point);moved+=step;remaining-=step;
  if(step>=length)a.route.shift();
 }
 return moved;
}
/** Cosmetic actors: observe successful public changes, never call game mutations. */
export class CharacterDirector{
 private labib=actor('labib',{u:5.5,v:6.5});
 private mehezad=actor('mehezad',{u:17,v:9.5});
 private actors=[this.labib,this.mehezad];
 private trail=new WalkingTrail(this.mehezad.point);
 private followingAt:number|null=null;
 private joinAt:number|null=null;
 private retryFollowAt=0;
 private stoppedAt=0;
 private viewedMs=0;
 private lastNow:number|null=null;
 private nextSmokeAt=0;
 private smokeBlock:number|null=null;
 private scene:SmokingScene|null=null;
 private previousSeeds:Map<string,Seed>|null=null;
 private seeds:Seed[]|null=null;
 private decorations:GardenState['decorations']|null=null;
 private storm=false;
 private map=new WalkingMap([]);
 private bench=scenery.find(s=>s.name==='bench')!;

 pause(){
  if(this.scene)this.nextSmokeAt=(this.lastNow??0)+smokingCooldown;
  this.scene=null;
  this.lastNow=null;
  this.resetTrail();
 }

 private resetTrail(){
  this.trail=new WalkingTrail(this.mehezad.point);
  this.followingAt=null;this.joinAt=null;this.retryFollowAt=0;this.stoppedAt=0;
  if(this.labib.goal==='follow'){this.labib.goal='';this.labib.route=[];}
 }

 private walk(a:Actor,activity:Activity,seconds:number,now:number,other?:Point,onStep?:(point:Point)=>void){
  const {target,goal,rest='idle',seat,speed=34}=activity;
  if(a.goal!==goal){
   a.goal=goal;a.holdUntil=0;a.retryAt=now+500;
   const route=this.map.path(a.point,target);
   a.blocked=route===null;a.route=route??[];
   if(route&&seat)a.route.push(seat);
   if(a.blocked&&a.job){a.job=null;a.goal='';}
  }
  const moved=advance(a,seconds,speed,other,onStep);
  if(moved<.01&&a.route.length&&other&&now>=a.retryAt){
   a.retryAt=now+1200;
   const detour=this.map.path(a.point,target,other);
   if(detour)a.route=seat?[...detour,seat]:detour;
  }
  a.pose=moved>.01?'walk':a.route.length||a.blocked||distance(a.point,seat??target)>28?'idle':rest;
  if(!a.route.length&&a.job&&!a.blocked){
   const spot=spotById.get(a.job.spot);
   if(spot)a.direction=directionTo(a.point,spot);
   if(!a.holdUntil)a.holdUntil=now+4200;
   if(now>=a.holdUntil){a.job=null;a.goal='';a.holdUntil=0;a.pose='idle';}
  }
  if(seat&&a.pose==='sit')a.direction=goal.startsWith('bench-')?'sw':'se';
  if(a.pose==='sad')a.direction='se';
  return moved;
 }

 private follow(seconds:number,now:number,gap:number){
  const a=this.labib,b=this.mehezad;
  if(a.goal!=='follow'){
   a.goal='follow';a.route=[];
   this.followingAt=null;this.joinAt=null;this.retryFollowAt=0;
  }
  const targetAt=this.trail.end-gap;
  a.pose='idle';
  if(targetAt<this.trail.start){
   a.direction=directionTo(a.point,b.point);
   return;
  }
  if(this.followingAt!==null&&this.followingAt<this.trail.start)this.followingAt=null;
  if(this.joinAt!==null&&this.joinAt<this.trail.start){this.joinAt=null;a.route=[];}
  if(this.followingAt===null&&this.joinAt===null&&now>=this.retryFollowAt){
   const target=this.trail.point(targetAt);
   if(distance(a.point,target)<.1)this.followingAt=targetAt;
   else{
    const route=this.map.path(a.point,target);
    const end=route?.[route.length-1]??a.point;
    if(route&&this.map.canTravel(end,target)){
     a.route=[...route,target];this.joinAt=targetAt;
    }
    this.retryFollowAt=now+1200;
   }
  }
  if(this.followingAt!==null){
   const difference=targetAt-this.followingAt;
   const speed=difference<0?15:difference>14?43:Math.min(34,16+difference*2);
   const step=Math.sign(difference)*Math.min(Math.abs(difference),speed*seconds);
   a.route=Math.abs(step)>.02?this.trail.route(this.followingAt,this.followingAt+step):[];
   const moved=advance(a,seconds,speed,b.point);
   this.followingAt+=Math.sign(difference)*moved;
   if(moved>.01)a.pose='walk';
  }else if(this.joinAt!==null){
   if(advance(a,seconds,44,b.point)>.01)a.pose='walk';
   if(!a.route.length){this.followingAt=this.joinAt;this.joinAt=null;}
   else if(a.pose==='idle'&&now>=this.retryFollowAt){this.joinAt=null;a.route=[];}
  }
  if(a.pose==='idle')a.direction=directionTo(a.point,b.point);
 }

 private updateSmoking(now:number,cycle:number,phase:number,busy:boolean){
  const a=this.labib,b=this.mehezad;
  const separation=distance(a.point,b.point);
  if(busy&&this.scene?.kind!=='embarrassed'){
   this.scene=null;
   return;
  }
  const scene=this.scene;
  if(!scene){
   // One hashed opportunity per twelve-minute block. Viewers share the
   // slot through the garden epoch, and missed opportunities are never replayed.
   const block=Math.floor(cycle/6),roll=hash(block),slot=block%2===0?2:1+2*(roll%2);
   const start=6+((roll>>>16)%4);
   if(this.viewedMs<60_000||now<this.nextSmokeAt||this.smokeBlock===block||
    cycle<0||cycle%6!==slot||phase<start||phase>=14||separation<90)return;
   const spot=quietSpots.filter(p=>this.map.canWalk(p)&&distance(p,b.point)>100&&distance(p,a.point)>14)
    .sort((p,q)=>distance(p,a.point)-distance(q,a.point))[0];
   if(!spot||distance(spot,a.point)>145)return;
   this.smokeBlock=block;this.nextSmokeAt=now+smokingCooldown;
   this.scene={kind:'sneak-away',spot,until:now+7000};
  }else if(scene.kind==='sneak-away'){
   if(now>=scene.until||separation<85)this.scene=null;
   else if(distance(a.point,scene.spot)<12&&!a.route.length){
    this.scene={kind:'smoking',started:now,until:now+18_000};
   }
  }else if(scene.kind==='smoking'){
   if(now>=scene.until)this.scene=null;
   else if(now-scene.started>=2200&&separation<83){
    const here=iso(a.point.u,a.point.v);
    const approach=[-1,1].map(sign=>inverse(here.x+sign*21,here.y+2))
     .filter(p=>this.map.canWalk(p)).sort((p,q)=>distance(p,b.point)-distance(q,b.point))[0];
    if(approach)this.scene={kind:'caught',detected:now,until:now+6800,arrived:null,approach};
   }
  }else if(scene.kind==='caught'){
   if(scene.arrived!==null){
    if(now-scene.arrived>=sceneDuration)this.scene={kind:'embarrassed',started:now,until:now+30_000};
   }else if(separation<=29)scene.arrived=now;
   else if(now>=scene.until)this.scene=null;
  }else if(now>=scene.until)this.scene=null;
 }

 private gesture(person:Person,now:number):{gesture?:Gesture;gestureTime?:number}{
  const scene=this.scene;
  if(!scene)return {};
  const labib=person==='labib';
  if(scene.kind==='smoking'&&labib){
   const time=now-scene.started;
   return {gesture:time<1100?'lookout':time<2200?'light':'smoking',gestureTime:time};
  }
  if(scene.kind==='caught'){
   if(scene.arrived===null)return {gesture:labib?'surprised':'hurry',gestureTime:now-scene.detected};
   const time=now-scene.arrived;
   if(labib)return time<1050?{gesture:'surprised',gestureTime:now-scene.detected}:
    {gesture:'embarrassed',gestureTime:time-1050};
   return {gesture:time<650?'scold':time<1050?'bonk':time<1700?'snatch':'throw',gestureTime:time};
  }
  if(scene.kind==='embarrassed'&&labib&&now-scene.started<3200)return {gesture:'embarrassed',gestureTime:now-scene.started};
  return {};
 }
 update(state:GardenState,now:number,elapsed:number,reduced=false):CharacterPose[]{
  if(elapsed>1||this.lastNow!==null&&Math.abs(now-this.lastNow-elapsed*1000)>5000)this.pause();
  this.lastNow=now;
  const seconds=Math.min(.2,Math.max(0,elapsed));
  if(reduced)this.pause();
  else if(!state.angryMode)this.viewedMs+=seconds*1000;
  const previousDecorations=this.decorations;
  const layoutChanged=previousDecorations!==state.decorations&&(!previousDecorations||
   previousDecorations.length!==state.decorations.length||state.decorations.some(next=>
    !previousDecorations.some(old=>old.slot===next.slot&&old.catalog_id===next.catalog_id&&old.inventory_id===next.inventory_id)));
  this.decorations=state.decorations;
  if(layoutChanged||this.storm!==state.angryMode){
   const stormChanged=this.storm!==state.angryMode;
   this.storm=state.angryMode;this.map=new WalkingMap(state.decorations,this.storm);
   const placed=[...state.decorations].filter(d=>d.catalog_id==='bench'&&decorSlots[d.slot]).sort((a,b)=>a.inventory_id.localeCompare(b.inventory_id))[0];
   this.bench=placed?{name:'bench',...decorSlots[placed.slot]}:scenery.find(s=>s.name==='bench')!;
   if(stormChanged)this.pause();
   else this.resetTrail();
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
  const cycle=Math.floor((now-state.epoch)/cycleMs),phase=((now-state.epoch)%cycleMs+cycleMs)%cycleMs/1000;
  // Alternate special visits with the original routine, and rotate through the available venues.
  const visiting=phase>=76&&cycle>0&&cycle%2!==0&&!this.storm;
  const venues=visiting?state.decorations.filter(d=>socialKinds.has(d.catalog_id)&&decorSlots[d.slot]).sort((a,b)=>a.slot-b.slot):[];
  const venue=visiting?venues[Math.floor(cycle/2)%(venues.length+1)]:undefined;
  const social=visiting||phase>=80;
  const a=this.labib,b=this.mehezad;
  const visible=this.storm?[a]:this.actors;
  if(reduced)return visible.map(character=>{
   character.queue=[];character.job=null;character.route=[];character.goal='';
   const p=this.storm?iso(10,10):iso(character.person==='labib'?8.5:9.5,12.5);
   return {person:character.person,pose:this.storm?'sad':'idle',direction:'se',frame:0,...p,depth:p.y,hearts:state.rainbowMode&&!this.storm};
  });
  for(const character of visible){
   const job=character.job;
   if(job&&(now-job.time>45_000||!state.seeds.some(seed=>seed.id===job.seedId&&isActiveFlower(seed,now)))){
    character.job=null;character.goal='';character.holdUntil=0;
   }
   while(!character.job&&character.queue.length){
    const queued=character.queue.shift()!;
    if(now-queued.time<=30_000&&state.seeds.some(seed=>seed.id===queued.seedId&&isActiveFlower(seed,now))){
     character.job=queued;character.goal='';character.holdUntil=0;
    }
   }
  }
  this.updateSmoking(now,cycle,phase,this.storm||social||!!a.job||!!b.job);
  const scene=this.scene;
  const paired=(character:Actor):Activity=>{
   const labib=character===a,offset=labib?-.5:.5;
   if(visiting){
    const kind=venue?.catalog_id,bay=venue?decorSlots[venue.slot]:null;
    const seat=bay&&(kind==='garden-swing'||kind==='picnic-spot')?inverse(bay.x+offset*18,bay.y+(kind==='garden-swing'?4:5)):undefined;
    const target=bay?(seat?inverse(bay.x+offset*24,bay.y+24):
     {u:bay.u+offset,v:bay.v+decorationRadius(kind!)+.5}):{u:-2+offset,v:15.8};
    return {target,seat,goal:`visit-${cycle}-${venue?.slot??'main-pond'}`,rest:seat?'sit':'idle'};
   }
   const bench=inverse(this.bench.x,this.bench.y);
   return {target:{u:bench.u+offset,v:bench.v+1.5},
    seat:inverse(this.bench.x+(labib?-14:7),this.bench.y+(labib?-5:5)),goal:`bench-${cycle}`,rest:'sit'};
  };
  const jobActivity=(job:Job):Activity|null=>{
   const spot=spotById.get(job.spot);
   if(!spot)return null;
   const bay='pondSlot' in spot&&spot.pondSlot!==null?decorSlots[spot.pondSlot]:null;
   const target=bay?{u:bay.u,v:bay.v+1.5}:{u:spot.u,v:spot.v+('pondSlot' in spot?(spot.v<11.2?-1.8:1.8):1)};
   return {target,goal:job.key,rest:job.kind};
  };
  if(this.storm)this.walk(a,{target:{u:10,v:10},goal:'sad',rest:'sad'},seconds,now);
  else{
   const leadSegment=phase>=40?3+Math.floor((phase-40)/13):Math.floor(phase/13);
   const leadTarget=phase>=40?stroll[(leadSegment-3+Math.abs(cycle))%stroll.length]:
    wanderTargets[Math.abs(cycle)%2][leadSegment];
   const record=(p:Point)=>this.trail.add(p);
   const leadJob=b.job&&jobActivity(b.job);
   let leadMoved=0;
   if(leadJob)leadMoved=this.walk(b,leadJob,seconds,now,a.point,record);
   else if(scene?.kind==='caught'){
    if(scene.arrived===null)leadMoved=this.walk(b,{target:scene.approach,goal:'catch-labib',speed:52},seconds,now,a.point,record);
    else{b.pose='idle';b.direction=directionTo(b.point,a.point);}
   }else leadMoved=this.walk(b,social?paired(b):{target:leadTarget,goal:`explore-${cycle}-${leadSegment}-${phase>=40}`},seconds,now,a.point,record);
   if(leadMoved>.05)this.stoppedAt=0;
   else if(!this.stoppedAt)this.stoppedAt=now;

   const labibJob=a.job&&jobActivity(a.job);
   if(labibJob)this.walk(a,labibJob,seconds,now,b.point);
   else if(scene?.kind==='sneak-away')this.walk(a,{target:scene.spot,goal:'sneak-away',speed:38},seconds,now,b.point);
   else if(scene?.kind==='smoking'||scene?.kind==='caught'){
    a.pose='idle';a.route=[];a.goal=scene.kind;
    if(scene.kind==='caught')a.direction=directionTo(a.point,b.point);
   }else if(social)this.walk(a,paired(a),seconds,now,b.point);
   else if(phase<16&&scene?.kind!=='embarrassed'){
    this.walk(a,{target:quietSpots[hash(cycle)%quietSpots.length],goal:`solo-${cycle}`},seconds,now,b.point);
   }else{
    const stopTime=this.stoppedAt?now-this.stoppedAt:0;
    const nearMiss=leadSegment%3===1&&stopTime>200&&stopTime<1200;
    this.follow(seconds,now,scene?.kind==='embarrassed'||nearMiss?closeGap:normalGap);
    const together=a.pose==='idle'&&b.pose==='idle'&&distance(a.point,b.point)<33;
    if(together&&!b.job&&stopTime>350&&stopTime<2500)b.direction=directionTo(b.point,a.point);
   }
  }
  const idleHeart=!this.storm&&!scene&&!a.job&&!b.job&&a.pose==='idle'&&b.pose==='idle'&&
   distance(a.point,b.point)<34&&now-this.stoppedAt>600&&now-this.stoppedAt<1850&&Math.floor(phase/13)%3===2;
  return visible.map((character,index)=>{
   const p=iso(character.point.u,character.point.v);
   const bench=character.pose==='sit'&&character.goal.startsWith('bench-');
   const frame=character.pose==='walk'?Math.floor(now/150)%4:
    character.pose==='plant'||character.pose==='water'?Math.floor(now/280)%4:0;
   return {person:character.person,pose:character.pose,direction:character.direction,frame,...p,
    depth:bench?this.bench.y+1+index*.1:p.y,hearts:state.rainbowMode&&!this.storm,
    ...this.gesture(character.person,now),idleHeart:idleHeart&&index===0};
  });
 }
}
