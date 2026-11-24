import test from 'node:test';
import assert from 'node:assert/strict';
import {Shontu,contacts} from '../src/garden/shontu.ts';
import {WalkingMap} from '../src/garden/characters.ts';
import {iso,groundPoint} from '../src/garden/world.ts';
import sharp from 'sharp';
const map=new WalkingMap([]),start=1730000000000;
function actors(){return [{person:'labib',point:{u:5.5,v:6.5}},{person:'mehezad',point:{u:5.5,v:8.5}}];}
for(const host of ['labib','mehezad'])for(const kind of contacts)test(host+' and Shontu: '+kind,()=>{
 const c=new Shontu(),pair=actors(),owner=pair.find(a=>a.person===host);
 assert.ok(c.begin(kind,start,map,pair,host));assert.equal(c.begin('wander',start,map,pair,host),false);
 let contact=false,raised=false,moved=false,prior,high=0;
 for(let t=0;t<120000;t+=80){
  c.step(start+t,.08,map,pair,true,false);
  if(!c.reserved)break;
  const f=c.frame(start+t);
  contact ||= c.humans.has(host);raised ||= f.lift>5;high=Math.max(high,f.lift);
  assert.ok(map.canWalk(c.point));
  if(kind==='carry'&&owner.pose==='walk'&&c.humans.get(host)==='cat-walk'){
   const p=iso(owner.point.u,owner.point.v);
   assert.ok(Math.abs(f.x-p.x-12)<.001&&Math.abs(f.y-p.y-2)<.001);moved=true;
  }
  if(prior)assert.ok(Math.hypot(f.x-prior.x,f.y-prior.y)<5);
  prior=f;
 }
 assert.ok(contact);assert.equal(c.reserved,false);
 if(['lift','carry','lap'].includes(kind)){assert.ok(raised);assert.ok(prior.lift<2);}
 if(kind==='carry')assert.ok(moved);
 assert.equal(c.humans.size,0);
});
test('interruption releases both participants and the cat stays grounded',()=>{
 const c=new Shontu(),pair=actors();assert.ok(c.begin('couple',start,map,pair,'mehezad'));
 c.step(start+80,.08,map,pair,false,false,'stars');assert.equal(c.reserved,false);assert.equal(c.frame(start+80).lift,0);
 c.cancel();assert.equal(c.frame(start,true).art,'loaf');
});
test('sleep dominates unforced activity and hunting is local and harmless',()=>{
 const c=new Shontu(),pair=actors(),seen=new Set();let nap=0;
 for(let t=0;t<7200000;t+=160){c.step(start+t,.16,map,pair,true,t%1200000>=600000);seen.add(c.activity);nap+=Number(c.activity==='nap');}
 assert.ok(nap/45000>.48&&nap/45000<.76,nap/45000);
 for(const k of ['wander','groom','zoom','hunt','nap'])assert.ok(seen.has(k));
 const hunter=new Shontu();hunter.point=groundPoint(700,300);assert.equal(hunter.begin('hunt',start,map,pair,'labib'),false);
 hunter.point={u:5.5,v:7.5};assert.ok(hunter.begin('hunt',start,map,pair,'labib'));
 const poses=new Set();let escapes=false;
 for(let t=0;t<8000;t+=80){hunter.step(start+t,.08,map,pair,true,false);poses.add(hunter.art);escapes ||= hunter.frame(start+t).escape>0;}
 for(const k of ['alert','stalk','wiggle','pounce'])assert.ok(poses.has(k));
 assert.ok(escapes);
});
test('every Compact animation has opaque artwork and unobstructed frame margins',async()=>{
 const {info,data}=await sharp('public/art/shontu.png').ensureAlpha().raw().toBuffer({resolveWithObject:true});
 for(let y=0;y<info.height;y+=56)for(let x=0;x<info.width;x+=48){
  let solid=0;
  for(let j=0;j<56;j++)for(let i=0;i<48;i++)if(data[((y+j)*info.width+x+i)*4+3]===255){solid++;assert.ok(i>0&&i<47&&j>0&&j<55);}
  assert.ok(solid>230);
 }
});
test('a job can interrupt a carry and Shontu settles on safe ground',()=>{
 const c=new Shontu(),pair=actors();assert.ok(c.begin('carry',start,map,pair,'labib'));
 let t=0;
 for(;t<15000;t+=80){c.step(start+t,.08,map,pair,true,false);if(c.lift>10)break;}
 assert.ok(c.lift>10);
 const before=c.frame(start+t);
 c.step(start+t+80,.08,map,pair,false,false);
 assert.equal(c.reserved,false);assert.equal(c.frame(start+t+80).lift,before.lift);
 c.step(start+t+800,.08,map,pair,false,false);assert.equal(c.lift,0);assert.ok(map.canWalk(c.point));
});
test('joining a Little Moment never takes control of either person',()=>{
 for(const moment of ['stars','shoulder','cuddle','hands','dance','hug']){
  let joined=false;
  for(let n=0;n<24&&!joined;n++){
   const c=new Shontu(),pair=actors(),snapshot=JSON.stringify(pair),now=start+n*80000;
   c.step(now,0,map,pair,true,false);
   const at=iso(c.point.u,c.point.v);
   for(let t=80;t<8000;t+=80){
    c.step(now+t,.08,map,pair,false,true,moment==='hug'&&t>160?undefined:moment);
    const f=c.frame(now+t);joined ||= Math.hypot(f.x-at.x,f.y-at.y)>2;
    assert.equal(c.reserved,false);
   }
   assert.equal(JSON.stringify(pair),snapshot);
  }
  assert.ok(joined,moment);
 }
});
