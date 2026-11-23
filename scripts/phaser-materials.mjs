// Material details are registered to the original sprite sheet, including its alpha and anchors.
import sharp from 'sharp';
import {readFile} from 'node:fs/promises';

const {frames}=JSON.parse(await readFile('src/garden/atlas.json','utf8'));
const {data,info:{width,height}}=await sharp('public/art/atlas.png').ensureAlpha().raw().toBuffer({resolveWithObject:true});
function paint(name,shader){
 const f=frames[name];
 for(let y=0;y<f.h;y++)for(let x=0;x<f.w;x++){
  const i=((f.y+y)*width+f.x+x)*4;
  if(data[i+3]!==255)continue;
  const rgb=shader(x,y,data[i]*65536+data[i+1]*256+data[i+2]);
  if(rgb)for(let c=0;c<3;c++)data[i+c]=Math.max(0,Math.min(255,Math.round(rgb[c])));
 }
}
const mod=(n,d)=>((n%d)+d)%d;
const vary=(rgb,light)=>rgb.map((n,c)=>n+light*[1,.83,.65][c]);
const grain=(x,y)=>Math.sin(x*.34+Math.sin(y*1.49)*1.4)+.6*Math.sin(y*.6+x*1.03);

paint('cottage',(x,y,color)=>{
 if([0xa35b63,0xbc7472,0xd08c7d,0x824b56].includes(color)){
  // Rows follow the two roof axes. Stagger seams, shadow each tile lip and catch
  // the top-left rim with a little faded terracotta.
  const slope=(y-5-(x-34)*.5)/1.48;
  const ridge=(x-34)+slope*.65;
  const row=Math.floor(slope/4.5),joint=mod(ridge+(row%2)*4.5,9);
  const bottom=mod(slope+.45*Math.sin(joint*.43),4.5);
  const tile=Math.floor((ridge+(row%2)*4.5)/9);
  const tone=5*Math.sin(tile*8.32+row*2.2)+4*Math.cos(tile*2.3-row);
  const edge=bottom>3.7?-27:bottom<.78?14:joint<1.15?-15:0;
  return vary([170,99,91],tone+edge+2*grain(x,y));
 }
 if([0xdcc68e,0xb5a879,0xc7ac76,0x9e906a].includes(color)){
  const shaded=x>44,light=grain(x,y)*2.5+Math.sin(x*.13+y*.32)*3;
  return vary(shaded?[177,163,127]:[219,201,159],light-(y<65?4:0));
 }
});
paint('sign',(x,y,color)=>{
 if(color!==0xca945b)return;
 const knot=Math.hypot((x-119)*.38,(y-18)*1.8);
 const figure=Math.sin(y*1.14+Math.sin(x*.064)*.6+3*Math.exp(-knot*.26))*.7;
 return vary([202,152,99],6*figure+2.4*Math.sin(knot*.46)/(1+knot*.055));
});
paint('plot',(x,y,color)=>{
 if(![0x89684c,0x71523e,0xa17d53,0xb38d60,0x644b39].includes(color))return;
 const furrow=Math.sin((y-x*.49)*1.03);
 const crumbs=grain(x,y)*4+Math.cos(x*1.81+y*.37)*2;
 return vary([127,95,65],furrow*11+crumbs+(24-y)*.18);
});
await sharp(data,{raw:{width,height,channels:4}}).png().toFile('public/art/phaser-objects.png');
