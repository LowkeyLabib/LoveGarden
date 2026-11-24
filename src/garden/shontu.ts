import {iso,groundPoint,scenery} from './world.ts';
import type {Point,Person,Direction,Pose,WalkingMap} from './characters.ts';
import type {Moment} from './littleMoments.ts';

export const catRows=['cat-pet','cat-lift','cat-walk','cat-lap'] as const;
export type HumanCatPose=typeof catRows[number];
export type CatFrame={x:number;y:number;depth:number;direction:Direction;art:string;frame:number;lift:number;prey?:number;escape:number};
export const contacts=['pet','lift','carry','lap','cuddle','rub','couple'] as const;
export type Contact=typeof contacts[number];
type Activity='nap'|'wander'|'hunt'|'zoom'|'groom'|Contact;
type Actor={point:Point;person:Person;pose:Pose;direction:Direction};
type XY={x:number;y:number};
const screen=(p:Point)=>iso(p.u,p.v);
const offset=(p:Point,x:number,y:number)=>{const s=screen(p);return groundPoint(s.x+x,s.y+y);};
const gap=(a:XY,b:XY)=>Math.hypot(a.x-b.x,a.y-b.y);
const facing=(a:XY,b:XY):Direction=>b.x<a.x?(b.y<a.y?'nw':'sw'):(b.y<a.y?'ne':'se');
export const butterflies=scenery.filter(s=>s.name==='butterfly-small');
const shelters=scenery.filter(s=>['oak','willow','bench','bush','cherry'].includes(s.name));
const length:Record<Activity,[number,number]>={nap:[60,180],wander:[12,26],groom:[6,13],hunt:[8,14],zoom:[4,8],
 pet:[5,12],lift:[8,20],carry:[10,18],lap:[30,90],cuddle:[12,28],rub:[6,12],couple:[7,13]};
function route(map:WalkingMap,from:Point,to:Point){
 if(!map.canWalk(to))return null;
 if(map.canTravel(from,to))return [to];
 const path=map.path(from,to);
 return path&&map.canTravel(path.at(-1)??from,to)?[...path,to]:null;
}
function advance(actor:{point:Point;direction:Direction},path:Point[],budget:number,map:WalkingMap){
 while(path.length&&budget>0){
  const goal=path[0],a=screen(actor.point),b=screen(goal),d=gap(a,b);
  if(d<.05){path.shift();continue;}
  const step=Math.min(budget,d),p=groundPoint(a.x+(b.x-a.x)*step/d,a.y+(b.y-a.y)*step/d);
  if(!map.canTravel(actor.point,p)){path.length=0;return false;}
  actor.point=p;actor.direction=facing(a,b);
  if(step<d)break;
  path.shift();budget-=step;
 }
 return true;
}
export class Shontu{
 point:Point={u:5.5,v:7.5};direction:Direction='se';
 activity:Activity='nap';art='belly';lift=0;
 private until=0;private started=0;private approach=false;private duration=0;private seed=0;
 private path:Point[]=[];private walks=new Map<Person,Point[]>();private nextWalk=0;
 private cooldown=new Map<Activity,number>();private host:Person='labib';private annoyed=false;
 private releaseHeight=0;private releaseAt=0;
 private prey=-1;private joinAt=0;private nextJoin=0;private lastMoment:Moment|undefined;
 readonly humans=new Map<Person,HumanCatPose>();
 participates(person:Person){return this.walks.has(person);}
 get reserved(){return this.walks.size>0;}
 private roll(){this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0;return this.seed/4294967296;}
 cancel(){this.releaseHeight=0;this.until=0;this.lift=0;this.path=[];this.walks.clear();this.humans.clear();this.prey=-1;this.nextJoin=0;this.joinAt=0;this.lastMoment=undefined;this.activity='nap';this.art='loaf';}
 private roam(map:WalkingMap,actors:Actor[],fast=false){
  const p=screen(this.point);
  const nearby=shelters.filter(s=>gap(p,s)<145);
  const hide=nearby[Math.floor(this.roll()*nearby.length)],friend=actors[Math.floor(this.roll()*actors.length)];
  const center=!fast&&this.roll()<.3?screen(friend.point):!fast&&hide?hide:p;
  for(let i=0;i<5;i++){
   const theta=this.roll()*Math.PI*2,r=fast?55:22+i*3;
   const path=route(map,this.point,groundPoint(center.x+Math.cos(theta)*r,center.y+Math.sin(theta)*r*.6));
   if(path)return path;
  }
  return [];
 }
 // Common entry point for the scheduler and isolated simulation fixtures.
 begin(kind:Activity,now:number,map:WalkingMap,actors:Actor[],host:Person){
  if(this.reserved)return false;
  const owner=actors.find(a=>a.person===host)!;
  const contact=contacts.some(k=>k===kind);
  const walks=new Map<Person,Point[]>();let prey=-1,path:Point[]=[];
  if(kind==='lap'||kind==='cuddle'){
   // The person settles where they are and Shontu comes to them.
   const to=offset(owner.point,12,2),r=route(map,this.point,to);
   if(!r||gap(screen(owner.point),screen(this.point))>190)return false;
   path=r;walks.set(host,[]);
  }else if(contact){
   for(const a of actors.filter(a=>a===owner||kind==='couple')){
    const to=offset(this.point,a===owner?-12:13,-2);
    const r=route(map,a.point,to);
    if(!r||gap(screen(a.point),screen(to))>210)return false;
    walks.set(a.person,r);
   }
  }else if(kind==='hunt'){
   prey=butterflies.findIndex(b=>gap(screen(this.point),b)<115);
   if(prey<0)return false;
   const b=butterflies[prey],r=route(map,this.point,groundPoint(b.x-5,b.y+3));
   if(!r)return false;path=r;
  }else if(kind==='wander'||kind==='zoom')path=this.roam(map,actors,kind==='zoom');
  this.humans.clear();this.walks=walks;this.path=path;this.host=host;this.prey=prey;
  this.activity=kind;this.approach=contact;this.started=now;this.nextWalk=now;
  const [lo,hi]=length[kind];this.duration=(lo+(hi-lo)*this.roll())*1000;
  if(kind==='nap'&&this.roll()<.08)this.duration+=45000;
  this.annoyed=contact&&this.roll()<.12;
  this.until=now+(contact?15000:this.duration);this.cooldown.set(kind,now+this.duration+(kind==='zoom'?150000:15000));
  this.art=kind==='rub'?'belly':contact?'loaf':kind==='hunt'?'alert':kind==='nap'?'belly':'sit';
  return true;
 }
 step(now:number,dt:number,map:WalkingMap,actors:Actor[],available:boolean,night:boolean,moment?:Moment,rests:XY[]=[]){
  if(this.reserved&&!available){
   const height=this.lift;this.cancel();
   // A human job releases its reservation immediately. Finish lowering the
   // cat at the last walkable carrier position on the cosmetic timeline.
   this.releaseHeight=height;this.releaseAt=now;
  }
  if(!this.until){this.seed=Math.floor(now/80)>>>0;this.begin('nap',now,map,actors,'labib');}
  if(this.releaseHeight>0){
   this.lift=this.releaseHeight*Math.max(0,1-(now-this.releaseAt)/600);
   if(this.lift>0){this.art='carry';return;}
   this.releaseHeight=0;
  }
  if(now>=this.until){
   const leave=this.reserved&&this.annoyed;
   const previous=this.activity;this.cancel();
   // Draw rates are time-share targets divided by typical bout length.
   const choices:[Activity,number][]=[['nap',(night?.67:.60)/120],['wander',.15/19],['groom',.05/9],['hunt',.13/11],['zoom',.02/6]];
   if(available)for(const k of contacts)choices.push([k,.1/(contacts.length*(length[k][0]+length[k][1])*.5)]);
   const pool=(leave?choices.filter(([k])=>k==='wander'):choices).filter(([k])=>k!==previous&&now>=(this.cooldown.get(k)??0));
   while(pool.length){
    let ticket=this.roll()*pool.reduce((s,c)=>s+c[1],0);
    const i=Math.max(0,pool.findIndex(([,w])=>(ticket-=w)<=0)),[kind]=pool.splice(i,1)[0];
    if(this.begin(kind,now,map,actors,this.roll()<.5?'labib':'mehezad'))break;
   }
   if(!this.until)this.begin('nap',now,map,actors,'labib');
   if(this.activity==='wander'&&rests.length&&this.roll()<.5){
    const s=rests[Math.floor(this.roll()*rests.length)];
    this.path=route(map,this.point,groundPoint(s.x+18,s.y+14))??this.path;
   }
  }
  if(moment!==this.lastMoment){
   const afterHug=this.lastMoment==='hug'&&!moment;
   this.lastMoment=moment;
   if((moment||afterHug)&&now>=this.nextJoin&&!this.reserved&&this.roll()<.34){
    this.joinAt=now+14000;this.nextWalk=now;this.nextJoin=now+60000;
   }
  }
  if(now<this.joinAt&&!this.reserved){
   if(now>=this.nextWalk){
    const a=screen(actors[0].point),b=screen(actors[1].point);
    const to=groundPoint((a.x+b.x)/2+(moment==='hands'?-18:0),(a.y+b.y)/2+14);
    this.path=[];
    for(const [dx,dy] of [[0,0],[-14,-8],[14,-8],[0,-28],[-24,4],[24,4]]){
     const r=route(map,this.point,offset(to,dx,dy));
     if(r){this.path=r;break;}
    }
    this.nextWalk=now+2200;
   }
   advance(this,this.path,dt*22,map);this.art=this.path.length?'walk':moment==='stars'?'side':moment==='cuddle'?'curl':moment==='dance'?'sit':'loaf';
   return;
  }
  if(this.approach&&this.reserved){
   for(const a of actors){
    const r=this.walks.get(a.person);if(!r)continue;
    if(!advance(a,r,dt*32,map)){this.cancel();return;}
    a.pose=r.length?'walk':'idle';
   }
   if(this.activity==='lap'||this.activity==='cuddle'){
    this.humans.set(this.host,'cat-lap');this.art=this.path.length?'walk':'loaf';
    if(!advance(this,this.path,dt*24,map)){this.cancel();return;}
    if(this.path.length)return;
   }
   if([...this.walks.values()].some(r=>r.length))return;
   this.approach=false;this.started=now;this.until=now+this.duration;
  }
  const t=(now-this.started)/1000,remaining=(this.until-now)/1000,k=this.activity;
  if(this.reserved){
   const carrier=actors.find(a=>a.person===this.host)!;
   const holding=k==='lift'||k==='carry'||k==='lap';
   if(this.annoyed&&t>4){this.until=Math.min(this.until,now+1200);this.art='squirm';}
   const left=(this.until-now)/1000;
   this.lift=holding?Math.max(0,Math.min(1,t/1.2,left/1.2))*(k==='lap'?9:16):0;
   for(const a of actors.filter(a=>this.walks.has(a.person))){
    a.direction=a===carrier?'se':'sw';a.pose='idle';
    this.humans.set(a.person,k==='lap'||k==='cuddle'?'cat-lap':holding?'cat-lift':'cat-pet');
   }
   if(k==='carry'&&t>1.3&&left>1.4&&!this.annoyed){
    if(now>=this.nextWalk){this.path=this.roam(map,[carrier],true).map(p=>offset(p,-12,-2));this.nextWalk=now+4500;}
    const target=this.path[0];
    if(target&&map.canTravel(this.point,offset(target,12,2))&&map.canTravel(carrier.point,target)){
     advance(carrier,this.path,dt*17,map);this.point=offset(carrier.point,12,2);
     carrier.direction=carrier.direction.startsWith('n')?'ne':'se';
     carrier.pose='walk';this.humans.set(carrier.person,'cat-walk');
    }
   }
   this.direction=carrier.direction;
   this.art=this.annoyed&&t>4?'squirm':k==='rub'?'rub':holding?(k==='lap'?'lap':'carry'):k==='cuddle'?'curl':'pet';
   return;
  }
  if(k==='nap'){
   const phase=Math.floor(t/39)%4;this.art=remaining<1.8?'stretch':['belly','curl','side','loaf'][phase];
  }else if(k==='wander'||k==='zoom'){
   if(remaining<1.2){this.art='flop';return;}
   if(now>=this.nextWalk&&!this.path.length){this.path=this.roam(map,actors,k==='zoom');this.nextWalk=now+3500;}
   const paused=k==='wander'&&t%7>5.6;
   this.art=paused?'sit':k==='zoom'?'run':'walk';if(!paused)advance(this,this.path,dt*(k==='zoom'?64:12),map);
  }else if(k==='hunt'){
   this.art=t<1?'alert':t<3?'stalk':t<4?'wiggle':t<5?'pounce':remaining<2?'confused':'run';
   if(t>=1&&(t<3||t>=4))advance(this,this.path,dt*(t<3?9:49),map);
   if(t>5&&!this.path.length)this.art='confused';
  }else this.art=t<1.5?'yawn':t<3?'stretch':Math.floor(t/2)%2?'wash':'groom';
 }
 frame(now:number,still=false):CatFrame{
  const p=screen(this.point),art=still?'loaf':this.art;
  const interval=art==='run'?95:art==='walk'?190:['belly','curl','side','loaf','lap'].includes(art)?800:260;
  const elapsed=Math.max(0,now-this.started);
  return {...p,art,lift:still?0:this.lift,depth:p.y+0.2,direction:this.direction,
   frame:still?0:art==='flop'?Math.min(3,Math.max(0,Math.floor((1200-(this.until-now))/300))):Math.floor(elapsed/interval)%4,
   prey:this.prey<0?undefined:this.prey,escape:this.prey<0?0:Math.max(0,Math.sin(Math.PI*Math.min(1,Math.max(0,(elapsed-3800)/4000))))};
 }
}
