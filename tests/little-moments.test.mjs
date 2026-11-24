import test from 'node:test';
import assert from 'node:assert/strict';
import {activities,LittleMoments,selectMoment,momentRows} from '../src/garden/littleMoments.ts';
import {WalkingMap} from '../src/garden/characters.ts';
import {iso,scenery} from '../src/garden/world.ts';
import {momentCell,momentEffects} from '../src/garden/momentArt.ts';
import sharp from 'sharp';
import {readFile} from 'node:fs/promises';

const bench=scenery.find(s=>s.name==='bench');
const actors=()=>[{point:{u:5.5,v:6.5},direction:'se',pose:'idle'},{point:{u:17,v:9.5},direction:'sw',pose:'idle'}];
const position=a=>iso(a.point.u,a.point.v);
for(const kind of Object.keys(activities))test('coordinated activity: '+kind,()=>{
 const pair=actors(),map=new WalkingMap([]),c=new LittleMoments();
 assert.ok(c.begin(kind,1000,true,pair,map,bench,()=>.47),'reachable site');
 assert.equal(c.begin('hug',1000,true,pair,map,bench,()=>0),false);
 let started=0,frames=new Set();
 for(let t=1000;t<70000;t+=80){
  const before=pair.map(position),s=c.step(t,.08,true,false,pair,map,bench);
  for(const [i,a] of pair.entries()){
   const p=position(a);assert.ok(Math.hypot(p.x-before[i].x,p.y-before[i].y)<5,'continuous path');
  }
  if(s?.moment){
   started||=t;
   for(const [i,a] of pair.entries())frames.add(momentCell(s.moment,i?'mehezad':'labib',a.direction).column%4);
  }
  if(!c.active){assert.ok(started,'approach completed');assert.ok(t-started>=activities[kind][0]*1000);break;}
 }
 assert.equal(c.active,false);assert.ok(frames.size>=3);
});
test('eligibility, weights, cooldowns, dawn and interrupted approaches',()=>{
 const keys=Object.keys(activities),counts={};
 for(let i=0;i<1000;i++){const k=selectMoment(1000,false,'hair',new Map([['cuddle',2000]]),(i+.5)/1000);counts[k]=(counts[k]??0)+1;}
 assert.ok(!counts.stars&&!counts.hair&&!counts.cuddle&&counts.hands>counts.kiss*6);
 assert.equal(selectMoment(1000,true,null,new Map(keys.map(k=>[k,2000])),0),undefined);
 const c=new LittleMoments(),p=actors(),map=new WalkingMap([]);
 assert.equal(c.begin('stars',1000,false,p,map,bench,()=>.3),false);
 assert.ok(c.begin('stars',1000,true,p,map,bench,()=>.3));
 assert.equal(c.step(1080,.08,false,true,p,map,bench),null);
 assert.ok(c.begin('hair',2000,false,p,map,bench,()=>0));
 assert.equal(c.step(24000,0,false,false,p,map,bench),null);
 assert.equal(c.step(24100,.1,false,true,p,map,bench),null);
});
test('all wardrobe layers contain art in every moment, direction and phase',async()=>{
 const {styles}=JSON.parse(await readFile('src/garden/fashion.json','utf8'));
 for(const ref of ['labib','mehezad',...styles]){
  const file=ref.replace('fashion/','').replace('/','-');
  const {data,info}=await sharp('public/art/moments/'+file+'.png').ensureAlpha().raw().toBuffer({resolveWithObject:true});
  assert.deepEqual([info.width,info.height],[768,momentRows.length*56]);
  for(let r=0;r<momentRows.length;r++)for(let col=0;col<16;col++){
   let solid=0;
   for(let y=r*56;y<(r+1)*56;y++)for(let x=col*48;x<(col+1)*48;x++)solid+=Number(data[(y*768+x)*4+3]===255);
   assert.ok(solid>32,ref+' '+momentRows[r]);
  }
 }
 for(const kind of Object.keys(activities)){
  let count=0;momentEffects({kind,elapsed:18000,duration:30000,initiator:'labib'},'labib',()=>count++);assert.ok(count<=20);
 }
});

test('unforced garden time produces all ten moments and leaves ordinary behavior dominant',()=>{
 const director=new LittleMoments(),pair=actors(),map=new WalkingMap([]);
 const seen=new Set(),start=Date.UTC(2025,0,1),view=3*3600000;
 let interacting=0;
 for(let t=0;t<view;t+=160){
  const night=t%1200000>=600000;
  const activity=director.step(start+t,.16,night,true,pair,map,bench)?.moment;
  if(!activity)continue;
  assert.ok(night||activity.kind!=='stars');
  seen.add(activity.kind);interacting+=160;
 }
 assert.equal(seen.size,Object.keys(activities).length);
 assert.ok(interacting/view<.35);
});
