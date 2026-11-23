// Build four native-scale tree portraits. The foot of each tree is at (36,92).
import sharp from 'sharp';

const cell=72,height=96,width=4*cell;
const data=Buffer.alloc(width*height*4);
let offset=0,seed=713;
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const clamp=(value,low,high)=>Math.min(high,Math.max(low,value));
function pixel(x,y,color){
 x=Math.round(x);y=Math.round(y);
 if(x<0||x>=cell||y<0||y>=height)return;
 const i=(y*width+offset+x)*4;
 data[i]=color>>16;data[i+1]=color>>8;data[i+2]=color;data[i+3]=255;
}

function branch(points){
 for(let j=1;j<points.length;j++){
  const [x0,y0,r0]=points[j-1],[x1,y1,r1]=points[j];
  const steps=Math.max(Math.abs(x1-x0),Math.abs(y1-y0));
  for(let k=0;k<=steps;k++){
   const t=k/steps,x=x0+(x1-x0)*t,y=y0+(y1-y0)*t,r=r0+(r1-r0)*t;
   for(let dx=-r;dx<=r;dx++)pixel(x+dx,y,dx<-.44*r?0xac8462:dx>r*.38?0x59483d:0x82654c);
  }
 }
}
const oak=[0x364e41,0x496345,0x607d4d,0x789254,0x97a965,0xb6bd78,0xcccd8c];
const cherry=[0x795967,0x976674,0xb67b87,0xce9298,0xe3a9a9,0xeec2b7,0xf5d7c3];
const willow=[0x395d51,0x4b7160,0x668667,0x7c9a71,0x93ab77,0xb2bf88,0xc8cb9a];
const needles=[0x344f49,0x446455,0x54785f,0x678a68,0x85a07b,0xa4b493];
function crown(cx,cy,rx,ry,colors,phase){
 // Irregular leaf masses overlap around the main limbs. A shared light direction
 // describes each volume at three scales: crown, sprays and individual leaf tips.
 for(let y=cy-ry-3;y<=cy+ry+3;y++)for(let x=cx-rx-3;x<=cx+rx+3;x++){
  const nx=(x-cx)/rx,ny=(y-cy)/ry;
  const edge=.09*Math.sin(x*.65+y*.24+phase)+.08*Math.cos(y*.81-x*.22)+.045*Math.sin(x*1.41-y*.72);
  const sphere=1-nx*nx-ny*ny+edge;
  if(sphere<0)continue;
  const spray=.36*Math.sin(x*.59+y*.87+phase)+.27*Math.cos(x*.91-y*.42)+.24*Math.sin(x*.29-y*.72);
  const light=.54*Math.sqrt(sphere)-.41*nx-.62*ny+spray*.48+.11*(36-x)/30;
  pixel(x,y,colors[clamp(Math.floor(1.5+light*3.4),0,colors.length-1)]);
 }
}
function sprays(lobes,colors){
 for(const [x,y,rx,ry] of lobes)crown(x,y,rx,ry,colors,random()*7);
}
function hangingLeaves(x,y,length){
 const curl=random()*3+1;
 for(let i=0;i<length;i++){
  const px=x+Math.sin(i/length*2.8)*curl-i*.09,py=y+i;
  pixel(px,py,willow[1]);
  if(i%4!==3){pixel(px-1,py,willow[3]);pixel(px-2,py+1,willow[4]);}
 }
}
for(const [index,species] of ['oak','cherry','pine','willow'].entries()){
 offset=index*cell;
 branch([[25,91,1],[32,87,3],[36,77,4],[38,63,3],[34,48,2],[36,32,1]].reverse());
 branch([[36,78,3],[39,86,3],[45,90,1]]);
 if(species==='pine'){
  branch([[36,76,3],[36,45,2],[35,11,1]]);
  for(const [top,h,halfWidth] of [[43,31,25],[33,29,23],[22,27,19],[14,24,15],[6,21,10],[2,16,6]]){
   const phase=random()*4;
   for(let y=0;y<h+3;y++)for(let x=-halfWidth;x<=halfWidth;x++){
    const side=Math.abs(x)/halfWidth;
    const ridge=.5+.5*Math.sin(x*.75+phase+.06*y);
    const bottom=h-3.6*side+2.6*ridge;
    if(y<side*(h-5)+1.4*Math.sin(x*.8+phase)||y>bottom)continue;
    const light=2.9-1.8*x/halfWidth-1.8*y/h+.75*ridge+.45*Math.cos(y*.94-Math.abs(x)*.47);
    pixel(35+x,top+y,needles[clamp(Math.round(light),0,5)]);
   }
  }
 }else{
  branch([[37,69,3],[32,59,3],[21,51,2],[15,41,1]]);
  branch([[38,66,3],[44,58,3],[53,51,2],[56,41,1]]);
  if(species==='oak'){
   sprays([[55,46,12,12],[13,47,11,10],[26,49,16,13],[43,48,17,12],[52,31,14,12],
    [19,34,15,13],[33,38,18,13],[44,23,14,12],[26,23,13,13],[34,15,12,10]],oak);
  }else if(species==='cherry'){
   sprays([[56,43,12,9],[11,46,9,8],[23,43,14,10],[46,38,15,10],[58,29,9,8],
    [15,32,12,8],[29,32,14,11],[42,26,13,10],[50,18,10,7],[29,19,11,7]],cherry);
   for(const [cx,cy] of [[20,31],[28,18],[47,21],[55,38],[22,42]]){
    for(let i=0;i<12;i++){
     const x=Math.round(cx+(random()-.5)*12),y=Math.round(cy+(random()-.5)*8);
     pixel(x,y,0xf2cfc2);pixel(x+1,y-1,0xf6dccc);
    }
   }
  }else{
   for(let j=0;j<28;j++)hangingLeaves(7+j*2,32+Math.round(random()*8),19+Math.round(random()*14));
   sprays([[52,37,14,13],[18,37,14,12],[33,36,18,14],[46,24,14,12],[24,25,13,12],[34,18,13,11]],willow);
   for(let j=0;j<33;j++){
    const x=6+j*1.85;
    hangingLeaves(x,26+Math.round(Math.sin(x*.22)*5+random()*8),15+Math.round(random()*16));
   }
  }
 }
}
await sharp(data,{raw:{width,height,channels:4}}).png({palette:true}).toFile('public/art/phaser-canopies.png');
