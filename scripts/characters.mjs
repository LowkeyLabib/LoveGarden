/** Original, hand-drawn pixel character animation atlas. No reference photographs are bundled.
 * Rebuild: node scripts/characters.mjs. All art uses integer pixels and the garden's light direction.
 */
import sharp from 'sharp';
import {writeFile} from 'node:fs/promises';
const W=48,H=56,colors={outline:'#252733',hair:'#242329',hairMid:'#383239',hairLight:'#51444a',skin:'#c88d69',skinLight:'#e6ae86',skinShadow:'#a86f55',black:'#242831',blackLight:'#3c404a',blackShadow:'#171d28',pink:'#d587a3',pinkLight:'#f1b3c7',pinkShadow:'#af647f',jeans:'#46546c',gold:'#dbbd70'};
class Canvas{
 constructor(){this.data=Buffer.alloc(W*H*4);}
 dot(x,y,c){x=Math.round(x);y=Math.round(y);if(x<0||y<0||x>=W||y>=H)return;const p=(y*W+x)*4;const rgba=Array.isArray(c)?c:[...c.slice(1).match(/../g).map(v=>parseInt(v,16)),255];this.data.set(rgba,p);}
 rect(x,y,w,h,c){for(let j=0;j<h;j++)for(let i=0;i<w;i++)this.dot(x+i,y+j,c);}
 line(x,y,xx,yy,c,w=1){const n=Math.max(Math.abs(xx-x),Math.abs(yy-y),1);for(let i=0;i<=n;i++)this.rect(x+(xx-x)*i/n,y+(yy-y)*i/n,w,w,c);}
 oval(x,y,rx,ry,c){for(let j=-ry;j<=ry;j++)for(let i=-rx;i<=rx;i++)if(i*i/(rx*rx)+j*j/(ry*ry)<=1)this.dot(x+i,y+j,c);}
}
function draw(person,pose,frame,back){
 const c=new Canvas(),girl=person==='mehezad',walk=pose==='walk',sit=pose==='sit'||pose==='smoke',plant=pose==='plant',water=pose==='water',sad=pose==='sad';
 const step=walk?[0,2,0,-2][frame]:0,bob=walk&&frame%2?1:0,bend=plant?[3,5,7,4][frame]:0;
 const hip=sit?39:38,top=(girl?29:27)+(sit?1:bob)+bend,head=top-14+(sad?2:0);
 const shirt=girl?colors.pink:colors.black,light=girl?colors.pinkLight:colors.blackLight,shade=girl?colors.pinkShadow:colors.blackShadow;
 if(!sit)c.oval(25,49,9,3,[31,43,44,60]);
 // Long hair behind the shoulders is a separate, layered silhouette.
 if(girl){c.oval(23,head+8,8,10,colors.outline);c.rect(16,head+7,14,18,colors.hair);c.rect(16,head+11,2,15,colors.hairMid);c.rect(28,head+10,3,17,colors.hairMid);c.rect(29,head+12,1,13,colors.hairLight);}
 const trousers=girl?colors.jeans:colors.blackShadow;
 if(sit){
  c.line(20,hip,17,hip+6,trousers,4);c.line(27,hip+3,24,hip+9,trousers,4);
  c.rect(15,hip+9,5,2,colors.outline);c.rect(22,hip+12,5,2,colors.outline);c.rect(15,hip+9,3,1,girl?'#d5c6b6':'#4b4e58');
 }else if(plant){c.rect(19,44,6,4,trousers);c.rect(25,42,5,6,trousers);c.rect(17,47,8,2,colors.outline);c.rect(25,47,7,2,colors.outline);}
 else{c.rect(19,hip,5,9+Math.max(0,step),trousers);c.rect(25,hip,5,9-Math.min(0,step),trousers);c.rect(19,hip,1,7,girl?'#61718b':'#343945');c.rect(18,47+step,6,2,colors.outline);c.rect(25,47-step,6,2,colors.outline);c.rect(19,47+step,3,1,girl?'#d5c6b6':'#505361');}
 // Fitted top with shaded sleeves, collar and small cloth highlights.
 c.rect(18,top,13,Math.max(5,(sit?41:40)-top),colors.outline);c.rect(19,top,11,Math.max(5,(sit?40:39)-top),shirt);c.rect(19,top+1,3,7,light);c.rect(28,top+2,2,8,shade);
 c.rect(22,top-2,5,3,colors.skinShadow);c.rect(22,top-2,3,2,colors.skinLight);
 if(!girl){c.line(20,top,23,top+3,light);c.line(28,top,25,top+3,'#53505a');for(let y=top+4;y<39;y+=3)c.dot(25,y,'#777078');}
 else{c.line(21,top,24,top+2,'#f7c9d5');c.line(24,top+2,28,top,'#ebafc2');c.rect(20,top+8,7,1,colors.pinkShadow);}
 const armSwing=walk?step:0;
 c.line(18,top+2,17,top+8-armSwing,shade,3);c.rect(17,top+8-armSwing,3,3,colors.skin);
 c.line(30,top+2,31,top+8+armSwing,shirt,3);c.rect(31,top+8+armSwing,3,3,colors.skinLight);
 // Face: warm skin, three-quarter nose, asymmetric fringe, earrings or black shades.
 c.oval(24,head+8,6,7,colors.outline);c.oval(24,head+8,5,6,colors.skin);c.rect(20,head+4,7,7,colors.skinLight);c.rect(27,head+6,2,5,colors.skinShadow);c.rect(18,head+8,2,3,colors.skin);c.dot(28,head+9,colors.skinLight);
 if(back){c.oval(24,head+7,7,8,colors.hair);c.rect(19,head+1,6,2,colors.hairMid);c.line(18,head+5,20,head+10,colors.hairLight);c.rect(24,head+13,4,2,colors.hairMid);}
 else{
  if(girl){c.rect(20,head+8,2,1,'#43333b');c.rect(25,head+8,2,1,'#43333b');c.dot(20,head+7,colors.outline);c.dot(26,head+7,colors.outline);c.dot(24,head+10,'#bd7b64');c.rect(23,head+12,3,1,'#985d66');c.dot(26,head+11,'#e99994');c.rect(18,head+11,1,3,colors.gold);c.dot(19,head+13,'#f5dca3');c.rect(29,head+11,1,3,colors.gold);}
  else{c.rect(19,head+7,4,3,'#141c28');c.rect(25,head+7,4,3,'#141c28');c.rect(23,head+8,2,1,'#111824');c.dot(20,head+7,'#7e8491');c.dot(26,head+7,'#6b7283');c.rect(28,head+8,2,1,colors.skinShadow);c.dot(26,head+11,'#9c6754');c.rect(22,head+13,5,1,'#735149');c.rect(23,head+14,3,1,'#58454a');c.rect(23,head+12,3,1,sad?'#785451':'#a67469');}
  if(girl){c.oval(23,head+1,7,4,colors.hair);c.line(23,head-2,18,head+5,colors.hairMid,2);c.line(26,head,29,head+6,colors.hairMid,2);c.line(20,head+1,18,head+8,colors.hairLight);c.rect(17,head+4,2,9,colors.hair);}
  else{c.oval(23,head+1,8,5,colors.hair);c.rect(18,head-4,4,2,colors.hair);c.rect(25,head-3,5,2,colors.hair);c.line(18,head,23,head-3,colors.hairMid,2);c.line(22,head+1,28,head-2,colors.hairMid,2);c.line(26,head+3,31,head,colors.hair,2);c.rect(17,head+2,2,7,colors.hairMid);c.dot(21,head-3,colors.hairLight);c.line(25,head-2,28,head-1,colors.hairLight);}
 }
 if(girl&&back){c.rect(17,head+8,14,15,colors.hair);c.line(20,head+7,19,head+22,colors.hairMid);c.line(27,head+9,28,head+24,colors.hairLight);}
 if(sit){c.line(18,top+4,21,40,shirt,3);c.rect(21,40,3,2,colors.skinLight);c.line(30,top+4,27,43,shade,3);c.rect(26,42,3,2,colors.skin);}
 if(plant){c.line(29,top+3,35,43+frame%2,shirt,3);c.rect(34,43+frame%2,3,2,colors.skinLight);c.rect(17,top+6,5,7,'#b79867');c.rect(18,top+7,3,2,'#e6c994');c.dot(36,46+frame%2,'#dbc39b');c.dot(39,48,'#8e6b4d');}
 if(water){const tilt=frame%2;c.line(29,top+4,33,top+7,shirt,3);c.rect(32,top+7,3,2,colors.skinLight);c.rect(32,top+8,8,7,'#456c71');c.rect(33,top+8,6,5,'#87b3b0');c.line(37,top+8,37,top+5,'#456c71');c.line(34,top+5,37,top+5,'#456c71');c.line(39,top+10,43,top+8+tilt,'#659296',2);c.rect(42,top+7+tilt,3,3,'#aacdca');if(frame!==0)for(let i=0;i<3;i++)c.rect(43+i,top+12+i*4+(frame%2),1,2,'#b5e3e2');}
 if(pose==='smoke'){
  const raised=frame===1||frame===2;c.line(29,top+4,raised?30:33,raised?head+12:top+8,shirt,3);c.rect(raised?29:32,raised?head+11:top+8,3,2,colors.skinLight);const x=raised?30:34,y=raised?head+11:top+9;c.rect(x,y,4,1,'#eadac0');c.dot(x+4,y,'#d89c67');
  for(let i=0;i<3;i++){const yy=y-4-i*5-frame%2;c.line(x+3+(i%2),yy,x+5-i%2,yy-2,[193,193,185,95-i*20]);}
 }
 return c.data;
}
const poses=['idle','walk','sit','plant','water','sad','smoke'],directions=['se','sw','ne','nw'],columns=16,rows=Math.ceil(2*poses.length*4*directions.length/columns),atlas=Buffer.alloc(columns*W*rows*H*4),frames={};let index=0;
for(const person of ['labib','mehezad'])for(const pose of poses)for(const direction of directions)for(let frame=0;frame<4;frame++){
 const pixels=draw(person,pose,frame,direction[0]==='n'),mirror=direction[1]==='w',left=index%columns*W,top=Math.floor(index/columns)*H;
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){const source=(y*W+(mirror?W-1-x:x))*4,target=((top+y)*columns*W+left+x)*4;pixels.copy(atlas,target,source,source+4);}
 frames[`${person}-${pose}-${direction}-${frame}`]={x:left,y:top,w:W,h:H,anchorX:24,anchorY:49};index++;
}
await sharp(atlas,{raw:{width:columns*W,height:rows*H,channels:4}}).png().toFile('public/art/characters.png');
await writeFile('src/garden/characters.json',JSON.stringify({width:columns*W,height:rows*H,frames}));
await writeFile('public/art/characters-LICENSE.txt','Original LoveGarden character sprites, authored for this project. No reference photographs or third-party artwork are included. Rebuild with scripts/characters.mjs.\n');
console.log(`Created ${index} original character frames.`);
