/** Original LoveGarden pixel artwork. No imported or third-party game assets.
 * Integer raster primitives, a shared palette and a fixed upper-left light source.
 * Rebuild with: node scripts/pixel-art.mjs
 */
import sharp from 'sharp';
import { writeFile, mkdir } from 'node:fs/promises';
import { grid, gardenBounds, groundPoint, iso, pondRadius, decorSlots } from '../src/garden/world.ts';
const P={ink:'#343d35',dark:'#3e5840',grass:'#86af6c',grassLight:'#b5cc85',grassDark:'#729858',leaf:'#67965c',leafLight:'#a2c379',leafDark:'#3f6c53',wood:'#a77548',woodLight:'#d6a362',woodDark:'#694e3d',bark:'#805b3e',cream:'#f8e5b0',rose:'#d77388',roseLight:'#f3acac',roseDark:'#984f70',gold:'#efc15d',water:'#71b8b1',waterLight:'#c0e2cc',waterDark:'#4b8c99',stone:'#b7b9a0',stoneDark:'#747e76'};
function color(s){if(typeof s==='string'&&s.startsWith('#'))return [...s.slice(1).match(/../g).map(x=>parseInt(x,16)),255];return s;}
class Pixels{
 constructor(w,h){this.w=w;this.h=h;this.data=Buffer.alloc(w*h*4);}
 dot(x,y,c){x=Math.round(x);y=Math.round(y);if(x<0||y<0||x>=this.w||y>=this.h)return;const rgba=color(c);const i=(y*this.w+x)*4;rgba.forEach((v,n)=>this.data[i+n]=v);}
 rect(x,y,w,h,c){for(let j=Math.round(y);j<Math.round(y+h);j++)for(let i=Math.round(x);i<Math.round(x+w);i++)this.dot(i,j,c);}
 poly(points,c){const minY=Math.floor(Math.min(...points.map(p=>p[1]))),maxY=Math.ceil(Math.max(...points.map(p=>p[1])));for(let y=minY;y<=maxY;y++){const hits=[];for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];if((a[1]<=y&&b[1]>y)||(b[1]<=y&&a[1]>y))hits.push(a[0]+(y-a[1])*(b[0]-a[0])/(b[1]-a[1]));}hits.sort((a,b)=>a-b);for(let i=0;i<hits.length;i+=2)this.rect(Math.ceil(hits[i]),y,Math.floor(hits[i+1])-Math.ceil(hits[i])+1,1,c);}}
 line(x,y,x2,y2,c,width=1){x=Math.round(x);y=Math.round(y);x2=Math.round(x2);y2=Math.round(y2);const dx=Math.abs(x2-x),dy=-Math.abs(y2-y),sx=x<x2?1:-1,sy=y<y2?1:-1;let error=dx+dy;for(;;){this.rect(x,y,width,width,c);if(x===x2&&y===y2)break;const e=2*error;if(e>=dy){error+=dy;x+=sx;}if(e<=dx){error+=dx;y+=sy;}}}
 oval(x,y,rx,ry,c){for(let j=-ry;j<=ry;j++){const w=Math.floor(rx*Math.sqrt(1-j*j/(ry*ry)));this.rect(x-w,y+j,w*2+1,1,c);}}
 paste(source,x,y){for(let j=0;j<source.h;j++)for(let i=0;i<source.w;i++){const at=(j*source.w+i)*4;if(source.data[at+3])this.dot(x+i,y+j,[...source.data.subarray(at,at+4)]);}}
 png(){return sharp(this.data,{raw:{width:this.w,height:this.h,channels:4}}).png().toBuffer();}
}
let seed=174;function rand(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
function diamond(c,x,y,rx,ry,fill){c.poly([[x,y-ry],[x+rx,y],[x,y+ry],[x-rx,y]],fill);}
function shadow(c,x,y,rx=15,ry=6){c.oval(x+6,y+2,rx,ry,[40,61,42,48]);}
function tuft(c,x,y,light=P.grassLight){c.rect(x,y-2,1,3,P.grassDark);c.rect(x+2,y-4,1,5,light);c.rect(x+4,y-1,1,2,P.grassDark);}
function blossom(c,x,y,type='rose',size=1){
 const colors={rose:[P.roseDark,P.rose,P.roseLight],daisy:['#c48a3c','#f4d888','#fff4ca'],tulip:['#b86c4b','#ef9a67','#ffd19b'],lavender:['#68577d','#9f81bd','#cbb1df'],cosmos:['#9c5684','#d68eb1','#f6bbcf'],bluebell:['#537c9e','#85b7cc','#b2e2db']};const [dark,mid,light]=colors[type]||colors.rose;
 if(type==='lavender'){for(let i=0;i<4;i++){c.rect(x-2,y-i*3,5,2,dark);c.rect(x-2,y-i*3-1,3,2,mid);c.dot(x-2,y-i*3-1,light);}return;}
 if(type==='tulip'){c.poly([[x-4,y-5],[x-2,y-3],[x,y-6],[x+2,y-3],[x+4,y-5],[x+3,y+2],[x,y+4],[x-3,y+2]],dark);c.rect(x-2,y-2,5,5,mid);c.line(x-2,y-3,x-2,y+1,light);return;}
 if(type==='bluebell'){c.rect(x-1,y-5,2,6,P.leafDark);c.rect(x-4,y-3,4,4,dark);c.rect(x-5,y,6,2,light);c.rect(x+1,y+1,4,4,mid);c.rect(x,y+4,6,2,light);return;}
 const lobes=type==='rose'?[[0,0,5,4],[-3,-2,3,3],[2,-3,3,3]]:[[0,-4,2,3],[4,-1,3,2],[2,4,2,3],[-3,3,3,2],[-4,-2,3,2]];
 for(const [dx,dy,rx,ry] of lobes)c.oval(x+dx,y+dy,rx,ry,dark);
 for(const [dx,dy,rx,ry] of lobes)c.oval(x+dx,y+dy-1,Math.max(1,rx-1),Math.max(1,ry-1),mid);
 c.rect(x-3,y-4,3,2,light);c.rect(x,y-2,2,2,light);c.rect(x-1,y,3,2,type==='rose'?dark:P.gold);c.dot(x,y,'#fff0b3');c.dot(x+2,y+2,light);if(type==='rose'){c.line(x-2,y+1,x+1,y+1,mid);c.dot(x-1,y-1,light);}
}
function plant(c,x,y,type,height=16){c.line(x,y,x,y-height,P.leafDark,2);c.line(x,y-4,x-6,y-8,P.leaf,2);c.line(x+1,y-8,x+6,y-12,P.leafLight,2);blossom(c,x,y-height,type);}
const sprites={};function sprite(name,w,h,draw,anchorX=Math.floor(w/2),anchorY=h-4){const c=new Pixels(w,h);draw(c);sprites[name]={c,anchorX,anchorY};return c;}
const project=(u,v)=>[320+(u-v)*16,64+(u+v)*8];
const terrain=new Pixels(720,450);
terrain.poly([[47,230],[367,390],[657,246],[657,260],[367,414],[47,253]],[37,60,45,31]);
// Raised island: darker eastern soil, warm western cutaway, rock and root strata.
terrain.poly([[32,208],[352,368],[352,399],[32,239]],'#765842');
terrain.poly([[352,368],[640,224],[640,255],[352,399]],'#574c3b');
terrain.line(33,223,351,382,'#a07c50',3);terrain.line(354,382,638,240,'#736445',3);
for(let i=0;i<200;i++){const left=i%2===0,t=rand();const x=left?32+t*320:352+t*288;const y=left?208+t*160:368-t*144;terrain.rect(x,y+9+rand()*15,2+rand()*6,2+rand()*4,left?'#9b7950':'#736346');}
for(let i=0;i<25;i++){const x=48+i*23,y=x<352?216+(x-48)*.5:368-(x-352)*.5;terrain.line(x,y+3,x+2,y+10,P.leafDark);terrain.line(x+2,y+10,x,y+15,P.leafDark);}
function pathTile(u,v){return u===5&&v>=3&&v<=14 || v===12&&u>=5&&u<=17 || u===17&&v>=4&&v<=12 || v===4&&u>=5&&u<=17;}
const pond=(u,v)=>((u-3.1)/2.5)**2+((v-11)/3.0)**2<1;
const blend=(a,b,t)=>{const aa=color(a),bb=color(b);return aa.map((v,i)=>i===3?255:Math.round(v+(bb[i]-v)*t));};
for(let sum=0;sum<=36;sum++)for(let u=0;u<20;u++){
 const v=sum-u;if(v<0||v>=18)continue;const [x,y]=project(u+.5,v+.5),isPath=pathTile(u,v);
 const patch=.5+.23*Math.sin(u*.63+v*.31)+.22*Math.cos(v*.79-u*.14);
 diamond(terrain,x,y,16,8,isPath?'#d1bd91':blend('#78a367','#a0bc78',patch));
 if(isPath){
  terrain.poly([[x-13,y],[x-1,y-6],[x+12,y],[x+1,y+6]],'#b49e79');
  terrain.poly([[x-12,y-1],[x-1,y-6],[x+12,y],[x+1,y+4]],blend('#d9c79f','#e8d9b2',rand()*.7));
  terrain.line(x-11,y-1,x-1,y-6,'#eee1bd');terrain.line(x-1,y+4,x+11,y,'#c2ad85');
  if((u+v)%3===0){terrain.rect(x+4,y,2,1,'#ba9f78');terrain.dot(x+6,y-2,'#f2e6c5');}
 }else{
  for(let k=0;k<13;k++){const dx=Math.floor(rand()*28)-14,dy=Math.floor(rand()*12)-6;if(Math.abs(dx)/16+Math.abs(dy)/8<.85){terrain.rect(x+dx,y+dy,k%4===0?2:1,1,k%3===0?'#b3cc86':'#739c60');if(k%6===0)terrain.dot(x+dx+1,y+dy-1,'#c1d691');}}
  if((u*7+v*11)%7===0)tuft(terrain,x,y-2,'#b5cd85');
  if((u<4||v<3||u>17||v>14)&&(u*13+v*7)%11===0){terrain.rect(x-3,y-2,2,2,'#f7e7b1');terrain.dot(x+4,y,'#dca5b1');terrain.dot(x-3,y-3,'#fff4d1');}
 }
 if(u===19||v===17){terrain.line(x-15,y+1,x,y+8,'#547b50',2);terrain.line(x,y+8,x+15,y,'#547b50',2);terrain.rect(x-6,y+6,5,3,'#8ea95f');if((u+v)%3===0){terrain.rect(x-3,y+9,2,5,'#5a7d4c');terrain.dot(x-2,y+14,'#8ca966');}}
}
// Continuous, irregular shoreline with shallow water, depth, and pixel caustics.
for(let y=135;y<229;y++)for(let x=103;x<273;x++){
 const u=((x-320)/16+(y-64)/8)/2,v=((y-64)/8-(x-320)/16)/2;
 const a=(u-3.1)/2.25,b=(v-11.2)/2.9,angle=Math.atan2(b,a),radius=Math.hypot(a,b)/(1+.055*Math.sin(angle*5)+.035*Math.cos(angle*7));
 if(radius>1.12)continue;
 if(radius>1){terrain.dot(x,y,radius>1.07?'#6c9260':y<180?'#c1c49a':'#96ac7c');continue;}
 const shallow=Math.min(1,Math.max(0,(radius-.35)/.65));let water=blend('#508e9e','#9bcbc0',shallow*.88);
 if(Math.sin(x*.21+y*.7)> .94 && radius<.87)water=blend('#69aaa9','#b7dccc',shallow*.65);
 if((x*17+y*31)%109===0)water=blend('#6baaaa','#d0e6cc',shallow*.8);
 terrain.dot(x,y,water);
}
for(const angle of [.1,.7,1.8,2.4,3.1,4.2,5.1]){const [x,y]=project(3.1+2.55*Math.cos(angle),11.2+3.2*Math.sin(angle));terrain.oval(x,y,4,2,'#72916b');terrain.oval(x-1,y-1,3,2,'#b6bea0');terrain.rect(x-2,y-2,3,1,'#ddd5af');}

// Lily pads and pixel reflections, placed in the water rather than a separate plane.
for(const [u,v] of [[2,10],[3.5,11],[3,12.4],[1.8,11.4]]){const [x,y]=project(u,v);terrain.oval(x,y,6,3,'#467f5a');terrain.oval(x-1,y-1,5,2,'#86b56c');terrain.poly([[x,y],[x+6,y],[x+5,y+3]],P.water);terrain.line(x-3,y-2,x+1,y-2,'#b7d38d');if(u===2)blossom(terrain,x,y-3,'cosmos');}
// Small worn stone details along the main path.
for(let v=5;v<=13;v+=2){const [x,y]=project(5.5,v+.4);terrain.poly([[x-8,y],[x-3,y-3],[x+7,y-1],[x+8,y+2],[x,y+5],[x-8,y+2]],'#b9b99b');terrain.line(x-7,y,x-2,y-2,'#e1d8b3');}
sprite('plot',52,30,c=>{diamond(c,26,16,24,12,'#684f3e');diamond(c,26,13,24,12,'#bb996c');diamond(c,26,13,21,10,'#89684c');for(let i=-12;i<=12;i+=6){c.line(26+i-5,10+i/2,26+i+5,15+i/2,'#71523e');c.line(26+i-4,9+i/2,26+i+5,14+i/2,'#a17d53');}for(let i=0;i<24;i++){const x=8+rand()*36,y=5+rand()*17;if(Math.abs(x-26)/20+Math.abs(y-13)/9<.86)c.dot(x,y,i%3?'#b38d60':'#644b39');}c.line(4,13,26,2,'#e0bd8b');c.line(26,2,48,13,'#c8a174');c.line(4,15,25,26,'#93704c');c.dot(5,14,'#eee1b8');c.dot(46,14,'#dac08c');},26,16);
sprite('marker',13,22,c=>{c.rect(5,9,2,12,P.woodDark);c.rect(1,0,11,11,P.woodDark);c.rect(2,1,9,8,P.woodLight);c.rect(6,2,1,6,P.cream);c.rect(4,4,5,1,P.cream);},6,21);
for(const type of ['rose','daisy','tulip','lavender','cosmos','bluebell'])for(let stage=0;stage<=3;stage++)sprite(`flower-${type}-${stage}`,34,44,c=>{
 shadow(c,15,39,9,3);
 if(stage===0){c.oval(16,36,6,3,'#604a37');c.rect(14,34,4,2,'#dfb97b');c.dot(15,33,P.cream);c.dot(19,36,'#b39266');c.rect(13,38,8,1,'#8b7149');return;}
 if(stage===1){c.rect(16,28,2,10,P.leafDark);c.poly([[16,33],[9,28],[9,25],[13,26],[17,30]],P.leafLight);c.poly([[17,30],[22,24],[26,23],[25,28],[18,33]],P.leaf);c.dot(23,24,'#b5d47a');return;}
 if(stage===2){c.rect(16,16,2,22,P.leafDark);c.line(16,30,9,25,P.leaf,2);c.line(17,25,24,20,P.leafLight,2);c.oval(17,16,4,6,({daisy:P.gold,lavender:'#ad92c8',bluebell:'#91c1d4',tulip:'#efa477',cosmos:'#dc9abb',rose:P.rose})[type]);c.rect(14,14,2,4,type==='bluebell'?'#c2e0df':type==='tulip'?'#ffd2a6':P.roseLight);c.rect(15,22,5,2,P.leaf);c.dot(19,19,'#d9ddb1');return;}
 c.poly([[15,38],[7,33],[6,29],[13,31],[18,36]],P.leaf);c.poly([[18,37],[26,30],[29,31],[25,36]],P.leafDark);plant(c,10,37,type,17);plant(c,24,37,type,12);plant(c,17,35,type,25);c.line(8,31,12,34,P.leafLight);c.dot(20,33,'#bdd58c');
});
function tree(c,pink=false,pine=false){
 const colors=pink?['#935e78','#bb7e94','#dc9bad','#efb6bd','#fad4ca']:['#3c6852','#56805b','#76a167','#a1bf7c','#cad998'];
 shadow(c,32,86,29,9);c.poly([[25,88],[29,48],[36,46],[39,86],[44,89],[35,91]],'#64533f');c.rect(29,49,4,37,'#a48254');c.rect(29,58,2,25,'#c8a16a');c.line(33,72,35,86,'#795c41');c.line(30,69,18,54,'#806045',3);c.line(34,61,46,46,'#9b7850',3);c.dot(32,78,'#5a4e3c');
 if(pine){for(let i=0;i<4;i++){const y=17+i*13,w=11+i*6;c.poly([[32,y-16],[32+w,y+10],[32+w-6,y+11],[32+w-3,y+17],[32,y+13],[32-w,y+16],[32-w+6,y+7]],colors[0]);c.poly([[32,y-13],[32+w-5,y+9],[32,y+6],[32-w+4,y+12]],colors[2]);c.line(32,y-12,32-w+7,y+7,colors[3],2);for(let n=0;n<10;n++){const x=32+(rand()-.5)*w*1.5,yy=y+rand()*10;c.line(x,yy,x+2,yy+1,n%3?colors[1]:colors[4]);}}return;}
 const clusters=[[12,37,11,11],[20,23,15,13],[37,16,15,13],[52,28,13,12],[58,42,10,11],[43,47,16,15],[27,45,17,15],[13,48,10,10],[35,32,20,17]];
 for(const [x,y,rx,ry]of clusters)c.oval(x,y,rx+1,ry+2,colors[0]);
 for(const [x,y,rx,ry]of clusters){c.oval(x,y-2,rx,ry,colors[1]);c.oval(x-3,y-4,rx-2,ry-2,colors[2]);c.oval(x-6,y-7,Math.max(2,rx-6),Math.max(2,ry-5),colors[3]);}
 const mask=Buffer.from(c.data);
 for(let i=0;i<220;i++){const x=Math.floor(4+rand()*63),y=Math.floor(4+rand()*59),at=(y*c.w+x)*4;if(mask[at+3]===255){const col=colors[i%7===0?4:i%3+1];c.rect(x,y,2,1,col);if(i%3===0)c.dot(x-1,y+1,col);if(pink&&i%9===0){c.dot(x,y-1,colors[4]);c.dot(x-1,y,colors[4]);c.dot(x+1,y,'#f7d7c9');}}}
 for(const [x,y]of[[13,31],[31,11],[46,38],[23,51]]){c.rect(x,y,3,1,colors[4]);c.dot(x-1,y+1,colors[3]);}
}

sprite('oak',72,96,c=>tree(c));sprite('cherry',72,96,c=>tree(c,true));sprite('pine',72,96,c=>tree(c,false,true));
sprite('willow',72,96,c=>{tree(c);for(let i=0;i<13;i++){const x=8+i*4,y=35+(i%4)*3,h=17+(i%3)*6;c.line(x,y,x-2,y+h,'#527d53');for(let j=0;j<h;j+=3){c.rect(x-3,y+j,3,2,j%2?'#92b671':'#76a35d');c.dot(x-4,y+j+1,'#b4cb85');}}},36,92);
sprite('bush',40,32,c=>{shadow(c,18,27,17,5);for(const [x,y,r]of[[8,20,8],[20,15,11],[31,20,8]]){c.oval(x,y,r,Math.floor(r*.7),P.leafDark);c.oval(x-2,y-2,r-1,Math.floor(r*.6),P.leaf);c.oval(x-3,y-4,r-3,3,P.leafLight);}for(let i=0;i<34;i++){const x=4+rand()*30,y=10+rand()*15,at=(Math.round(y)*c.w+Math.round(x))*4;if(c.data[at+3]===255)c.rect(x,y,2,1,i%3?'#87b070':'#c2d691');}for(const[x,y]of[[7,17],[20,11],[31,21]]){c.rect(x,y,2,2,'#f2c8c4');c.dot(x+1,y+1,'#c4879b');}},20,28);
sprite('hydrangea',42,34,c=>{shadow(c,20,28,19,5);c.oval(20,23,18,7,P.leafDark);for(const[x,y,r]of[[9,19,8],[21,13,10],[32,21,8]]){c.oval(x,y,r,r-1,'#896e95');c.oval(x-2,y-2,r-1,r-2,'#b496bf');for(let i=0;i<15;i++){const a=rand()*Math.PI*2,d=rand()*(r-1),xx=x+Math.cos(a)*d,yy=y+Math.sin(a)*d;c.rect(xx,yy,2,2,i%2?'#dfbed8':'#c8a5cf');c.dot(xx-1,yy,'#efe1e1');}}c.line(3,25,10,28,'#8fb780',2);c.line(28,29,36,25,'#8fb780',2);},21,29);
sprite('koi',16,9,c=>{c.poly([[2,4],[5,2],[12,3],[14,5],[11,7],[5,6]],'#e6b279');c.rect(6,3,4,3,'#f5d5a0');c.rect(10,4,3,2,'#da9270');c.poly([[3,4],[0,1],[0,7]],'#c98f6e');c.dot(13,4,'#788e76');},8,5);

sprite('reeds',22,30,c=>{for(let i=0;i<5;i++){c.line(7+i*2,26,2+i*4,4+i%2*6,P.leafDark);c.line(6+i*2,26,1+i*3,12,P.leafLight);}c.rect(1,3,3,7,P.woodDark);c.rect(13,4,3,7,P.wood);});
for(const axis of ['x','y'])sprite(`fence-${axis}`,38,44,c=>{const first=axis==='x'?20:36,second=axis==='x'?36:20;shadow(c,19,29,17,4);for(const h of [9,17]){c.line(3,first-h,35,second-h,'#7e684b',3);c.line(3,first-h-1,35,second-h-1,'#d6bd88',2);c.line(3,first-h,35,second-h,'#e8d3a3');}for(const[x,base]of[[2,first],[34,second]]){c.rect(x-1,base-22,4,23,'#7f684b');c.rect(x,base-22,2,21,'#bb9b6b');c.rect(x-2,base-22,6,3,'#e3c999');c.rect(x-1,base-24,4,2,'#f2dfb3');c.dot(x,base-9,'#f0d8a4');}},19,28);

sprite('rock',23,18,c=>{shadow(c,10,13,10,3);c.poly([[2,11],[4,5],[11,1],[18,4],[21,11],[15,15],[6,15]],P.stoneDark);c.poly([[3,10],[6,4],[12,2],[19,6],[15,11],[6,12]],P.stone);c.line(6,4,12,3,'#e0d5b1',2);c.rect(3,12,5,2,'#84986d');c.dot(5,11,'#b1ba88');c.line(14,7,17,9,'#9b9f88');});
sprite('wildflowers',28,26,c=>{tuft(c,4,24);tuft(c,20,23);plant(c,9,24,'daisy',9);plant(c,20,22,'cosmos',11);});
sprite('butterfly-small',14,12,c=>{c.rect(2,1,4,4,P.gold);c.rect(8,1,4,4,P.roseLight);c.rect(3,6,3,3,'#d79460');c.rect(8,6,3,3,P.rose);c.rect(6,3,2,7,P.woodDark);},7,6);
function lamp(c,x,y){c.rect(x,y-43,2,44,P.woodDark);c.rect(x-1,y-43,1,38,P.woodLight);c.line(x,y-43,x+12,y-43,P.woodDark,2);c.rect(x+10,y-43,1,6,P.woodDark);c.poly([[x+6,y-34],[x+10,y-40],[x+16,y-34]],P.woodDark);c.rect(x+7,y-34,9,14,P.woodDark);c.rect(x+8,y-33,7,11,P.gold);c.rect(x+9,y-32,3,8,'#fff0aa');c.rect(x+6,y-20,11,2,P.woodDark);}
sprite('lantern',32,58,c=>{shadow(c,9,53,15,5);lamp(c,7,51);},8,52);
sprite('bench',64,47,c=>{shadow(c,30,39,27,7);for(const [x,y]of[[9,21],[43,37],[23,14],[57,30]]){c.rect(x,y,3,10,P.woodDark);c.rect(x,y,1,9,P.woodLight);}c.poly([[5,25],[21,17],[59,36],[43,44]],P.woodDark);c.poly([[5,23],[21,15],[59,34],[43,42]],P.woodLight);c.line(10,22,48,41,P.wood,2);c.line(16,19,54,38,P.wood,2);c.line(20,17,20,0,P.woodDark,3);c.line(58,36,58,19,P.woodDark,3);for(const y of [1,7,13]){c.line(19,y,59,y+20,P.woodDark,5);c.line(19,y,59,y+20,P.woodLight,3);}c.line(6,21,6,14,P.woodDark,2);c.line(6,14,20,7,P.wood,2);},32,39);
sprite('cottage',90,100,c=>{
 shadow(c,44,89,40,10);c.poly([[15,49],[51,31],[80,46],[80,78],[44,96],[15,80]],P.woodDark);c.poly([[16,50],[45,64],[45,91],[16,77]],'#dcc68e');c.poly([[45,64],[78,47],[78,77],[45,93]],'#b5a879');
 for(let j=0;j<4;j++){c.line(17,56+j*7,43,69+j*7,'#c7ac76');c.line(47,70+j*6,76,55+j*6,'#9e906a');}c.poly([[8,49],[34,7],[84,32],[51,72]],'#69434b');c.poly([[8,46],[34,5],[82,29],[50,68]],'#a35b63');c.poly([[50,68],[82,29],[85,34],[56,73]],'#783f50');
 for(let j=0;j<7;j++){const t=j/7;c.line(12+25*t,45-36*t,50+30*t,64-36*t,j%2?'#bc7472':'#d08c7d',2);for(let k=0;k<4;k++)c.dot(17+25*t+k*9,46-36*t+k*4,'#824b56');}c.line(33,5,82,29,'#e7a78b',2);
 c.poly([[62,22],[62,8],[69,5],[74,8],[74,29]],'#a47c66');c.poly([[62,8],[68,5],[75,8],[69,11]],'#d6ad88');c.rect(65,8,4,2,P.woodDark);
 c.poly([[27,66],[37,71],[37,87],[27,82]],P.woodDark);c.line(29,68,29,82,P.wood,2);c.dot(34,78,P.gold);
 c.poly([[53,70],[65,64],[65,75],[53,81]],P.woodDark);c.poly([[55,70],[63,66],[63,74],[55,78]],'#f4d37c');c.line(59,68,59,76,'#a87b4e');c.line(55,74,63,70,'#a87b4e');
 c.poly([[19,58],[24,61],[24,68],[19,65]],'#7c9b8b');c.line(19,58,24,60,P.cream);c.rect(72,65,3,15,P.leafDark);blossom(c,74,65,'rose');c.rect(47,87,6,2,'#9d8263');c.rect(44,91,8,2,'#c2aa7b');
},45,91);
sprite('birdhouse',36,57,c=>{shadow(c,16,50,14,4);c.rect(15,25,4,27,P.woodDark);c.rect(15,29,2,22,P.woodLight);c.poly([[7,17],[18,11],[29,17],[29,31],[18,37],[7,31]],P.woodDark);c.poly([[8,18],[18,23],[18,35],[8,30]],P.woodLight);c.poly([[18,23],[28,18],[28,30],[18,35]],P.wood);c.poly([[3,18],[12,4],[32,14],[20,26]],'#9b6761');c.line(12,4,31,13,'#d49c7b',2);c.rect(11,23,4,5,P.woodDark);c.line(10,31,17,34,P.woodDark,2);},17,51);
sprite('arch',76,81,c=>{shadow(c,35,73,32,7);for(const x of [12,59]){c.rect(x,25,5,49,P.woodDark);c.rect(x,26,2,46,P.woodLight);for(let y=32;y<70;y+=8)c.line(x-1,y,x+5,y-3,P.leaf,3);}c.line(14,27,14,17,P.woodLight,4);c.line(61,27,61,17,P.wood,4);c.line(15,17,24,7,P.woodLight,4);c.line(58,17,49,7,P.wood,4);c.rect(26,5,23,5,P.woodLight);for(const [x,y]of[[13,24],[21,13],[35,7],[49,11],[60,24],[15,47],[61,54]]){c.oval(x,y,8,5,P.leafDark);c.oval(x-2,y-2,6,4,P.leaf);blossom(c,x,y-2,'rose');}c.line(17,73,60,73,'#c4b58b');},38,73);
sprite('fountain',62,62,c=>{shadow(c,29,52,27,8);c.oval(30,49,27,10,P.stoneDark);c.oval(30,45,27,10,P.stone);c.oval(30,43,22,7,P.waterDark);c.oval(29,43,20,5,P.water);c.line(13,43,23,45,P.waterLight);c.rect(27,21,6,24,P.stoneDark);c.rect(27,21,3,24,P.stone);c.oval(30,26,15,6,P.stoneDark);c.oval(30,22,16,6,'#d1cdb0');c.oval(30,21,12,3,P.water);c.rect(29,9,3,12,P.waterLight);c.oval(30,9,4,3,P.stone);for(const side of [-1,1]){c.line(30,14,30+side*9,11,P.waterLight);c.line(30+side*9,11,30+side*19,25,P.waterLight);c.line(30+side*19,25,30+side*21,39,P.waterLight);c.dot(30+side*21,42,P.cream);}c.line(8,45,18,49,'#e2d9b9');},30,51);
sprite('butterfly',44,43,c=>{shadow(c,20,36,20,5);c.oval(21,31,17,7,P.woodDark);c.oval(21,28,17,7,P.woodLight);c.oval(21,27,14,5,P.leafDark);plant(c,12,29,'lavender',12);plant(c,23,27,'daisy',14);plant(c,32,29,'cosmos',10);c.paste(sprites['butterfly-small'].c,5,0);c.paste(sprites['butterfly-small'].c,28,6);},22,35);
sprite('heart',34,54,c=>{shadow(c,16,49,14,4);c.rect(15,23,3,26,P.woodDark);c.rect(15,24,1,23,P.woodLight);c.poly([[16,8],[11,3],[5,3],[2,7],[2,16],[16,31],[30,16],[30,7],[26,3],[21,3]],P.roseDark);c.poly([[16,11],[10,5],[5,5],[4,9],[4,15],[16,28],[27,15],[27,8],[24,5],[21,5]],P.rose);c.line(7,7,7,13,P.roseLight,2);c.rect(8,6,4,2,P.roseLight);c.rect(12,34,9,2,P.roseLight);},16,48);
sprite('tree',72,96,c=>tree(c,true));
sprite('seasonal',46,30,c=>{shadow(c,22,23,20,6);for(const [x,y,r]of[[13,18,10],[32,20,9]]){c.oval(x,y,r,r*.7|0,'#9f623d');c.oval(x-1,y-2,r-1,r*.7-1|0,'#d98f47');c.line(x-3,y-7,x-4,y+3,'#f1b660',2);c.line(x+3,y-7,x+5,y+3,'#b7753d');c.rect(x-1,y-12,3,6,P.leafDark);}});
for(const kind of ['box','special'])sprite(`gift-${kind}`,32,35,c=>{shadow(c,15,29,13,4);const col=kind==='box'?['#a4506a','#d47e91','#f4afac']:['#68517f','#9c7faf','#c6aad1'];c.poly([[3,14],[16,7],[29,14],[29,27],[16,34],[3,27]],col[0]);c.poly([[4,15],[16,21],[16,32],[4,26]],col[1]);c.poly([[16,21],[28,15],[28,26],[16,32]],col[0]);c.poly([[2,12],[16,5],[30,12],[16,20]],col[2]);c.line(9,9,23,16,P.cream,3);c.line(22,8,9,15,P.gold,3);c.line(10,17,10,29,P.cream,2);c.line(23,18,23,28,P.gold,2);c.oval(12,5,5,3,P.gold);c.oval(20,5,5,3,P.gold);c.rect(10,3,3,2,P.cream);c.rect(18,3,3,2,P.cream);c.rect(15,4,3,6,P.woodLight);},16,30);
sprite('gift-teddy',35,42,c=>{shadow(c,16,36,14,4);c.oval(17,27,10,11,'#936445');c.oval(15,26,8,10,'#c7935c');c.oval(16,27,5,6,'#e1b97d');for(const x of[7,27]){c.oval(x,8,5,5,'#936445');c.oval(x-1,7,3,3,'#d6a66c');c.oval(x,28,4,6,'#ba8653');c.oval(x-1,35,6,4,'#a9754d');}c.oval(17,14,12,11,'#936445');c.oval(15,13,11,10,'#d6a66c');c.oval(16,18,5,4,'#efcc95');c.rect(10,12,2,3,P.woodDark);c.rect(21,12,2,3,P.woodDark);c.rect(15,16,3,2,P.woodDark);c.dot(16,19,P.woodDark);c.rect(12,23,9,3,P.roseDark);c.rect(10,22,4,5,P.rose);c.rect(20,22,4,5,P.rose);},17,37);
sprite('gift-letter',32,25,c=>{shadow(c,16,19,13,4);c.poly([[2,8],[19,0],[31,8],[31,19],[14,25],[2,18]],'#ac895a');c.poly([[3,7],[18,1],[29,7],[29,17],[14,23],[3,17]],P.cream);c.line(3,7,17,14,'#cbaa76');c.line(17,14,29,7,'#cbaa76');c.line(4,17,10,12,'#cbaa76');c.rect(15,12,5,4,P.roseDark);c.rect(15,11,4,3,P.rose);},16,21);
sprite('gift-bouquet',36,42,c=>{shadow(c,17,36,13,5);c.poly([[4,13],[17,38],[24,36],[32,12]],'#b7986b');c.poly([[5,12],[18,35],[23,33],[24,15]],P.cream);for(const [x,y,type]of[[9,12,'rose'],[23,12,'rose'],[17,6,'daisy'],[15,17,'cosmos']])blossom(c,x,y,type);c.line(13,28,26,24,P.rose,3);c.line(19,27,13,36,P.roseDark,2);},18,37);
sprite('gift-chocolate',34,28,c=>{shadow(c,16,23,14,4);c.poly([[2,10],[17,2],[32,10],[32,20],[17,28],[2,20]],P.roseDark);c.poly([[2,8],[17,0],[32,8],[17,17]],P.roseLight);c.poly([[5,8],[17,2],[29,8],[17,14]],'#704c40');for(const[x,y]of[[11,6],[17,3],[23,6],[17,9]]){c.rect(x-2,y,4,3,'#ad7853');c.rect(x-2,y,3,1,'#d1a16f');}c.line(2,19,16,26,P.rose,2);},17,24);
// A tiny, original bitmap alphabet keeps the sign legible and consistent with the art.
const font={
 A:['01110','10001','10001','11111','10001','10001','10001'],B:['11110','10001','10001','11110','10001','10001','11110'],C:['01111','10000','10000','10000','10000','10000','01111'],G:['01111','10000','10000','10111','10001','10001','01110'],L:['10000','10000','10000','10000','10000','10000','11111'],M:['10001','11011','10101','10101','10001','10001','10001'],
 a:['00000','00000','01110','00001','01111','10001','01111'],b:['10000','10000','10110','11001','10001','10001','11110'],d:['00001','00001','01101','10011','10001','10001','01111'],e:['00000','00000','01110','10001','11111','10000','01110'],h:['10000','10000','10110','11001','10001','10001','10001'],i:['00100','00000','01100','00100','00100','00100','01110'],n:['00000','00000','11110','10001','10001','10001','10001'],o:['00000','00000','01110','10001','10001','10001','01110'],r:['00000','00000','10110','11001','10000','10000','10000'],s:['00000','00000','01111','10000','01110','00001','11110'],v:['00000','00000','10001','10001','10001','01010','00100'],z:['00000','00000','11111','00010','00100','01000','11111'],"'":['00100','00100','01000','00000','00000','00000','00000'],' ':Array(7).fill('00000')};
function text(c,label,x,y,col){for(const char of label){const pattern=font[char]||font[' '];pattern.forEach((row,j)=>[...row].forEach((on,i)=>{if(on==='1')c.dot(x+i,y+j,col);}));x+=6;}}
sprite('sign',140,65,c=>{shadow(c,70,57,61,7);for(const x of[20,115]){c.rect(x,25,5,36,P.woodDark);c.rect(x,29,2,30,P.woodLight);}c.poly([[3,4],[135,4],[139,8],[139,36],[135,40],[3,40],[0,36],[0,8]],P.woodDark);c.rect(3,6,132,30,'#ca945b');c.rect(3,6,132,2,'#e7ba78');c.rect(4,20,130,1,'#b9804c');c.rect(4,37,130,2,'#98643f');c.line(7,10,21,10,'#dca66a');c.line(110,34,131,34,'#ad7648');text(c,"Mehezad and Labib's",16,11,P.woodDark);text(c,'LoveGarden',40,26,P.woodDark);for(const x of[7,131]){c.rect(x,13,2,2,P.woodDark);c.dot(x,13,'#eee0ad');c.rect(x,30,2,2,P.woodDark);}c.rect(68,46,3,3,P.rose);},70,58);

for(const name of ['gift-box','gift-special']){const c=sprites[name].c;for(const[x,y]of[[6,20],[13,24],[19,23],[25,20]])c.dot(x,y,'#f3d4c2');c.line(4,16,4,24,'#f2b6b5');}
{const c=sprites['gift-teddy'].c;c.dot(10,12,'#fff4dd');c.dot(21,12,'#fff4dd');c.rect(9,17,3,1,'#d9a081');c.rect(22,17,3,1,'#c28a6b');c.line(13,28,17,32,'#f0cd95');c.dot(9,34,'#d6ad77');}
{const c=sprites['gift-bouquet'].c;c.line(8,20,17,31,'#eedbb0');c.line(23,20,22,28,'#c1a174');c.rect(17,27,3,2,'#f4c9cf');}
{const c=sprites['bench'].c;c.rect(39,25,9,5,'#b47e8d');c.rect(39,24,8,4,'#dfb0b5');c.line(10,25,41,41,'#eccd94');}
{const c=sprites['cottage'].c;c.line(54,83,74,73,'#7a8d56',2);c.line(55,81,74,72,'#99ae70',2);for(const[x,y]of[[56,79],[64,75],[72,71]]){c.rect(x,y,2,2,'#f2bbc0');c.dot(x,y-1,'#fff0ce');}c.line(18,74,24,77,'#a0ac76');}
{const c=sprites['fountain'].c;c.line(12,46,18,48,'#e5e5c3');c.line(37,45,48,42,'#b8d9cb');c.rect(30,31,1,9,'#d8e5d5');}

function heartStone(c,x,y,r){
 c.poly([[x-r,y],[x-r+1,y-3],[x-3,y-4],[x,y-2],[x+3,y-4],[x+r,y-3],[x+r,y],[x,y+5]],'#a86c78');
 c.poly([[x-r+1,y-1],[x-r+2,y-3],[x-3,y-3],[x,y-1],[x+3,y-3],[x+r-1,y-2],[x+r-1,y],[x,y+3]],'#dda0a2');
 c.line(x-r+3,y-2,x-2,y-2,'#f3c4b7');
}
sprite('garden-birdhouse',38,51,c=>{
 shadow(c,18,44,9,4);c.rect(16,15,5,30,P.woodDark);c.rect(16,18,2,25,P.woodLight);
 c.rect(9,13,18,16,'#79aaa1');c.rect(23,14,4,15,'#4c7770');c.rect(10,20,2,7,'#94c0ad');
 c.poly([[7,15],[18,5],[29,15],[26,17],[18,10],[10,17]],'#a76158');
 c.line(8,14,18,5,'#d99179',2);c.oval(17,19,3,3,'#3e5147');c.rect(15,24,7,2,P.woodLight);
},18,44);
sprite('heart-stepping-stones',48,32,c=>{
 for(const [x,y,r] of [[11,20,7],[23,14,8],[35,8,6]]){shadow(c,x-5,y,r,4);heartStone(c,x,y,r);}
},23,15);
sprite('glowing-mushrooms',44,36,c=>{
 shadow(c,21,29,13,5);
 for(const [x,y,r,m,h] of [[11,22,6,'#b17bb0','#edd3dc'],[22,16,9,'#d58e63','#ffe5a4'],[32,23,6,'#9780ab','#e6c3d6']]){
  c.rect(x-2,y,4,9,'#c6b38b');c.rect(x-2,y,2,8,'#eee1bc');
  c.oval(x,y,r,4,'#855f65');c.oval(x-1,y-2,r-1,4,m);c.rect(x-3,y-4,3,2,h);c.dot(x+2,y-3,h);
 }
},22,28);
sprite('flower-cart',52,43,c=>{
 shadow(c,25,36,17,5);c.line(31,25,48,18,P.woodDark,3);c.line(31,24,47,17,P.woodLight);
 c.poly([[7,20],[29,15],[39,22],[16,29]],P.woodLight);c.poly([[7,20],[16,27],[16,33],[7,27]],P.woodDark);
 c.poly([[16,27],[39,22],[39,28],[16,34]],'#a87552');c.line(19,28,36,24,'#d4a275');
 c.oval(23,33,6,6,'#5d4a3e');c.oval(23,33,4,4,'#bf935b');c.dot(23,33,P.cream);
 for(const [x,y,t] of [[13,18,'daisy'],[22,16,'rose'],[31,19,'lavender'],[19,22,'cosmos']])blossom(c,x,y,t);
},25,35);
sprite('picnic-spot',69,46,c=>{
 shadow(c,30,34,24,8);diamond(c,33,27,29,13,'#b97982');diamond(c,33,25,27,12,'#f1c8b7');
 for(let i=-16;i<=16;i+=8){c.line(14+i/2,25-i/4,37+i/2,35-i/4,'#ce8f96',2);c.line(33+i/2,14+i/4,55+i/2,25+i/4,'#db9ea3',2);}
 c.oval(39,25,8,3,'#b48451');c.rect(32,20,14,6,'#c69b66');c.line(34,20,34,16,P.woodDark);c.line(34,16,43,16,P.woodDark);c.line(43,16,43,20,P.woodDark);
 c.oval(24,28,5,3,'#fff0cd');c.rect(23,26,3,2,P.rose);c.oval(36,32,5,3,'#fff0cd');
},33,28);
sprite('garden-swing',69,72,c=>{
 shadow(c,32,63,23,8);c.line(15,62,23,18,P.woodDark,4);c.line(55,60,47,19,P.woodDark,4);
 c.line(17,59,24,18,P.woodLight,2);c.line(52,55,46,18,'#c29465',2);
 c.line(19,16,50,16,P.woodDark,5);c.line(20,16,48,16,P.woodLight,2);
 c.line(25,20,25,48,'#b9a486',2);c.line(44,20,44,48,'#95816b',2);
 c.poly([[22,46],[42,46],[48,50],[28,52]],'#d3a570');c.line(28,52,47,50,P.woodDark,2);
 c.rect(29,45,12,4,'#b8798c');c.line(30,45,39,45,'#ecc3c4');
},34,57);
sprite('koi-pond',76,52,c=>{
 shadow(c,37,31,26,10);c.oval(37,26,33,17,'#687d72');c.oval(37,24,32,16,'#b2b89b');
 c.oval(37,22,28,13,'#7ea69e');c.oval(37,22,25,10,'#508a91');c.line(19,20,28,18,'#9ac6ad');c.line(45,28,54,26,'#83b6a6');
 for(const [x,y] of [[11,24],[17,32],[26,36],[50,35],[58,31],[65,24],[55,13],[44,10],[26,11],[17,16]]){
  c.oval(x,y,4,2,'#8e9983');c.oval(x-1,y-1,3,1,'#d5d0ad');
 }
},37,25);
sprite('cherry-blossom-tree',86,91,c=>{
 shadow(c,41,80,26,9);c.line(41,80,41,41,P.woodDark,7);c.line(42,77,37,42,'#996b59',3);
 c.line(43,66,61,50,P.woodDark,4);c.line(41,65,26,46,'#a77663',4);
 for(const [x,y,r] of [[25,42,15],[59,42,16],[43,26,22],[21,32,15],[64,32,14],[43,44,20],[39,22,17]]){
  c.oval(x,y,r,12,'#a27287');c.oval(x-1,y-2,r-1,11,'#d496ab');c.oval(x-3,y-5,r-4,8,'#edb9c3');c.line(x-7,y-8,x-1,y-9,'#ffdccf',2);
 }
 for(const [x,y] of [[23,71],[55,76],[62,72],[34,82]])c.rect(x,y,2,1,'#e3a8b4');
},43,80);
sprite('rose-heart-arch',88,91,c=>{
 shadow(c,42,80,30,8);
 for(const offset of [0,1]){
  const path=[[17,80],[17,52],[12,43],[12,28],[20,19],[32,18],[43,31],[54,18],[66,19],[74,28],[74,43],[69,52],[69,80]];
  for(let i=1;i<path.length;i++){const [x,y]=path[i-1], [xx,yy]=path[i];c.line(x+offset,y,xx+offset,yy,offset?'#73935d':'#46674f',offset?3:5);}
 }
 for(const [x,y] of [[18,24],[29,18],[37,25],[52,23],[64,19],[72,28],[69,48],[18,52],[19,65],[67,64]])blossom(c,x,y,'rose');
},43,80);
sprite('romantic-gazebo',108,103,c=>{
 shadow(c,53,90,39,9);diamond(c,54,82,42,17,'#a9987e');diamond(c,54,79,40,16,'#e2cc9e');
 c.rect(36,64,37,4,'#a57e5f');c.rect(37,62,35,3,'#c39b72');
 for(const [x,y] of [[19,77],[84,77],[37,88],[69,88]]){c.rect(x,42,4,y-42,'#916950');c.rect(x,43,1,y-42,'#ecc593');}
 c.poly([[8,49],[29,35],[54,12],[79,35],[100,49],[54,63]],'#8d627d');
 c.poly([[8,49],[54,13],[54,58]],'#bc8495');c.poly([[54,13],[100,49],[54,58]],'#a16f8e');
 c.line(10,49,53,59,'#e4b4a8',2);c.line(54,59,97,49,'#b78b9c',2);
 for(const x of [20,84]){c.rect(x,53,5,8,'#835a4d');c.rect(x+1,54,3,5,'#edbf77');}
},54,86);
sprite('moonlit-bridge',100,63,c=>{
 shadow(c,48,50,37,9);c.oval(50,45,40,11,'#769293');c.line(16,45,35,50,'#96b6a5',2);
 const arch=[24,19,16,15,16,19,24];
 for(let i=0;i<arch.length;i++){
  const x=11+i*11,y=arch[i]+13;
  c.poly([[x,y],[x+11,y],[x+20,y+9],[x+9,y+10]],i%2?'#c6a278':'#d8b78b');
  c.line(x+9,y+10,x+20,y+9,'#805b52',2);
 }
 c.line(13,33,43,21,P.woodDark,2);c.line(43,21,77,33,P.woodDark,2);
 for(const [x,y] of [[13,36],[78,36],[22,44],[87,44]]){c.rect(x,y-13,3,14,'#83675c');c.rect(x-1,y-15,5,5,'#f0d38f');c.line(x-2,y-16,x+4,y-16,'#65525b');}
},50,45);
sprite('fairy-cottage',107,105,c=>{
 shadow(c,52,91,37,8);
 c.poly([[19,49],[50,59],[50,91],[19,80]],'#e5c292');c.poly([[50,59],[91,46],[91,77],[50,91]],'#b9997e');
 c.poly([[12,50],[28,22],[67,11],[99,45],[50,65]],'#704e67');
 c.poly([[14,49],[29,21],[67,11],[50,35]],'#ba7987');c.poly([[29,21],[50,35],[50,61],[14,49]],'#a76979');
 c.poly([[50,35],[67,11],[97,44],[50,61]],'#986478');
 for(let y=24;y<47;y+=6)c.line(29,y,45,y+7,'#d09395');
 c.rect(73,21,7,15,'#80665c');c.rect(73,21,7,3,'#c7a394');
 c.oval(39,71,6,8,'#765a52');c.rect(33,71,13,15,'#765a52');c.dot(43,76,P.gold);
 c.rect(23,62,7,8,'#8c6558');c.rect(24,63,5,6,'#ffe0a0');c.rect(66,63,9,9,'#805e57');c.rect(67,64,7,7,'#f2c986');
 c.line(19, 80,27,76,'#6d9162',2);c.line(76,82,89,77,'#739762',2);
},52,86);

const newBlossom=(c,x,y,kind)=>{
 if(kind==='sunflower'){
  for(const [dx,dy] of [[-6,0],[-4,-4],[0,-6],[4,-4],[6,0],[4,4],[0,6],[-4,4]])c.oval(x+dx,y+dy,3,3,'#daa245');
  c.oval(x,y,7,6,'#f0c654');c.oval(x,y,5,4,'#85533e');c.oval(x-1,y-1,3,2,'#a7734a');c.dot(x-2,y-2,'#d7a867');
 }else if(kind==='peony'){
  c.oval(x,y,9,7,'#a25476');c.oval(x-2,y-3,6,5,'#d584a0');c.oval(x+3,y-1,6,5,'#cc6e90');
  c.oval(x-2,y,5,4,'#eca4b9');c.oval(x+2,y+3,5,3,'#d98ba5');c.line(x-5,y-3,x-2,y-4,'#ffd2cf');c.dot(x,y,'#fff0c6');
 }else{
  const jasmine=kind==='jasmine';
  for(const [dx,dy] of [[0,-2],[-2,0],[2,0],[-1,2],[1,2]])c.rect(x+dx-1,y+dy-1,2,2,jasmine?'#fff3d9':'#93b9e5');
  c.dot(x,y,jasmine?'#e8cf8f':'#f4d48c');c.dot(x-2,y-1,jasmine?'#fffaf0':'#cfdef3');
 }
};
for(const kind of ['sunflower','peony','forget-me-not','jasmine'])for(let stage=0;stage<4;stage++){
 sprite(`flower-${kind}-${stage}`,42,53,c=>{
  shadow(c,21,47,9,4);
  if(stage===0){c.oval(21,46,6,3,'#6c523e');c.rect(19,44,4,3,'#dabb8a');c.dot(20,44,'#f4dba3');return;}
  const h=stage===1?10:stage===2?19:kind==='sunflower'?35:kind==='peony'?25:22;
  c.line(21,47,20,47-h,P.leafDark,2);
  c.poly([[21,43],[16,35],[10,34],[12,39],[18,44]],P.leafLight);
  c.poly([[21,40],[25,33],[32,30],[30,36],[25,40]],P.leaf);
  if(stage===1){c.line(19,38,16,35,P.leafLight);return;}
  const y=47-h;
  if(stage===2){c.oval(20,y,4,5,kind==='sunflower'?'#d7a443':kind==='peony'?'#bd7293':kind==='jasmine'?'#ddd6ab':'#7f96c2');c.dot(18,y-2,'#e7d6ad');return;}
  newBlossom(c,20,y,kind);
  if(kind==='forget-me-not'||kind==='jasmine')for(const [x,yy] of [[13,y+5],[26,y+3],[29,y+8]]){c.line(21,y+15,x,yy,P.leaf);newBlossom(c,x,yy,kind);}
 },21,47);
}
sprite('lily-spot',19,12,c=>{c.oval(9,6,8,4,'#568f7c');c.line(4,4,10,3,'#83b69d');c.dot(11,6,'#c0d6ab');},9,6);
for(const [kind,dark,mid,light] of [
 ['pink-water-lily','#a45e82','#dc91ad','#ffd6d6'],['white-water-lily','#9eaea6','#e6e7d0','#fff5de'],['moon-lily','#66568e','#9b90cb','#d4c7f4'],
])for(let stage=0;stage<4;stage++){
 sprite(`flower-${kind}-${stage}`,34,30,c=>{
  c.oval(17,22,stage===0?7:12,stage===0?3:5,'#5a9b8e');
  c.oval(16,21,stage===0?6:10,stage===0?2:4,'#467a58');
  c.oval(15,20,stage===0?5:9,stage===0?2:3,'#83ae72');
  c.poly([[16,21],[28,18],[26,23]],'#6aa699');
  c.line(8,21,14,19,'#b6ce91');
  if(stage===0){c.rect(14,18,3,2,'#cbb480');return;}
  if(stage===1){c.line(16,19,16,14,'#779c68',2);c.dot(16,14,'#c4d08b');return;}
  if(stage===2){c.oval(16,14,4,6,dark);c.oval(15,13,3,5,mid);c.rect(14,9,2,3,light);return;}
  c.poly([[6,15],[12,14],[12,8],[16,11],[19,5],[22,11],[28,13],[24,18],[16,20],[9,18]],dark);
  c.poly([[7,14],[13,14],[13,8],[17,13],[19,7],[22,13],[27,13],[22,17],[15,18]],mid);
  c.line(11,14,16,16,light);c.line(16,11,17,15,light);c.line(19,8,19,13,light);c.line(24,13,20,16,light);
  c.rect(16,15,4,2,kind==='moon-lily'?'#dcdcff':'#efd684');c.line(10,25,15,25,'#a5cbb6');
 },16,21);
}

// Packing uses integer coordinates; every sprite has an explicit foot anchor for depth sorting.
let ax=0,ay=0,rowH=0;const atlasWidth=512,frames={};for(const [name,{c,anchorX,anchorY}]of Object.entries(sprites)){if(ax+c.w+2>atlasWidth){ax=0;ay+=rowH+2;rowH=0;}frames[name]={x:ax,y:ay,w:c.w,h:c.h,anchorX,anchorY};ax+=c.w+2;rowH=Math.max(rowH,c.h);}
const atlas=new Pixels(atlasWidth,ay+rowH);for(const[name,{c}]of Object.entries(sprites)){const f=frames[name];atlas.paste(c,f.x,f.y);}
await mkdir('public/art',{recursive:true});await mkdir('src/garden',{recursive:true});
await writeFile('public/art/atlas.png',await atlas.png());
await writeFile('public/art/terrain.png',await expandedTerrain().png());
await writeFile('src/garden/atlas.json',JSON.stringify({width:atlas.w,height:atlas.h,frames},null,2)+'\n');
await writeFile('public/art/LICENSE.txt','LoveGarden pixel-art assets\nOriginal artwork authored for this project. No third-party game art or fonts are included.\nThe source artwork is reproducible with scripts/pixel-art.mjs.\n');
console.log(`Created ${Object.keys(frames).length} original sprites and the isometric terrain.`);

function expandedTerrain(){
 const bounds=gardenBounds,c=new Pixels(bounds.width,bounds.height);
 const at=(u,v)=>{const p=iso(u,v);return [p.x-bounds.x,p.y-bounds.y];};
 const corners=[at(grid.minU,grid.minV),at(grid.maxU,grid.minV),at(grid.maxU,grid.maxV),at(grid.minU,grid.maxV)];
 const shift=(p,x,y)=>[p[0]+x,p[1]+y];
 c.poly(corners.map(p=>shift(p,8,29)),[36,56,44,34]);
 for(const [i,j,col,strata] of [[3,2,'#785b43','#a07b51'],[2,1,'#574c3b','#766649']]){
  const a=corners[i],b=corners[j];
  c.poly([a,b,shift(b,0,28),shift(a,0,28)],col);
  c.line(...shift(a,0,11),...shift(b,0,11),strata,2);
  for(let n=0;n<125;n++){const t=rand();c.rect(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t+6+rand()*15,2+rand()*5,1+rand()*3,strata);}
 }
 c.poly(corners,'#89ac6e');
 const path=(u,v)=>u===4&&v>=-8&&v<3 || v===-2&&u>=-8&&u<=26 ||
  u===21&&v>=-2&&v<=20 || v===10&&u>=18&&u<=27 ||
  v===20&&u>=-5&&u<=26 || u===6&&v>=17&&v<=24 ||
  u===-8&&v>=-2&&v<=19 || v===6&&u>=-8&&u<=0 || v===16&&u>=-8&&u<=0;
 for(let u=grid.minU;u<grid.maxU;u++)for(let v=grid.minV;v<grid.maxV;v++){
  if(u>=0&&u<20&&v>=0&&v<18)continue;
  const [x,y]=at(u+.5,v+.5),stone=path(u,v);
  const clearing=decorSlots.some(p=>p.capacity&&Math.abs(p.u-u-.5)<1.6&&Math.abs(p.v-v-.5)<1.6);
  const patch=.5+.23*Math.sin(u*.63+v*.31)+.22*Math.cos(v*.79-u*.14);
  diamond(c,x,y,16,8,stone?'#c4b083':clearing?blend('#92ab6b','#b0bf83',patch):blend('#78a367','#a0bc78',patch));
  if(stone){
   c.poly([[x-14,y],[x-1,y-6],[x+13,y],[x+1,y+5]],blend('#c6b08b','#e1d2a9',rand()));
   c.line(x-11,y-1,x-1,y-6,'#e2d2ad');c.line(x+1,y+5,x+11,y,'#b69e7a');
  }else{
   for(let k=0;k<(clearing?6:12);k++){
    const dx=Math.floor(rand()*28)-14,dy=Math.floor(rand()*12)-6;
    if(Math.abs(dx)/16+Math.abs(dy)/8<.85)c.rect(x+dx,y+dy,k%3===0?2:1,1,k%3===0?'#b3cc86':'#739c60');
   }
   if(!clearing&&rand()<.17)tuft(c,x+2,y-1);
   if(!clearing&&rand()<.08){c.rect(x-3,y-1,2,2,'#f4e4aa');c.dot(x+1,y-3,'#e3adb2');}
  }
  if(u===grid.maxU-1||v===grid.maxV-1){
   c.line(x-15,y+1,x,y+8,'#547b50',2);c.line(x,y+8,x+15,y,'#547b50',2);
  }
 }
 // Keep the original ground pixels. Its old cutaway is outside this mask.
 for(let y=64;y<369;y++)for(let x=32;x<=640;x++){
  const {u,v}=groundPoint(x,y);
  if(u<0||u>20||v<0||v>18)continue;
  const i=(y*terrain.w+x)*4;
  if(terrain.data[i+3])c.dot(x-bounds.x,y-bounds.y,[...terrain.data.subarray(i,i+4)]);
 }
 // The sheltered west inlet joins the old pond. Texture remains mostly open water.
 for(let y=62;y<231;y++)for(let x=-38;x<298;x++){
  const {u,v}=groundPoint(x,y),r=pondRadius(u,v);
  if(r>1.10)continue;
  const shallow=Math.max(0,(r-.43)/.57);
  let ink=r>1?(r>1.065?'#759664':'#a5b288'):blend('#4e8b9a','#91c8b8',shallow);
  if(r<.9&&Math.sin(x*.18+y*.59)>.95)ink=blend('#69a6a8','#a6cfc2',shallow*.65);
  c.dot(x-bounds.x,y-bounds.y,ink);
 }
 for(const [u,v] of [[-6.3,11.1],[-5.5,9],[-4.1,14],[-1,14.5],[.8,8.1],[4.6,9.6],[4.8,12.3]]){
  const [x,y]=at(u,v);c.oval(x,y,5,2,'#71936e');c.oval(x-1,y-1,4,2,'#b6bda0');c.rect(x-3,y-2,3,1,'#e0d7b1');
 }
 for(const [u,v] of [[2,10],[3.5,11],[3,12.4],[1.8,11.4]]){
  const [x,y]=at(u,v);c.oval(x,y,6,3,'#467f5a');c.oval(x-1,y-1,5,2,'#86b56c');
  c.poly([[x,y],[x+6,y],[x+5,y+3]],P.water);c.line(x-3,y-2,x+1,y-2,'#b7d38d');if(u===2)blossom(c,x,y-3,'cosmos');
 }
 return c;
}

