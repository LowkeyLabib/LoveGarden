// Vite development fixture only. No application, authentication or database client is imported.
import {LittleMoments,activities,type Moment,type MomentPose} from '../../src/garden/littleMoments.ts';
import {momentCell,momentEffects,momentTexture} from '../../src/garden/momentArt.ts';
import {WalkingMap,type Direction,type Person} from '../../src/garden/characters.ts';
import {iso,scenery,gardenBounds} from '../../src/garden/world.ts';
import atlas from '../../src/garden/atlas.json';
const params=new URLSearchParams(location.search);
const images=new Map<string,Promise<HTMLImageElement>>();
function image(url:string){
 if(!images.has(url))images.set(url,new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src=url;}));
 return images.get(url)!;
}
const ground=await image('/art/phaser-meadow.png'),objects=await image('/art/phaser-objects.png'),canopies=await image('/art/phaser-canopies.png');
const trees=['oak','cherry','pine','willow'];
const night=params.get('light')!=='day',bench=scenery.find(s=>s.name==='bench')!;
const people:Person[]=['labib','mehezad'];
type Entry={x:number;y:number;depth:number;person:Person;direction:Direction};
for(const [i,kind] of (Object.keys(activities) as Moment[]).entries()){
 if(params.has('activity')&&params.get('activity')!==kind)continue;
 const p=[{point:{u:5.5,v:6.5},direction:'se',pose:'idle'},{point:{u:17,v:9.5},direction:'sw',pose:'idle'}] as const;
 const actors:[typeof p[0]|typeof p[1],typeof p[0]|typeof p[1]]=[p[0],p[1]];
 const map=new WalkingMap([]),ctrl=new LittleMoments();
 if(!ctrl.begin(kind,1000,night,actors,map,bench,()=>.47))continue;
 const outfit=params.get('outfit')??['default','matching-pajamas','desi-jamdani-sharee-premium-panjabi','solo'][i%4];
 const sprites=await Promise.all(people.map(async person=>{
  const style=outfit==='solo'?(person==='mehezad'?'pink-summer-dress':null):outfit==='default'?null:outfit;
  return [await image(momentTexture(person)),...(style?[await image(momentTexture('fashion/'+person+'/'+style))]:[])];
 }));
 const figure=document.createElement('figure'),canvas=document.createElement('canvas'),label=document.createElement('figcaption');
 canvas.width=330;canvas.height=90;label.textContent=kind+' · '+outfit;figure.append(canvas,label);document.querySelector('main')!.append(figure);
 const ctx=canvas.getContext('2d')!;ctx.imageSmoothingEnabled=false;
 function paint(index:number,m:MomentPose,entries:Entry[]){
  const w=110,h=90;
  const x=Math.round((entries[0].x+entries[1].x)/2-w/2),y=Math.round((entries[0].y+entries[1].y)/2-63);
  ctx.save();ctx.beginPath();ctx.rect(index*w,0,w,h);ctx.clip();ctx.translate(index*w-x,-y);
  ctx.drawImage(ground,gardenBounds.x,gardenBounds.y);
  const draws:{z:number;draw:()=>void}[]=[];
  for(const s of scenery){
   if(Math.abs(s.x-x-w/2)>120||Math.abs(s.y-y-h/2)>140)continue;
   const f=atlas.frames[s.name as keyof typeof atlas.frames],tree=trees.indexOf(s.name);
   draws.push({z:s.y,draw:()=>ctx.drawImage(tree<0?objects:canopies,tree<0?f.x:tree*72,tree<0?f.y:0,f.w,f.h,s.x-f.anchorX,s.y-f.anchorY,f.w,f.h)});
  }
  for(const [n,a] of entries.entries())draws.push({z:a.depth,draw:()=>{
   const {column,row}=momentCell(m,a.person,a.direction);
   for(const sheet of sprites[n])ctx.drawImage(sheet,column*48,row*56,48,56,Math.round(a.x)-24,Math.round(a.y)-49,48,56);
   momentEffects(m,a.person,(dx,dy,w,h,color,alpha)=>{ctx.globalAlpha=alpha;ctx.fillStyle='#'+color.toString(16).padStart(6,'0');ctx.fillRect(Math.round(a.x)+dx,Math.round(a.y)+dy,w,h);ctx.globalAlpha=1;});
  }});
  draws.sort((a,b)=>a.z-b.z).forEach(item=>item.draw());
  if(night&&(kind==='stars'||kind==='dance'||kind==='cuddle'||params.has('light'))){ctx.fillStyle='#30396866';ctx.fillRect(x,y,w,h);}
  ctx.restore();
 }
 let stage=0;
 for(let t=1000;t<70000&&stage<3;t+=80){
  const s=ctrl.step(t,.08,night,false,actors,map,bench);
  if(!s?.moment||s.moment.elapsed/s.moment.duration<[.08,.51,.79][stage])continue;
  paint(stage++,s.moment,actors.map((a,j)=>{const pos=iso(a.point.u,a.point.v);return {...pos,person:people[j],direction:a.direction,depth:s.bench?bench.y+1+j*.1:pos.y};}));
 }
 if(stage!==3)throw Error('Incomplete activity '+kind);
}
document.body.dataset.ready='true';
