// Paint at the terrain's native resolution. The legacy landscape is the registration plate.
import sharp from 'sharp';
import {gardenBounds, groundPoint, pondRadius, scenery} from '../src/garden/world.ts';

const {data,info:{width,height}} = await sharp('public/art/terrain.png').ensureAlpha().raw().toBuffer({resolveWithObject:true});
let seed = 236;
function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
function pixel(x,y,r,g,b){
 x=Math.round(x);y=Math.round(y);
 if(x<0||x>=width||y<0||y>=height)return;
 const i=(y*width+x)*4;
 if(data[i+3]===255){data[i]=r;data[i+1]=g;data[i+2]=b;}
}
function grass(i){return data[i+3]===255&&data[i+1]>data[i]+12&&data[i]>data[i+2]+7;}
for(let y=0;y<height;y++)for(let x=0;x<width;x++){
 const i=(y*width+x)*4;
 if(data[i+3]!==255)continue;
 if(grass(i)){
  const bank=Math.sin(x/47+y/21)*.4+Math.cos(y/37-x/76)*.6;
  const light=Math.round(bank*3)*3;
  pixel(x,y,data[i]+light+3,data[i+1]+light+2,data[i+2]+Math.max(0,-light));
 }else if(data[i+2]>data[i]+12&&data[i+1]>data[i]+18){
  const uv=groundPoint(x+gardenBounds.x,y+gardenBounds.y);
  const depth=pondRadius(uv.u,uv.v);
  if(depth>=1)continue;
  const glint=Math.sin(y*.67+2.3*Math.sin(x*.042)+Math.cos(y*.09));
  const deep=Math.max(0,.86-depth);
  pixel(x,y,data[i]*(1-deep*.43)+(glint>.92?15:0),data[i+1]*(1-deep*.13)+(glint>.92?10:0),data[i+2]+5);
 }
}
// Low sun draws broken, cool canopy shadows onto grass without moving tree anchors.
for(const tree of scenery.filter(s=>['pine','cherry','willow','oak'].includes(s.name))){
 const cx=Math.round(tree.x-gardenBounds.x+15),cy=Math.round(tree.y-gardenBounds.y+5);
 for(let dy=-9;dy<10;dy++)for(let dx=-24;dx<25;dx++){
  if((dx/23)**2+(dy/8)**2>1+.1*Math.cos(dx*.65)||random()<.09)continue;
  const x=cx+dx,y=cy+dy,i=(y*width+x)*4;
  if(grass(i))pixel(x,y,data[i]*.81,data[i+1]*.87,data[i+2]*.95);
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
