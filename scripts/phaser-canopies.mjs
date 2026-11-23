// Four original 72 x 96 tree portraits. Each shares its predecessor's foot anchor (36,92).
import sharp from 'sharp';

const width=288,height=96,pixels=Buffer.alloc(width*height*4);
let offset=0,seed=713;
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
function dot(x,y,color){
 x=Math.round(x);y=Math.round(y);
 if(x<0||x>=72||y<0||y>=height)return;
 const i=(y*width+offset+x)*4;
 pixels[i]=color>>16;pixels[i+1]=color>>8;pixels[i+2]=color;pixels[i+3]=255;
}
function oval(x,y,rx,ry,color){
 for(let dy=-ry;dy<=ry;dy++){
  const w=Math.floor(rx*Math.sqrt(1-dy*dy/(ry*ry)));
  for(let dx=-w;dx<=w;dx++)dot(x+dx,y+dy,color);
 }
}
function stroke(x,y,ex,ey,thickness,color){
 const steps=Math.max(Math.abs(ex-x),Math.abs(ey-y),1);
 for(let i=0;i<=steps;i++)oval(x+(ex-x)*i/steps,y+(ey-y)*i/steps,thickness,thickness,color);
}
function bough(x,y,ex,ey,size){
 stroke(x,y,ex,ey,size,0x584943);
 stroke(x-1,y-1,ex-1,ey-1,Math.max(1,size-1),0x91674d);
 stroke(x-2,y-1,ex-2,ey-1,1,0xc08d5e);
}
const greens=[0x385d50,0x51794f,0x779958,0x9cb565,0xc0cc80];
const blossom=[0x80566d,0xae7281,0xcc8897,0xe8aaa9,0xffd1bc];
function crown(x,y,rx,ry,colors){
 oval(x,y+2,rx,ry,colors[0]);
 oval(x-1,y,rx,ry,colors[1]);
 for(let j=0;j<24;j++){
  const dx=(random()*2-1)*rx*.82,dy=(random()*2-1)*ry*.75;
  if((dx/rx)**2+(dy/ry)**2>.75)continue;
  const light=dx/rx+dy/ry;
  oval(x+dx,y+dy,3+Math.floor(random()*3),2+Math.floor(random()*2),colors[light<0?3:2]);
  if(light<.35){dot(x+dx-2,y+dy-2,colors[4]);dot(x+dx-1,y+dy-3,colors[4]);}
 }
}
for(const [index,kind] of ['oak','cherry','pine','willow'].entries()){
 offset=index*72;
 bough(35,87,39,54,4);bough(38,62,30,43,2);bough(37,65,51,47,2);
 bough(34,86,28,89,1);bough(37,85,41,89,1);
 if(kind==='pine'){
  const tiers=[[47,24],[37,21],[28,16],[17,12],[8,7]];
  for(const [top,span] of tiers){
   for(let dy=0;dy<span+2;dy++){
    const reach=Math.floor(dy*.98);
    for(let dx=-reach;dx<=reach;dx++){
     const ragged=Math.sin(dx*.74)*2+Math.cos(dx*.26)*2;
     if(dy>span-3+ragged+2*Math.abs(dx)/span)continue;
     dot(36+dx,top+dy,dx+dy*.33>span*.35?0x365953:dx+Math.sin(dy*.5)*3<0?0x64976c:0x4a7e62);
    }
    if(dy%4===0){stroke(36-reach+1,top+dy,36-Math.round(reach*.45),top+dy-2,1,0x90b183);}
   }
  }
 }else{
  const colors=kind==='cherry'?blossom:greens;
  const clusters=kind==='cherry'?[[49,44,16,11],[22,47,17,11],[38,41,19,15],[55,32,11,10],[19,34,13,11],[33,26,16,13],[43,16,13,10],[27,19,10,10]]:
   [[48,44,17,13],[20,47,15,11],[35,46,19,13],[54,31,12,12],[15,34,12,10],[27,29,17,14],[43,24,16,13],[31,17,10,10]];
  for(const [x,y,rx,ry] of clusters)crown(x,y,rx,ry,colors);
  if(kind==='willow')for(let j=0;j<31;j++){
   const x=7+j*1.9,start=28+Math.sin(j*.54)*7,len=19+random()*19;
   for(let k=0;k<len;k++){
    const bend=x-2*Math.sin(k/9)-k*.05;
    dot(bend,start+k,0x517b59);
    if(k%5<3){dot(bend-1,start+k,0x85a86a);dot(bend-2,start+k-1,0xa3bc79);}
   }
  }
 }
}
await sharp(pixels,{raw:{width,height,channels:4}}).png({palette:true}).toFile('public/art/phaser-canopies.png');
