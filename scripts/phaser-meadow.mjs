// Paint at the terrain's native resolution. The legacy landscape is the registration plate.
import sharp from 'sharp';
import {gardenBounds, groundPoint, pondRadius, scenery} from '../src/garden/world.ts';

const {data,info:{width,height}} = await sharp('public/art/terrain.png').ensureAlpha().raw().toBuffer({resolveWithObject:true});
const trees=await sharp('public/art/phaser-canopies.png').ensureAlpha().raw().toBuffer();
const species=['oak','cherry','pine','willow'];
const water=new Uint8Array(width*height);
const clamp=value=>Math.min(1,Math.max(0,value));
let seed = 236;
function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
function pixel(x,y,r,g,b){
 x=Math.round(x);y=Math.round(y);
 if(x<0||x>=width||y<0||y>=height)return;
 const i=(y*width+x)*4;
 if(data[i+3]===255){data[i]=Math.max(0,Math.min(255,r));data[i+1]=Math.max(0,Math.min(255,g));data[i+2]=Math.max(0,Math.min(255,b));}
}
function grass(i){return data[i+3]===255&&data[i+1]>data[i]+12&&data[i]>data[i+2]+7;}
for(let y=0;y<height;y++)for(let x=0;x<width;x++){
 const i=(y*width+x)*4;
 if(data[i+3]!==255)continue;
 if(grass(i)){
  const bank=Math.sin(x/47+y/21)*.4+Math.cos(y/37-x/76)*.6;
  const blades=Math.sin(x*.83+y*1.37+Math.sin(y*.61))*1.5;
  // Soften the joins between grass diamonds while retaining the original edge and tufts.
  const detail=(data[i+1]-169)*.54;
  const light=Math.round((bank*12+blades+detail)/2)*2;
  pixel(x,y,139+light*1.34+3*bank,166+light,107+light*.48-3*bank);
 }else if(data[i+2]>data[i]+12&&data[i+1]>data[i]+18){
  const uv=groundPoint(x+gardenBounds.x,y+gardenBounds.y);
  const radius=pondRadius(uv.u,uv.v);
  if(radius>=1)continue;
  water[y*width+x]=1;
  const shallows=clamp((radius-.35)/.65)**1.7;
  const ripple=Math.sin(y*1.34+Math.sin(x*.067+y*.31)*1.6);
  const brokenLight=Math.sin(x*.067+Math.cos(y*.45))+.7*Math.cos(y*.64+x*.023);
  const glint=ripple>.76&&brokenLight>.52?13:0;
  const caustic=Math.max(0,Math.sin(y*.47+Math.cos(x*.13))*.6+Math.cos(x*.12-y*.41)*.4-.5)*30*shallows;
  const sand=Math.round(3*Math.sin(y*.9+x*.33))*shallows;
  pixel(x,y,59+103*shallows+glint+sand+caustic,121+63*shallows+glint+sand+caustic,137+20*shallows+glint);
 }else if(data[i]>177&&data[i+1]>150&&data[i]-data[i+1]>9&&data[i+1]-data[i+2]>24){
  // Pale stone catches light along mineral veins, with cooler moss in worn joints.
  const seam=Math.cos(x*.24+y*.67+Math.sin(x*.16)*2);
  const patina=Math.round(3*Math.sin(x*.42-y*.51)+(seam>.95?-7:seam>.83?5:0));
  pixel(x,y,data[i]+patina,data[i+1]+patina*.72,data[i+2]+patina*.55+2);
 }
}
// Project each tree's actual silhouette onto the ground. At the inlet, mirror the
// nearby branches in the water with a small horizontal displacement per scanline.
for(const tree of scenery.filter(s=>species.includes(s.name))){
 const cx=Math.round(tree.x-gardenBounds.x),cy=Math.round(tree.y-gardenBounds.y);
 const frame=species.indexOf(tree.name)*72;
 for(let dy=-8;dy<=48;dy++)for(let dx=-36;dx<=78;dx++){
  const x=cx+dx,y=cy+dy;
  if(x<0||x>=width||y<0||y>=height)continue;
  const at=y*width+x,i=at*4;
  const reflection=water[at]===1;
  const elevation=reflection?dy/.53:(dy-dx*.13)/.16;
  const sy=Math.round(92-elevation);
  const sx=Math.round(36+(reflection?dx+2*Math.sin(y*1.17+cx*.03):dx-elevation*.41));
  if(sy<0||sy>=96||sx<0||sx>=72||data[i+3]!==255)continue;
  const texel=(sy*288+frame+sx)*4;
  if(!trees[texel+3])continue;
  if(reflection){
   const strength=(.30+.07*Math.sin(y*1.7))*clamp(1-dy/100);
   pixel(x,y,...[0,1,2].map(c=>data[i+c]*(1-strength)+trees[texel+c]*strength));
  }else{
   const shade=.19+.08*clamp((80-elevation)/80);
   pixel(x,y,data[i]*(1-shade),data[i+1]*(1-shade*.79),data[i+2]*(1-shade*.43));
  }
 }
}
// Paired arching grasses catch sunlight at the meadow edge.
for(let blade=0;blade<2300;blade++){
 const x=Math.floor(random()*(width-6))+3,y=Math.floor(random()*(height-6))+3;
 if(!grass((y*width+x)*4)||!grass(((y-2)*width+x+1)*4))continue;
 pixel(x,y,111,146,89);pixel(x+1,y-1,158,181,109);pixel(x+2,y-2,175,192,121);
 if(blade%3===0)pixel(x-1,y-1,155,179,110);
}
// Small drifts of harebells, buttercups and clover leave the planting beds legible.
for(let drift=0;drift<250;drift++){
 const cx=random()*width,cy=random()*height;
 const petal=[[237,206,116],[177,180,218],[240,220,185]][drift%3];
 for(let j=0;j<14;j++){
  const x=Math.round(cx+(random()-.5)*30),y=Math.round(cy+(random()-.5)*12);
  if(x<2||x>=width-2||y<3||y>=height||!grass((y*width+x)*4))continue;
  pixel(x,y,85,126,81);pixel(x-1,y-1,110,152,92);
  if(j%3===0){pixel(x,y-2,...petal);pixel(x+1,y-2,...petal);}
  else pixel(x+1,y-1,185,201,128);
 }
}
await sharp(data,{raw:{width,height,channels:4}}).png({palette:true,colours:256,dither:0}).toFile('public/art/phaser-meadow.png');
