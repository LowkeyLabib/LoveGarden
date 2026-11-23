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
  pixel(x,y,139+light*1.28,166+light,107+light*.58);
 }else if(data[i+2]>data[i]+12&&data[i+1]>data[i]+18){
  const uv=groundPoint(x+gardenBounds.x,y+gardenBounds.y);
  const radius=pondRadius(uv.u,uv.v);
  if(radius>=1)continue;
  water[y*width+x]=1;
  const shallows=clamp((radius-.35)/.65)**1.7;
  const ripple=Math.sin(y*1.34+Math.sin(x*.067+y*.31)*1.6);
  const brokenLight=Math.sin(x*.067+Math.cos(y*.45))+.7*Math.cos(y*.64+x*.023);
  const glint=ripple>.79&&brokenLight>.54?10:0;
  const sand=Math.round(3*Math.sin(y*.9+x*.33))*shallows;
  pixel(x,y,67+95*shallows+glint+sand,126+58*shallows+glint+sand,133+24*shallows+glint);
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
