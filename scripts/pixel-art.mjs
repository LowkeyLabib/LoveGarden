/** Original LoveGarden pixel artwork. No imported or third-party game assets.
 * Integer raster primitives, a shared palette and a fixed upper-left light source.
 * Rebuild with: node scripts/pixel-art.mjs
 */
import sharp from 'sharp';
import { writeFile, mkdir } from 'node:fs/promises';
const P={ink:'#343d35',dark:'#3e5840',grass:'#83aa55',grassLight:'#a9c365',grassDark:'#71994a',leaf:'#5a8949',leafLight:'#91b95a',leafDark:'#386247',wood:'#a77548',woodLight:'#d6a362',woodDark:'#694e3d',bark:'#805b3e',cream:'#f8e5b0',rose:'#d77388',roseLight:'#f3acac',roseDark:'#984f70',gold:'#efc15d',water:'#62a9b0',waterLight:'#a3d9cf',waterDark:'#3b7d91',stone:'#b7b9a0',stoneDark:'#747e76'};
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
 c.rect(x-3,y-4,3,2,light);c.rect(x,y-2,2,2,light);c.rect(x-1,y,3,2,type==='rose'?dark:P.gold);c.dot(x,y,'#fff0b3');
}
function plant(c,x,y,type,height=16){c.line(x,y,x,y-height,P.leafDark,2);c.line(x,y-4,x-6,y-8,P.leaf,2);c.line(x+1,y-8,x+6,y-12,P.leafLight,2);blossom(c,x,y-height,type);}
const sprites={};function sprite(name,w,h,draw,anchorX=Math.floor(w/2),anchorY=h-4){const c=new Pixels(w,h);draw(c);sprites[name]={c,anchorX,anchorY};return c;}
const project=(u,v)=>[320+(u-v)*16,64+(u+v)*8];
const terrain=new Pixels(720,450);
// Raised island: darker eastern soil, warm western cutaway, rock and root strata.
terrain.poly([[32,208],[352,368],[352,399],[32,239]],'#765842');
terrain.poly([[352,368],[640,224],[640,255],[352,399]],'#574c3b');
terrain.line(33,223,351,382,'#a07c50',3);terrain.line(354,382,638,240,'#736445',3);
for(let i=0;i<200;i++){const left=i%2===0,t=rand();const x=left?32+t*320:352+t*288;const y=left?208+t*160:368-t*144;terrain.rect(x,y+9+rand()*15,2+rand()*6,2+rand()*4,left?'#9b7950':'#736346');}
for(let i=0;i<25;i++){const x=48+i*23,y=x<352?216+(x-48)*.5:368-(x-352)*.5;terrain.line(x,y+3,x+2,y+10,P.leafDark);terrain.line(x+2,y+10,x,y+15,P.leafDark);}
function pathTile(u,v){return u===5&&v>=3&&v<=14 || v===12&&u>=5&&u<=17 || u===17&&v>=4&&v<=12 || v===4&&u>=5&&u<=17;}
const pond=(u,v)=>((u-3.1)/2.5)**2+((v-11)/3.0)**2<1;
for(let sum=0;sum<=36;sum++)for(let u=0;u<20;u++){const v=sum-u;if(v<0||v>=18)continue;const [x,y]=project(u+.5,v+.5);const isPath=pathTile(u,v),isPond=pond(u,v);const palette=isPond?['#64a7ad','#609fa9','#6fb4b7']:isPath?['#cfba83','#d5c48e','#c5ad79']:['#8caf59','#84a853','#91b35c','#88ac55'];diamond(terrain,x,y,16,8,palette[(u*11+v*7)%palette.length]);
 if(isPath){terrain.line(x-13,y+1,x,y+7,'#b49b6b');for(let k=0;k<3;k++)terrain.rect(x-10+rand()*20,y-3+rand()*7,2,1,'#e5d6a3');}
 else if(isPond){if(!pond(u-1,v)||!pond(u,v-1)){terrain.line(x-15,y,x,y-7,'#a4bb87',2);terrain.line(x,y-7,x+15,y,'#779767',2);}if(!pond(u+1,v)||!pond(u,v+1))terrain.line(x-14,y+1,x,y+7,P.waterDark,2);terrain.rect(x-5,y-1,7,1,'#82c5c6');}
 else{for(let k=0;k<9;k++){const dx=Math.floor(rand()*28)-14,dy=Math.floor(rand()*12)-6;if(Math.abs(dx)/16+Math.abs(dy)/8<.85)terrain.rect(x+dx,y+dy,1+Math.floor(rand()*3),1,k%3===0?'#a3c368':'#7ca24f');}if((u*7+v*11)%9===0)tuft(terrain,x,y-2);}
 if(u===19||v===17){terrain.line(x-15,y+1,x,y+8,P.leafDark,2);terrain.line(x,y+8,x+15,y,P.leafDark,2);terrain.rect(x-6,y+6,5,3,'#6f9147');}
}
// Lily pads and pixel reflections, placed in the water rather than a separate plane.
for(const [u,v] of [[2,10],[3.5,11],[3,12.4],[1.8,11.4]]){const [x,y]=project(u,v);terrain.oval(x,y,6,3,'#467f5a');terrain.oval(x-1,y-1,5,2,'#86b56c');terrain.line(x,y,x+5,y+2,P.water);if(u===2)blossom(terrain,x,y-3,'cosmos');}
// Small worn stone details along the main path.
for(let v=5;v<=13;v+=2){const [x,y]=project(5.5,v+.4);terrain.poly([[x-8,y],[x-3,y-3],[x+7,y-1],[x+8,y+2],[x,y+5],[x-8,y+2]],'#b9b99b');terrain.line(x-7,y,x-2,y-2,'#e1d8b3');}
sprite('plot',52,30,c=>{diamond(c,26,16,24,12,'#634f3c');diamond(c,26,13,24,12,'#b18755');diamond(c,26,13,21,10,'#845c3e');for(let i=-12;i<=12;i+=6)c.line(26+i-5,10+i/2,26+i+5,15+i/2,'#684a37');c.line(4,13,26,2,'#d4a568');c.line(26,2,48,13,'#ba8b54');c.rect(24,12,4,2,'#a87847');},26,16);
sprite('marker',13,22,c=>{c.rect(5,9,2,12,P.woodDark);c.rect(1,0,11,11,P.woodDark);c.rect(2,1,9,8,P.woodLight);c.rect(6,2,1,6,P.cream);c.rect(4,4,5,1,P.cream);},6,21);
for(const type of ['rose','daisy','tulip','lavender','cosmos','bluebell'])for(let stage=0;stage<=3;stage++)sprite(`flower-${type}-${stage}`,34,44,c=>{
 shadow(c,15,39,9,3);
 if(stage===0){c.oval(16,36,6,3,'#604a37');c.rect(14,34,4,2,'#dfb97b');c.dot(15,33,P.cream);return;}
 if(stage===1){c.rect(16,28,2,10,P.leafDark);c.poly([[16,33],[9,28],[9,25],[13,26],[17,30]],P.leafLight);c.poly([[17,30],[22,24],[26,23],[25,28],[18,33]],P.leaf);c.dot(23,24,'#b5d47a');return;}
 if(stage===2){c.rect(16,16,2,22,P.leafDark);c.line(16,30,9,25,P.leaf,2);c.line(17,25,24,20,P.leafLight,2);c.oval(17,16,4,6,type==='daisy'?P.gold:type==='lavender'?'#ad92c8':P.rose);c.rect(14,14,2,4,P.roseLight);c.rect(15,22,5,2,P.leaf);return;}
 plant(c,11,37,type,18);plant(c,23,37,type,13);plant(c,17,35,type,25);
});
function tree(c,pink=false,pine=false){
 const colors=pink?['#89566b','#bb7485','#dc929a','#f1b4ab','#f7ceb9']:[P.leafDark,'#47774a','#63934d','#8fb658','#b0cd6c'];shadow(c,32,86,29,9);c.poly([[27,85],[29,48],[36,46],[39,87],[34,90]],P.woodDark);c.rect(29,50,4,35,P.wood);c.rect(29,60,2,22,P.woodLight);c.line(30,69,20,57,P.woodDark,3);c.line(34,61,44,48,P.wood,3);
 if(pine){for(let i=0;i<4;i++){const y=18+i*13,w=12+i*5;c.poly([[32,y-16],[32+w,y+12],[32+10,y+11],[32+w-3,y+17],[32-w,y+16],[32-w+5,y+8]],colors[0]);c.poly([[32,y-13],[32+w-5,y+10],[32,y+7],[32-w+3,y+13]],colors[2]);c.line(32,y-12,32-w+7,y+7,colors[3],2);}return;}
 const clusters=[[20,47,18,14],[45,43,19,17],[15,30,14,13],[31,19,20,16],[47,25,16,14],[33,40,25,19]];
 for(const [x,y,rx,ry] of clusters)c.oval(x,y,rx+1,ry+2,colors[0]);for(const [x,y,rx,ry] of clusters){c.oval(x,y-2,rx,ry,colors[1]);c.oval(x-3,y-5,rx-2,ry-3,colors[2]);c.oval(x-6,y-8,rx-6,ry-6,colors[3]);}
 for(let i=0;i<65;i++){const x=6+rand()*52,y=8+rand()*48;const at=(Math.round(y)*c.w+Math.round(x))*4;if(c.data[at+3])c.rect(x,y,2+rand()*3,1,colors[i%4+1]);}
 for(const [x,y] of [[14,25],[32,10],[44,35],[20,43]]){c.rect(x,y,3,2,colors[4]);if(pink)c.rect(x+3,y+3,2,2,P.cream);}
}
sprite('oak',72,96,c=>tree(c));sprite('cherry',72,96,c=>tree(c,true));sprite('pine',72,96,c=>tree(c,false,true));
sprite('bush',40,28,c=>{shadow(c,18,23,17,5);for(const [x,y,r] of [[9,17,8],[20,11,10],[30,16,8]]){c.oval(x,y,r,r*.65|0,P.leafDark);c.oval(x-1,y-2,r-1,r*.6|0,P.leaf);c.oval(x-3,y-4,r-3,3,P.leafLight);}for(const [x,y]of[[6,13],[20,7],[30,15]]){c.rect(x,y,3,2,P.roseLight);c.dot(x+1,y+1,P.rose);}});
sprite('reeds',22,30,c=>{for(let i=0;i<5;i++){c.line(7+i*2,26,2+i*4,4+i%2*6,P.leafDark);c.line(6+i*2,26,1+i*3,12,P.leafLight);}c.rect(1,3,3,7,P.woodDark);c.rect(13,4,3,7,P.wood);});
for(const axis of ['x','y'])sprite(`fence-${axis}`,38,36,c=>{const y=axis==='x'?6:22,dy=axis==='x'?16:-16;shadow(c,19,29,17,4);for(const k of [7,15]){c.line(3,y+k,35,y+dy+k,P.woodDark,3);c.line(3,y+k-1,35,y+dy+k-1,P.woodLight,2);}for(const [x,base]of[[2,y+20],[34,y+dy+20]]){c.rect(x-1,base-24,4,25,P.woodDark);c.rect(x,base-24,2,23,P.wood);c.rect(x,base-25,2,3,P.cream);}},19,axis==='x'?35:27);
sprite('rock',23,18,c=>{shadow(c,10,13,10,3);c.poly([[2,11],[4,5],[11,1],[18,4],[21,11],[15,15],[6,15]],P.stoneDark);c.poly([[3,10],[6,4],[12,2],[19,6],[15,11],[6,12]],P.stone);c.line(6,4,12,3,'#e0d5b1',2);});
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
// Packing uses integer coordinates; every sprite has an explicit foot anchor for depth sorting.
let ax=0,ay=0,rowH=0;const atlasWidth=512,frames={};for(const [name,{c,anchorX,anchorY}]of Object.entries(sprites)){if(ax+c.w+2>atlasWidth){ax=0;ay+=rowH+2;rowH=0;}frames[name]={x:ax,y:ay,w:c.w,h:c.h,anchorX,anchorY};ax+=c.w+2;rowH=Math.max(rowH,c.h);}
const atlas=new Pixels(atlasWidth,ay+rowH);for(const[name,{c}]of Object.entries(sprites)){const f=frames[name];atlas.paste(c,f.x,f.y);}
await mkdir('public/art',{recursive:true});await mkdir('src/garden',{recursive:true});
await writeFile('public/art/atlas.png',await atlas.png());await writeFile('public/art/terrain.png',await terrain.png());await writeFile('src/garden/atlas.json',JSON.stringify({width:atlas.w,height:atlas.h,frames},null,2)+'\n');
await writeFile('public/art/LICENSE.txt','LoveGarden pixel-art assets\nOriginal artwork authored for this project. No third-party game art or fonts are included.\nThe source artwork is reproducible with scripts/pixel-art.mjs.\n');
console.log(`Created ${Object.keys(frames).length} original sprites and the isometric terrain.`);

