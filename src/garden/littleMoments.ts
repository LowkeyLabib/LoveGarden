import {catRows} from './shontu.ts';
import {groundPoint,iso,scenery} from './world.ts';
import type {CharacterPose,Person,Point,WalkingMap} from './characters.ts';

export const activities={
 hands:[15,30,9,100], hug:[4,7,7,140], shoulder:[20,35,4,240], stars:[25,40,4,290],
 flower:[6,10,4,200], chase:[8,15,6,150], hair:[4,6,3,210], dance:[20,35,2,300],
 cuddle:[25,45,2,320], kiss:[3,5,1,420],
} as const; // Minimum/maximum duration, selection weight, individual cooldown (seconds).
export type Moment=keyof typeof activities;
export type MomentPose={kind:Moment;elapsed:number;duration:number;initiator:Person};
export const momentRows=['hands','hug','shoulder','stars','flower','chase','hair','dance','cuddle','kiss','receive-kiss',...catRows] as const;
export const momentRow=(m:MomentPose,person:Person)=>m.kind==='kiss'&&m.initiator!==person?'receive-kiss':m.kind;
export function momentFrame(m:MomentPose){
 const {kind,elapsed:t,duration:d}=m;
 if(t<320||d-t<320)return 0;
 if(kind==='hands'||kind==='chase')return Math.floor(t/(kind==='hands'?165:111))%4;
 if(t<480||d-t<480)return 0;
 if(kind==='flower'||kind==='kiss'||kind==='hair')return Math.min(3,Math.floor(t*4/d));
 return 1+Math.floor(t/(kind==='dance'?490:1050))%3;
}
type XY={x:number;y:number};
type Pair<T>=[T,T];
type Mover={point:Point;direction:CharacterPose['direction'];pose:CharacterPose['pose']};
const screen=(p:Point)=>iso(p.u,p.v);
const gap=(a:XY,b:XY)=>Math.hypot(a.x-b.x,a.y-b.y);
const distance=(a:Point,b:Point)=>gap(screen(a),screen(b));
const ground=(p:XY)=>groundPoint(p.x,p.y);
const shift=(p:XY,x:number,y:number)=>({x:p.x+x,y:p.y+y});
const toward=(a:XY,b:XY):CharacterPose['direction']=>(b.y<a.y?'n':'s')+(b.x<a.x?'w':'e') as CharacterPose['direction'];
const trees=scenery.filter(s=>['oak','willow','cherry'].includes(s.name));
const lawns=[[-3,3],[7,18.5],[12,15],[21,6],[10,-4],[2,21],[-4,17],[16,11.8],[5,8.5]].map(([u,v])=>iso(u,v));
function random(seed:number){
 let value=seed|0;
 return ()=>{value=(Math.imul(value,1664525)+1013904223)|0;return (value>>>0)/4294967296;};
}
export function selectMoment(now:number,night:boolean,last:Moment|null,cooldowns:ReadonlyMap<Moment,number>,roll:number){
 const choices=(Object.keys(activities) as Moment[]).filter(k=>k!==last&&(k!=='stars'||night)&&now>=(cooldowns.get(k)??0));
 const weight=(k:Moment)=>activities[k][2]*(night&&(k==='dance'||k==='cuddle')?2:1);
 let ticket=roll*choices.reduce((sum,k)=>sum+weight(k),0);
 return choices.find(k=>(ticket-=weight(k))<0);
}
function movingTargets(kind:Moment,c:XY,t:number,duration:number):Pair<Point>{
 const phase=t*(kind==='chase'?.00165:.0011),lead=kind==='chase'?.8*(1-t/duration):0;
 const path=(a:number)=>shift(c,29*Math.sin(a),13*Math.cos(a));
 if(kind==='chase'){
  const a=path(phase-lead-1.16),b=path(phase);
  return [ground(a),ground(b)];
 }
 return [ground(shift(path(phase),-10,0)),ground(shift(path(phase),10,1))];
}
type Site={center:XY;points:Pair<Point>;routes:Pair<Point[]>;bench:boolean};
function makeSite(kind:Moment,actors:Pair<Mover>,map:WalkingMap,bench:XY,leader:Person,duration:number):Site|null{
 const origin=screen(actors[leader==='labib'?0:1].point);
 const seated=kind==='shoulder',moving=kind==='chase'||kind==='hands';
 const outside=kind==='stars'||kind==='dance'||moving;
 const centers=seated?[bench]:kind==='cuddle'?trees.map(t=>shift(t,18,13)):
  outside?[...lawns]:[screen(actors[leader==='labib'?1:0].point),...lawns];
 if(outside||kind==='cuddle')centers.sort((a,b)=>gap(a,origin)-gap(b,origin));
 for(const c of centers){
  const space=kind==='hug'||kind==='kiss'||kind==='cuddle'?17:kind==='flower'?25:kind==='hair'?21:18;
  const points:Pair<Point>=moving?movingTargets(kind,c,0,duration):kind==='stars'?
   [ground(shift(c,-3,-7)),ground(shift(c,3,7))]:
   [ground(shift(c,-space/2,seated?-2:-1)),ground(shift(c,space/2,1))];
  if(!seated&&!points.every(p=>map.canWalk(p)))continue;
  if(kind==='stars'||kind==='dance'){
   if(![[-21,0],[21,0],[0,-10],[0,10]].every(([x,y])=>map.canWalk(ground(shift(c,x,y)))))continue;
  }
  if(moving){
   let clear=true;
   for(let t=0;t<duration&&clear;t+=100){
    const pair=movingTargets(kind,c,t,duration);
    clear=pair.every(p=>map.canWalk(p));
   }
   if(!clear)continue;
  }
  const routes:Pair<Point[]>=[[],[]];
  let reachable=true;
  for(const i of [0,1] as const){
   const dest=points[i],entry=seated?ground(shift(screen(dest),-12,16)):dest;
   const route=map.path(actors[i].point,entry);
   if(!route||!map.canTravel(route.at(-1)??actors[i].point,entry)){reachable=false;break;}
   routes[i]=[...route,entry,...(seated?[dest]:[])];
  }
  if(reachable)return {center:c,points,routes,bench:seated};
 }
 return null;
}
function approach(actor:Mover,route:Point[],budget:number,other:Mover,map:WalkingMap,seated:boolean){
 actor.pose='idle';
 while(route.length){
  const a=screen(actor.point),neighbor=screen(other.point);
  // Skip grid corners when a clear final approach goes round a seated partner.
  if(route.length>1&&gap(a,neighbor)<48){
   const goal=route[route.length-1],end=screen(goal);
   const dx=end.x-a.x,dy=end.y-a.y;
   const f=Math.max(0,Math.min(1,((neighbor.x-a.x)*dx+(neighbor.y-a.y)*dy)/(dx*dx+dy*dy||1)));
   if(gap(shift(a,dx*f,dy*f),neighbor)>=10&&map.canTravel(actor.point,goal))route.splice(0,route.length-1);
  }
  const dest=route[0],b=screen(dest),length=gap(a,b);
  if(length<.01){route.shift();continue;}
  if(budget<=0)break;
  const t=Math.min(1,budget/length),p={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};
  if(gap(p,neighbor)<10&&gap(p,neighbor)<gap(a,neighbor)){
   const goal=screen(route[route.length-1]),angle=Math.atan2(a.y-neighbor.y,a.x-neighbor.x);
   const delta=Math.min(.38,budget/11);
   const options=[angle+delta,angle-delta].map(theta=>shift(neighbor,Math.cos(theta)*10.8,Math.sin(theta)*10.8))
    .filter(q=>gap(a,q)<=budget+.1&&map.canTravel(actor.point,ground(q))).sort((l,r)=>gap(l,goal)-gap(r,goal));
   if(options.length){actor.point=ground(options[0]);actor.direction=toward(a,options[0]);actor.pose='walk';}
   return;
  }
  if(!seated&&map.canWalk(actor.point)&&!map.canTravel(actor.point,ground(p)))return;
  actor.point=ground(p);actor.pose='walk';actor.direction=toward(a,b);
  if(t<1)return;
  route.shift();budget-=length;
 }
}

type Session={kind:Moment;initiator:Person;duration:number;site:Site;deadline:number;started:number|null;hugAfter:boolean};
/** Cosmetic state only. Routes and timing are local, keyed to the existing garden clock. */
export class LittleMoments{
 private session:Session|null=null;
 private next=0;
 private last:Moment|null=null;
 private cooldowns=new Map<Moment,number>();
 get active(){return this.session!==null;}
 private schedule(now:number){this.next=now+45000+random(Math.floor(now/80))()*75000;}
 cancel(now:number){this.session=null;this.schedule(now);}
 begin(kind:Moment,now:number,night:boolean,actors:Pair<Mover>,map:WalkingMap,bench:XY,roll:()=>number){
  if(this.active||kind==='stars'&&!night)return false;
  const [min,max]=activities[kind],duration=(min+(max-min)*roll())*1000;
  const initiator=kind==='flower'||kind==='hair'?'labib':roll()<.5?'labib':'mehezad';
  const site=makeSite(kind,actors,map,bench,initiator,duration);
  if(!site)return false;
  this.session={kind,initiator,duration,site,deadline:now+20000,started:null,hugAfter:kind==='chase'&&roll()<.3};
  return true;
 }
 step(now:number,dt:number,night:boolean,eligible:boolean,actors:Pair<Mover>,map:WalkingMap,bench:XY){
  if(!this.next)this.next=now+80000+random(Math.floor(now/80))()*40000;
  if(!this.session&&eligible&&now>=this.next){
   this.schedule(now);
   const roll=random(Math.floor(now/80)),kind=selectMoment(now,night,this.last,this.cooldowns,roll());
   if(kind)this.begin(kind,now,night,actors,map,bench,roll);
  }
  const s=this.session;if(!s)return null;
  if(s.kind==='stars'&&!night||s.started===null&&now>s.deadline){this.cancel(now);return null;}
  if(s.started===null){
   for(const i of [0,1] as const)approach(actors[i],s.site.routes[i],dt*38,actors[1-i],map,s.site.bench);
   if(s.site.routes.some(r=>r.length))return {bench:false};
   s.started=now;
  }
  const elapsed=now-s.started;
  if(elapsed>=s.duration){
   this.last=s.kind;this.cooldowns.set(s.kind,now+activities[s.kind][3]*1000);
   if(s.hugAfter&&now>=(this.cooldowns.get('hug')??0)&&distance(actors[0].point,actors[1].point)<32){
    const site=makeSite('hug',actors,map,bench,s.initiator,4300);
    if(!site){this.cancel(now);return null;}
    s.site=site;s.deadline=now+6000;
    s.kind='hug';s.hugAfter=false;s.duration=4300;s.started=null;
    return {bench:false};
   }
   this.cancel(now);return null;
  }
  if(s.kind==='dance'){
   const beat=elapsed*.0009,turn=Math.sin(beat),angle=turn*1.08;
   for(const i of [0,1] as const){
    const side=i===0?-1:1,p=ground(shift(s.site.center,side*9*Math.cos(angle),side*(1+7*Math.sin(angle))));
    if(!map.canTravel(actors[i].point,p)){this.cancel(now);return null;}
    actors[i].point=p;actors[i].pose='walk';
    actors[i].direction=toward(screen(p),s.site.center);
   }
  }else if(s.kind==='hands'||s.kind==='chase'){
   const targets=movingTargets(s.kind,s.site.center,elapsed,s.duration);
   const next=movingTargets(s.kind,s.site.center,Math.min(elapsed+80,s.duration),s.duration);
   for(const i of [0,1] as const){
    if(!map.canTravel(actors[i].point,targets[i])){this.cancel(now);return null;}
    actors[i].point=targets[i];actors[i].direction=toward(screen(targets[i]),screen(next[i]));actors[i].pose='walk';
   }
  }else{
   for(const i of [0,1] as const){
    actors[i].pose=s.site.bench||s.kind==='cuddle'?'sit':'idle';
    actors[i].direction=s.kind==='stars'?'se':i===0?'se':'sw';
   }
  }
  const moment:MomentPose={kind:s.kind,elapsed,duration:s.duration,initiator:s.initiator};
  return {moment,bench:s.site.bench};
 }
}
