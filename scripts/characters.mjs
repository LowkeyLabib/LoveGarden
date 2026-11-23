/** Original, hand-drawn pixel character animation atlas. No reference photographs are bundled.
 * Rebuild: node scripts/characters.mjs. All art uses integer pixels and the garden's light direction.
 */
import sharp from 'sharp';
import {writeFile} from 'node:fs/promises';
const W=48,H=56,colors={outline:'#252733',black:'#242831',blackLight:'#3c404a',blackShadow:'#171d28',pink:'#d587a3',pinkLight:'#f1b3c7',pinkShadow:'#af647f',jeans:'#46546c'};
const skin={
 labib:{base:'#e3b594',light:'#f5d2b1',shade:'#cd9d7f',edge:'#cf9e81',warm:'#edc2a4'},
 mehezad:{base:'#e7baa6',light:'#f8d6c3',shade:'#d3a18e',edge:'#d4a18d',warm:'#efc5b2'},
};
const hair={
 labib:{x:'#211e24',d:'#2b272d',m:'#3b333b',h:'#51454d',g:'#62515a'},
 mehezad:{x:'#201e28',d:'#2b2833',m:'#393442',h:'#4b4251',g:'#625464'},
};
class Canvas{
 constructor(){this.data=Buffer.alloc(W*H*4);}
 dot(x,y,c){x=Math.round(x);y=Math.round(y);if(x<0||y<0||x>=W||y>=H)return;const p=(y*W+x)*4;const rgba=Array.isArray(c)?c:[...c.slice(1).match(/../g).map(v=>parseInt(v,16)),255];this.data.set(rgba,p);}
 rect(x,y,w,h,c){for(let j=0;j<h;j++)for(let i=0;i<w;i++)this.dot(x+i,y+j,c);}
 line(x,y,xx,yy,c,w=1){const n=Math.max(Math.abs(xx-x),Math.abs(yy-y),1);for(let i=0;i<=n;i++)this.rect(x+(xx-x)*i/n,y+(yy-y)*i/n,w,w,c);}
 oval(x,y,rx,ry,c){for(let j=-ry;j<=ry;j++)for(let i=-rx;i<=rx;i++)if(i*i/(rx*rx)+j*j/(ry*ry)<=1)this.dot(x+i,y+j,c);}
}
function pixels(c,x,y,rows,palette){
 for(const [dy,row] of rows.entries())for(let dx=0;dx<row.length;dx++){
  const color=palette[row[dx]];
  if(color)c.dot(x+dx,y+dy,color);
 }
}
// Labib's tousled fringe and Mehezad's center part have separate three-quarter
// silhouettes in each view. East/west mirrors share the existing pixel grid.
const labibFront=[
 '.....xx..x.......',
 '...xxmxxxmxxx....',
 '..xmhmhmmmhmmx...',
 '.xmhmgmhmmhmmmdx.',
 'xmhmhhmmdmmdddddx',
 'xmmhmxxmmdxxddmxx',
 'xdmmx..xx...xddx.',
 '.xdx....x....xdx.',
 '.xdx.........xdx.',
 '..x...........x..',
];
const labibBack=[
 '.......xx.xx.....',
 '...xxxxmmxmmx....',
 '..xmhmmhmdmmmxx..',
 '.xmhgmmhmmmdmhxx.',
 'xmmhmmddhmmmddmdx',
 'xmmdmddmmddmmmddx',
 'xdmdddmmddmmmddxx',
 'xddddmmdddmmdddxx',
 '.xddddddmmmdddxx.',
 '.xdxddddmmddddx..',
 '.xdxxddddddxdx...',
 '..xdxxdddddxx....',
 '...xxxxddxxxx....',
 '.....xxxxxx......',
 '.....xxxddxx.....',
 '......xxxxx......',
 '.......xxx.......',
];
const mehezadFront=[
 '......xxx.xx.....',
 '....xxmmxdmmx....',
 '...xhhmmxdmhmx...',
 '..xhmmdx..xmhmmx.',
 '.xhmmmx....xmmhdx',
 '.xhmxx......xmmhx',
 'xmdx.........xdmx',
 'xmx...........xdx',
 'xdx...........xdx',
];
const mehezadBack=[
 '......xxx.xx.....',
 '....xxmmxdmmx....',
 '...xhhmmxdmhmx...',
 '..xhmmdxxdxmhmmx.',
 '.xhmmmdxmdxmmmhdx',
 '.xhmmddmddmmmdmhx',
 'xhmddmmdddmmdmdmx',
 'xhmddmmddmmdmdmdx',
 'xmmddmmddmmdmdddx',
];
const faceContours={
 labib:[
  '....eccccce....',
  '...ehhhhcccse..',
  '..ehhhhhhhcse..',
  '..ehhhhhhhccse.',
  '..ehhhchhhccse.',
  '.eehccchhcccse.',
  'echchhhhhhhcse.',
  'ccwhhhhhhhccce.',
  'ccwhhhhhhhhccce',
  '.cwwhhhwhhccce.',
  '..eccwwhhccce..',
  '...ecccccwce...',
  '....eccwwce....',
  '.....eccce.....',
  '......eee......',
 ],
 mehezad:[
  '....ecccce.....',
  '...ehhhhccse...',
  '..ehhhhhhhcse..',
  '..ehhhhhhhccse.',
  '..ehhhchhhccse.',
  '.eehccchhcccse.',
  '.chhhhhhhhhcse.',
  '.cwhhhhhhhhhcce',
  '.ccwhhhhhhhwcce',
  '..cwwhhwhhwwce.',
  '..eccwhhhcce...',
  '...eccchcce....',
  '....eccwce.....',
  '.....ecce......',
  '......ee.......',
 ],
};
function drawLongHair(c,head,sway,back){
 const tones=hair.mehezad;
 for(let row=0;row<23;row++){
  const y=head+5+row,shift=Math.round(sway*Math.max(0,row-9)/13);
  if(back){
   const left=15+(row<3?2:Math.min(5,Math.floor(row/3)))+shift;
   const right=32+(row>6&&row<16?1:0)-(row>18?Math.floor((row-17)/2):0)+shift;
   c.rect(left,y,right-left+1,1,tones.x);
   if(row===22){c.rect(left+2,y,4,1,tones.d);continue;}
   c.rect(left+1,y,right-left-1,1,tones.d);
   c.rect(left+2,y,row<11?2:1,1,row<8?tones.h:tones.m);
   c.dot(left+5+(row>=17?1:0),y,tones.m);
   c.dot(right-3-(row>=13?1:0),y,row<11?tones.h:tones.m);
   if(row>=20)c.dot(left+3,y,tones.x);
  }else{
   const left=15+(row<3?1:row>17?Math.floor((row-16)/2):0)+shift;
   const right=29+(row>7&&row<17?1:0)+shift;
   if(row<21){
    const width=row<7?3:row<17?4:row<20?3:1;
    c.rect(left,y,width,1,tones.x);
    if(width>1)c.dot(left+1,y,row<13?tones.h:tones.m);
    if(width>2)c.dot(left+2,y,tones.d);
   }
   const width=row<3?3:row<18?4:row<21?3:row===21?2:1;
   c.rect(right,y,width,1,tones.x);
   if(width>1)c.dot(right+1,y,row<16?tones.m:tones.d);
   if(width>2)c.dot(right+2,y,row<12?tones.h:tones.m);
  }
 }
}
function drawPortrait(c,person,head,pose,frame,back){
 const girl=person==='mehezad',tone=skin[person],tones=hair[person];
 if(back){
  if(girl)drawLongHair(c,head,pose==='walk'?[0,1,0,-1][frame]:0,true);
  pixels(c,15,head-(girl?4:5),girl?mehezadBack:labibBack,tones);
  if(!girl){
   c.rect(17,head+6,2,4,tone.shade);
   c.dot(17,head+7,tone.light);
   c.rect(21,head+11,8,3,tone.shade);
   c.rect(22,head+12,3,2,tone.base);
  }
  return;
 }
 pixels(c,16,head+1,faceContours[person],{e:tone.edge,c:tone.base,h:tone.light,s:tone.shade,w:tone.warm});
 if(girl)drawLongHair(c,head,pose==='walk'?[0,1,0,-1][frame]:0,false);
 pixels(c,15,head-(girl?4:5),girl?mehezadFront:labibFront,tones);
 const scolding=girl&&gesturePoses.mehezad.includes(pose);
 const closed=pose==='sad'||pose==='embarrassed'&&frame===0;
 const brow='#574043',iris='#34262d',sclera='#fae6d3';
 if(scolding){
  c.rect(19,head+5,2,1,brow);c.dot(21,head+6,brow);
  c.dot(25,head+6,brow);c.rect(26,head+5,2,1,brow);
 }else{
  c.line(19,head+5,22,head+5,brow);
  c.rect(25,head+5,girl?3:4,1,brow);
 }
 for(const x of [20,26]){
  if(closed){c.rect(x,head+8,2,1,iris);continue;}
  c.rect(x-1,head+7,girl?4:3,1,iris);
  c.rect(x,head+8,2,1,sclera);
  c.dot(x+1,head+8,iris);
  if(girl)c.dot(x-1,head+8,brow);
 }
 c.dot(25,head+9,tone.warm);
 c.rect(25,head+10,2,1,tone.shade);
 c.dot(25,head+10,tone.light);
 const mouth=girl?'#985664':'#8e514c';
 if(scolding&&frame%2)c.rect(23,head+12,2,2,mouth);
 else{
  c.rect(23,head+12,4,1,mouth);
  c.dot(closed?26:22,head+(closed?13:12),mouth);
  if(!closed)c.dot(24,head+13,girl?'#d78d86':'#d98f77');
 }
 if(girl){
  c.dot(18,head+10,'#d0a663');
  c.dot(17,head+12,'#ebc77a');c.dot(18,head+13,'#bd9258');
 }else{
  c.rect(24,head+14,3,1,'#bb8a74');c.dot(25,head+15,'#a97a67');
  if(pose==='embarrassed'){
   c.rect(19,head+10,2,1,'#ebaf9d');
   c.rect(27,head+10,2,1,'#ebaf9d');
  }
 }
}
const gesturePoses={
 labib:['smoke-standing','embarrassed'],
 mehezad:['scold','bonk','snatch','throw'],
};
function gestureHand(pose,frame,top,head){
 if(pose==='smoke-standing')return frame===1||frame===2?{x:29,y:head+12}:{x:34,y:top+7};
 if(pose==='scold')return {x:35,y:top-3+frame%2*2};
 if(pose==='bonk')return [{x:28,y:top-12},{x:38,y:top-15},{x:40,y:top-12},{x:34,y:top-8}][frame];
 if(pose==='snatch')return frame<2?{x:37,y:top-5}:{x:31,y:top-1};
 if(pose==='throw')return [{x:32,y:top-4},{x:31,y:top-12},{x:40,y:top-14},{x:35,y:top-6}][frame];
 return null;
}
function drawCigarette(c,x,y){
 c.rect(x,y,4,1,'#f0dfc4');
 c.dot(x+4,y,'#d38663');
}
function draw(person,pose,frame,back){
 const c=new Canvas(),girl=person==='mehezad',walk=pose==='walk',sit=pose==='sit'||pose==='smoke',plant=pose==='plant',water=pose==='water',sad=pose==='sad';
 const tone=skin[person];
 const step=walk?[0,2,0,-2][frame]:0,bob=walk&&frame%2?1:0,bend=plant?[3,5,7,4][frame]:0;
 const embarrassed=pose==='embarrassed';
 const hip=sit?39:38,top=(girl?29:27)+(sit?1:bob)+bend,head=top-14+(sad?2:embarrassed?1:0);
 const hand=gestureHand(pose,frame,top,head);
 const shirt=girl?colors.pink:colors.black,light=girl?colors.pinkLight:colors.blackLight,shade=girl?colors.pinkShadow:colors.blackShadow;
 if(!sit)c.oval(25,49,9,3,[31,43,44,60]);
 const trousers=girl?colors.jeans:colors.blackShadow;
 if(sit){
  c.line(20,hip,17,hip+6,trousers,4);c.line(27,hip+3,24,hip+9,trousers,4);
  c.rect(15,hip+9,5,2,colors.outline);c.rect(22,hip+12,5,2,colors.outline);c.rect(15,hip+9,3,1,girl?'#d5c6b6':'#4b4e58');
 }else if(plant){c.rect(19,44,6,4,trousers);c.rect(25,42,5,6,trousers);c.rect(17,47,8,2,colors.outline);c.rect(25,47,7,2,colors.outline);}
 else{c.rect(19,hip,5,9+Math.max(0,step),trousers);c.rect(25,hip,5,9-Math.min(0,step),trousers);c.rect(19,hip,1,7,girl?'#61718b':'#343945');c.rect(18,47+step,6,2,colors.outline);c.rect(25,47-step,6,2,colors.outline);c.rect(19,47+step,3,1,girl?'#d5c6b6':'#505361');}
 // Fitted top with shaded sleeves, collar and small cloth highlights.
 c.rect(18,top,13,Math.max(5,(sit?41:40)-top),colors.outline);c.rect(19,top,11,Math.max(5,(sit?40:39)-top),shirt);c.rect(19,top+1,3,7,light);c.rect(28,top+2,2,8,shade);
 c.rect(22,top-2,5,3,tone.shade);c.rect(22,top-2,3,2,tone.light);
 if(!girl){c.line(20,top,23,top+3,light);c.line(28,top,25,top+3,'#53505a');for(let y=top+4;y<39;y+=3)c.dot(25,y,'#777078');}
 else{c.line(21,top,24,top+2,'#f7c9d5');c.line(24,top+2,28,top,'#ebafc2');c.rect(20,top+8,7,1,colors.pinkShadow);}
 const armSwing=walk?step:0;
 c.line(18,top+2,17,top+8-armSwing,shade,3);c.rect(17,top+8-armSwing,3,3,tone.base);
 if(!hand){c.line(30,top+2,31,top+8+armSwing,shirt,3);c.rect(31,top+8+armSwing,3,3,tone.light);}
 drawPortrait(c,person,head,pose,frame,back);
 if(sit){c.line(18,top+4,21,40,shirt,3);c.rect(21,40,3,2,tone.light);c.line(30,top+4,27,43,shade,3);c.rect(26,42,3,2,tone.base);}
 if(plant){c.line(29,top+3,35,43+frame%2,shirt,3);c.rect(34,43+frame%2,3,2,tone.light);c.rect(17,top+6,5,7,'#b79867');c.rect(18,top+7,3,2,'#e6c994');c.dot(36,46+frame%2,'#dbc39b');c.dot(39,48,'#8e6b4d');}
 if(water){const tilt=frame%2;c.line(29,top+4,33,top+7,shirt,3);c.rect(32,top+7,3,2,tone.light);c.rect(32,top+8,8,7,'#456c71');c.rect(33,top+8,6,5,'#87b3b0');c.line(37,top+8,37,top+5,'#456c71');c.line(34,top+5,37,top+5,'#456c71');c.line(39,top+10,43,top+8+tilt,'#659296',2);c.rect(42,top+7+tilt,3,3,'#aacdca');if(frame!==0)for(let i=0;i<3;i++)c.rect(43+i,top+12+i*4+(frame%2),1,2,'#b5e3e2');}
 if(pose==='smoke'){
  const raised=frame===1||frame===2;c.line(29,top+4,raised?30:33,raised?head+12:top+8,shirt,3);c.rect(raised?29:32,raised?head+11:top+8,3,2,tone.light);const x=raised?30:34,y=raised?head+11:top+9;c.rect(x,y,4,1,'#eadac0');c.dot(x+4,y,'#d89c67');
  for(let i=0;i<3;i++){const yy=y-4-i*5-frame%2;c.line(x+3+(i%2),yy,x+5-i%2,yy-2,[193,193,185,95-i*20]);}
 }
 if(hand){
  c.line(29,top+3,hand.x,hand.y,shirt,3);
  c.rect(hand.x,hand.y,3,2,tone.light);
  if(pose==='smoke-standing'||pose==='snatch'&&frame>=2||pose==='throw'&&frame<2)drawCigarette(c,hand.x+2,hand.y);
  if(pose==='smoke-standing'&&frame!==0){
   const x=hand.x+5,y=hand.y-3-frame%2;
   c.rect(x,y,2,2,[207,208,194,110]);
   c.dot(x+1,y-3,[215,215,203,80]);
   if(frame===3)c.dot(x-1,y-6,[215,215,203,45]);
  }
 }
 return c.data;
}
const poses=['idle','walk','sit','plant','water','sad','smoke'],directions=['se','sw','ne','nw'];
const columns=16,rows=Math.ceil((2*poses.length+gesturePoses.labib.length+gesturePoses.mehezad.length)*directions.length*4/columns);
const atlas=Buffer.alloc(columns*W*rows*H*4),frames={};let index=0;
function packFrame(pixels,target,columns,index,direction){
 const mirror=direction[1]==='w',left=index%columns*W,top=Math.floor(index/columns)*H;
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const source=(y*W+(mirror?W-1-x:x))*4,dest=((top+y)*columns*W+left+x)*4;
  pixels.copy(target,dest,source,source+4);
 }
 return {left,top};
}
for(const person of ['labib','mehezad'])for(const pose of [...poses,...gesturePoses[person]])for(const direction of directions)for(let frame=0;frame<4;frame++){
 const {left,top}=packFrame(draw(person,pose,frame,direction[0]==='n'),atlas,columns,index,direction);
 frames[`${person}-${pose}-${direction}-${frame}`]={x:left,y:top,w:W,h:H,anchorX:24,anchorY:49};index++;
}

// Wardrobe art is a transparent pixel layer over the original body atlas. Each
// sprite reference can be equipped independently in outfit/headwear/accessory slots.
const fashionStyles=[
 {ref:'fashion/mehezad/pink-summer-dress',person:'mehezad',kind:'dress',main:'#e887aa',light:'#ffc1d4',shade:'#bd5f83',detail:'#fff0c8'},
 {ref:'fashion/mehezad/cozy-hoodie',person:'mehezad',kind:'hoodie',main:'#b49bc9',light:'#dac5e7',shade:'#7e6a9b',detail:'#f4e9cf'},
 {ref:'fashion/mehezad/cottagecore-dress',person:'mehezad',kind:'dress',main:'#89a777',light:'#c5d5a5',shade:'#5e7957',detail:'#f6e4b9'},
 {ref:'fashion/labib/matching-pajamas',person:'labib',kind:'pajamas',main:'#547f9f',light:'#86aec2',shade:'#385a78',detail:'#f4d389'},
 {ref:'fashion/mehezad/matching-pajamas',person:'mehezad',kind:'pajamas',main:'#547f9f',light:'#86aec2',shade:'#385a78',detail:'#f4d389'},
 {ref:'fashion/labib/matching-hoodies',person:'labib',kind:'hoodie',main:'#648366',light:'#92aa78',shade:'#3e614c',detail:'#e7d39a'},
 {ref:'fashion/mehezad/matching-hoodies',person:'mehezad',kind:'hoodie',main:'#648366',light:'#92aa78',shade:'#3e614c',detail:'#e7d39a'},
 {ref:'fashion/labib/romantic-formal-set',person:'labib',kind:'formal',main:'#303c5b',light:'#5d6b8c',shade:'#1c253c',detail:'#d48391'},
 {ref:'fashion/mehezad/romantic-formal-set',person:'mehezad',kind:'formal-dress',main:'#8f425d',light:'#c56e85',shade:'#5f2944',detail:'#e7bd82'},
];
const desiStyles=[
 ['desi-floral-kurti','mehezad','kurti','#d87b95','#f3adb7','#97445f','#fff0b8','floral'],
 ['desi-cotton-kameez','mehezad','kameez','#5b9892','#8fbfb2','#376862','#f5deab','plain'],
 ['desi-pastel-salwar-kameez','mehezad','kameez','#b393c3','#d9c1e5','#795d8c','#cae5c7','drape'],
 ['desi-anarkali-dress','mehezad','anarkali','#9260ad','#c389ca','#5f3e7d','#f4ca84','drape'],
 ['desi-lal-par-sharee','mehezad','sharee','#eee4cc','#fff5dc','#b83249','#d84555','plain'],
 ['desi-black-sharee','mehezad','sharee','#35313b','#555061','#211c26','#e3b572','plain'],
 ['desi-jamdani-sharee','mehezad','sharee','#6cae9d','#ade0c4','#477d72','#fff3cd','motifs'],
 ['desi-festive-lehenga','mehezad','lehenga','#d88a45','#ffc478','#985233','#f5a3b7','motifs'],
 ['desi-casual-kurti-panjabi','mehezad','kurti','#aaa66e','#d5cb90','#666745','#f4d0ad','floral'],
 ['desi-casual-kurti-panjabi','labib','panjabi','#83875e','#b1b486','#505538','#f4d0ad','floral'],
 ['desi-pastel-kameez-panjabi','mehezad','kameez','#8db9a8','#bbe0cb','#597c75','#d6bce5','drape'],
 ['desi-pastel-kameez-panjabi','labib','panjabi','#ac91bd','#d6bce5','#70577e','#bbe0cb','plain'],
 ['desi-lal-par-sharee-white-panjabi','mehezad','sharee','#fff0d8','#fff9e9','#a72d44','#bb2d48','plain'],
 ['desi-lal-par-sharee-white-panjabi','labib','panjabi','#eee8d8','#fff8e8','#b9aa99','#b92e47','plain'],
 ['desi-black-sharee-black-panjabi','mehezad','sharee','#342e3e','#565061','#211a29','#d69569','plain'],
 ['desi-black-sharee-black-panjabi','labib','panjabi','#28272e','#474653','#16151e','#d69569','plain'],
 ['desi-eid-special-matching-set','mehezad','anarkali','#3b917e','#72c3a3','#215f55','#f7cc74','motifs'],
 ['desi-eid-special-matching-set','labib','panjabi','#306e60','#61ab91','#244c48','#f7cc74','motifs'],
 ['desi-jamdani-sharee-premium-panjabi','mehezad','sharee','#5a83a9','#a4c7dc','#395474','#fff0ca','motifs'],
 ['desi-jamdani-sharee-premium-panjabi','labib','panjabi','#405c85','#718fb4','#263957','#fff0ca','motifs'],
 ['desi-wedding-inspired-couple-set','mehezad','lehenga','#b54159','#eb7985','#76273e','#f7cd78','motifs'],
 ['desi-wedding-inspired-couple-set','labib','panjabi','#e3cba4','#fff0ca','#a88860','#b54355','motifs'],
].map(([id,person,kind,main,light,shade,detail,pattern])=>({
 ref:`fashion/${person}/${id}`,person,kind,main,light,shade,detail,pattern,
}));
fashionStyles.push(...desiStyles);

const packed = color => Number.parseInt(color.slice(1) + 'ff', 16);
const portraitPixels = new Set([
 ...Object.values(hair.labib), ...Object.values(hair.mehezad),
 ...Object.values(skin.labib), ...Object.values(skin.mehezad),
 '#bb8a74', '#a97a67', '#d0a663', '#ebc77a', '#bd9258',
].map(packed));
const shirtPixels = new Set([
 colors.pink, colors.pinkLight, colors.pinkShadow, colors.black, colors.blackLight, colors.blackShadow,
 '#f7c9d5', '#ebafc2', '#53505a', '#777078',
].map(packed));
const trouserPixels = new Set([colors.jeans, colors.blackShadow, '#61718b', '#343945'].map(packed));
const outlinePixel = packed(colors.outline);
const mix = (a, b, amount) => '#' + [1, 3, 5].map(i => {
 const from = Number.parseInt(a.slice(i, i + 2), 16);
 const to = Number.parseInt(b.slice(i, i + 2), 16);
 return Math.round(from + (to - from) * amount).toString(16).padStart(2, '0');
}).join('');

function drawDesi(style, pose, frame, back) {
 const cloth = new Canvas();
 const { person, kind, main, light, shade, detail, pattern } = style;
 const walking = pose === 'walk';
 const seated = pose === 'sit' || pose === 'smoke';
 const step = walking ? [0, 2, 0, -2][frame] : 0;
 const bend = pose === 'plant' ? [3, 5, 7, 4][frame] : 0;
 const top = (person === 'mehezad' ? 29 : 27) + (seated ? 1 : walking ? frame % 2 : 0) + bend;
 const edge = mix(shade, colors.outline, 0.46);
 const fold = mix(main, shade, 0.53);
 const trimShadow = mix(detail, edge, 0.37);
 const paleBorder = kind === 'sharee' && style.ref.includes('lal-par');
 const sharee = kind === 'sharee';
 const lehenga = kind === 'lehenga';
 const flared = sharee || lehenga || kind === 'anarkali';
 const waist = top + (kind === 'anarkali' ? 5 : 7);
 const hem = seated ? (flared ? 47 : 44) : flared ? 48 : kind === 'kurti' ? 42 : 45;
 const hipShift = Math.sign(step);

 // Knees and cuffs follow the existing stride; the tunic and skirt are layered over them below.
 const pants = flared || style.ref.includes('black-sharee') ? shade : mix(detail, '#f5e9d2', 0.57);
 const pantsShade = mix(pants, edge, 0.28);
 const base = draw(person, pose, frame, back);
 const article = new Canvas();
 const hand = gestureHand(pose, frame, top, top - 14);
 for (let y = Math.min(top, hand?.y ?? top); y < H; y++) {
  for (let x = 0; x < W; x++) {
   const offset = (y * W + x) * 4;
   const pixel = base.readUInt32BE(offset);
   if (y >= 38 && trouserPixels.has(pixel)) article.dot(x, y, x < 24 ? pants : pantsShade);
   else if (shirtPixels.has(pixel)) article.dot(x, y, x < 21 ? light : x > 28 ? shade : main);
  }
 }

 // Tailored shoulders, a shaped waist and stepped, weighted lower folds.
 for (let y = top; y <= hem; y++) {
  const belowWaist = Math.max(0, y - waist);
  const spread = y < waist ? (y - top < 4 ? 6 : 5) :
   flared ? Math.min(10, 6 + Math.floor(belowWaist / (sharee ? 3 : 2))) : y >= hem - 2 ? 7 : 6;
  const shift = y > waist + 3 ? (seated ? -1 : hipShift) : 0;
  const left = 24 - spread + shift;
  const right = 24 + spread + shift;
  const blouse = y < waist && (sharee || lehenga);
  const shell = blouse ? (paleBorder ? detail : fold) : main;
  cloth.rect(left, y, right - left + 1, 1, edge);
  cloth.rect(left + 1, y, right - left - 1, 1, shell);
  cloth.dot(left + 1, y, blouse && paleBorder ? trimShadow : light);
  cloth.rect(right - 2, y, 2, 1, fold);
  if (y > waist && flared) {
   // The sharee's narrow front pleats differ from the radial folds of a stitched skirt.
   const pleat = sharee ? 22 + shift + Math.floor(belowWaist / 6) : 22 + shift - Math.floor(belowWaist / 5);
   cloth.dot(pleat, y, fold);
   cloth.dot(pleat + 1, y, light);
   cloth.dot(sharee ? pleat + 3 : right - 3, y, shade);
  }
  if (y === hem || (flared && y === hem - 1)) {
   cloth.rect(left + 1, y, right - left - 1, 1, y === hem ? trimShadow : detail);
  }
 }

 // Woven buta diamonds and embroidered borders use small, spaced stitches.
 if (pattern === 'motifs') {
  const motifStart = flared ? waist + 2 : top + 7;
  const thread = mix(detail, light, 0.30);
  for (let y = motifStart; y + 1 < hem - 1; y += 4) {
   for (const x of ((y - motifStart) % 8 === 0 ? [20, 27] : [23])) {
    cloth.dot(x, y - 1, thread);
    cloth.rect(x - 1, y, 3, 1, detail);
    cloth.dot(x, y + 1, trimShadow);
   }
  }
 }
 if (pattern === 'floral' && !back) {
  const blooms = kind === 'kurti' ? [[21, top + 4], [27, top + 7], [21, hem - 3]] : [[22, top + 5], [27, top + 7]];
  for (const [x, y] of blooms) {
   cloth.rect(x - 1, y, 3, 1, detail);
   cloth.dot(x, y - 1, light);
   cloth.dot(x + 1, y + 1, trimShadow);
  }
 }

 if (sharee) {
  const shoulder = back ? 19 : 28;
  const end = back ? 17 + hipShift : (seated ? 18 : 19 + hipShift);
  const drape = back ? top + 5 : waist + 2;
  const tail = Math.min(hem - 2, drape + (back ? 8 : 4));
  // Lead the wrapped band to a wider, bordered pallu with its own hanging end.
  cloth.line(shoulder - 2, top, end, drape, trimShadow, 5);
  cloth.line(shoulder - 1, top, end + 1, drape, light, 3);
  cloth.line(shoulder + 2, top, end + 4, drape, detail);
  cloth.line(end, drape, end - (back ? 1 : 0), tail - 2, trimShadow, 5);
  cloth.line(end + 1, drape, end + 1, tail - 2, main, 3);
  cloth.rect(end, tail - 1, 5, 2, detail);
  cloth.rect(end + 1, tail - 1, 3, 1, light);
  if (pattern === 'motifs') cloth.dot(end + 2, tail - 3, detail);
 } else if (kind === 'kameez' || flared) {
  const shoulder = back ? 19 : 28;
  const end = shoulder + (back ? -1 : 1) + hipShift;
  const tail = Math.min(hem - 1, top + (back ? 13 : 11));
  if (lehenga || kind === 'anarkali') cloth.rect(19, waist, 11, 1, detail);
  // A shoulder fold runs into a separate dupatta panel, finished with a selvedge.
  cloth.line(shoulder - 1, top, end - 1, tail - 1, trimShadow, 4);
  cloth.line(shoulder, top, end, tail - 1, detail, 2);
  cloth.rect(end - 1, tail, 4, 1, light);
  if (!back) cloth.line(21, top + 1, 24, top + 3, trimShadow);
 } else if (!back) {
  cloth.rect(22, top, 5, 2, kind === 'panjabi' ? shade : detail);
  cloth.line(24, top + 2, 24, top + 7, edge);
  cloth.line(25, top + 2, 25, top + 7, detail);
  if (kind === 'panjabi') {
   cloth.dot(26, top + 4, light);
   cloth.dot(26, top + 7, light);
   cloth.line(29 + hipShift, hem - 4, 29 + hipShift, hem - 1, shade);
  }
 }

 // Preserve occluders from the same pose, including hair, hands and carried props.
 for (let y = top; y < H; y++) {
  for (let x = 0; x < W; x++) {
   const offset = (y * W + x) * 4;
   if (!cloth.data[offset + 3]) continue;
   const pixel = base.readUInt32BE(offset);
   const covered = base[offset + 3] < 255 || shirtPixels.has(pixel) || trouserPixels.has(pixel) ||
    (pixel === outlinePixel && y <= 40 && x >= 18 && x <= 30);
   if (covered) cloth.data.copy(article.data, offset, offset, offset + 4);
  }
 }
 return article.data;
}

function drawFashion(style,pose,frame,back){
 if(style.pattern)return drawDesi(style,pose,frame,back);
 const c=new Canvas(),girl=style.person==='mehezad',walk=pose==='walk',sit=pose==='sit'||pose==='smoke',plant=pose==='plant';
 const step=walk?[0,2,0,-2][frame]:0,bob=walk&&frame%2?1:0,bend=plant?[3,5,7,4][frame]:0;
 const hip=sit?39:38,top=(girl?29:27)+(sit?1:bob)+bend;
 const trousers=style.kind==='pajamas'?style.main:style.kind==='hoodie'?(girl?'#596882':'#333e48'):style.kind==='formal'?'#222b43':style.shade;
 const dress=style.kind==='dress'||style.kind==='formal-dress';
 if(dress){
  const end=sit?45:47;
  for(let y=top+7;y<=end;y++){
   const spread=Math.min(9,4+Math.floor((y-(top+7))/2));
   c.rect(24-spread,y,spread*2+1,1,y===end?style.detail:(y%4===0?style.light:style.main));
  }
  c.rect(18,top+7,13,2,style.shade);
 }else if(sit){
  c.line(20,hip,17,hip+6,trousers,4);c.line(27,hip+3,24,hip+9,trousers,4);
 }else if(plant){
  c.rect(19,44,6,4,trousers);c.rect(25,42,5,6,trousers);
 }else{
  c.rect(19,hip,5,8+Math.max(0,step),trousers);c.rect(25,hip,5,8-Math.min(0,step),trousers);
  c.rect(20,hip+1,1,6,style.light);c.rect(28,hip+1,1,6,style.shade);
 }
 const wide=style.kind==='hoodie';
 c.rect(wide?17:18,top,wide?15:13,Math.max(5,(sit?41:40)-top),colors.outline);
 c.rect(wide?18:19,top,wide?13:11,Math.max(5,(sit?40:39)-top),style.main);
 c.rect(wide?18:19,top+1,3,7,style.light);c.rect(wide?29:28,top+2,2,8,style.shade);
 if(style.kind==='hoodie'){
  c.rect(20,top,9,2,style.light);c.rect(21,top+8,7,3,style.shade);c.rect(22,top+8,5,1,style.detail);
  c.line(22,top+1,22,top+5,style.detail);c.line(28,top+1,28,top+5,style.detail);
 }else if(style.kind==='pajamas'){
  c.rect(19,top+5,11,1,style.light);c.rect(24,top,1,11,style.detail);
  if(!back){c.dot(21,top+3,style.detail);c.dot(28,top+8,style.detail);}
 }else if(style.kind==='formal'){
  c.line(19,top,24,top+7,style.light);c.line(30,top,25,top+7,style.shade);
  c.rect(24,top+1,2,8,style.detail);c.dot(25,top+10,style.light);
 }else{
  c.line(21,top,24,top+2,style.detail);c.line(24,top+2,28,top,style.light);
  if(!back){c.dot(21,top+7,style.detail);c.dot(27,top+10,style.detail);}
 }
 const armSwing=walk?step:0;
 const hand=gestureHand(pose,frame,top,top-14);
 c.line(18,top+2,17,top+8-armSwing,style.shade,3);
 if(hand)c.line(29,top+3,hand.x,hand.y,style.main,3);
 else c.line(30,top+2,31,top+8+armSwing,style.main,3);
 if(sit){c.line(18,top+4,21,40,style.main,3);c.line(30,top+4,27,43,style.shade,3);}
 if(plant)c.line(29,top+3,35,43+frame%2,style.main,3);
 if(pose==='water')c.line(29,top+4,33,top+7,style.main,3);
 if(pose==='smoke'){const raised=frame===1||frame===2;c.line(29,top+4,raised?30:33,raised?top-2:top+8,style.main,3);}
 if(hand)c.rect(hand.x,hand.y,3,2,[0,0,0,0]);
 // The cloth atlas sits above the base sprite. Preserve the hair silhouette,
 // jaw, and hands from the same pose when the garment crosses them.
 const base=draw(style.person,pose,frame,back);
 for(let offset=0;offset<c.data.length;offset+=4){
  if(c.data[offset+3]&&portraitPixels.has(base.readUInt32BE(offset)))c.data.writeUInt32BE(0,offset);
 }
 return c.data;
}
const fashionColumns=48,fashionAtlas=Buffer.alloc(fashionColumns*W*Math.ceil(fashionStyles.length*poses.length*directions.length*4/fashionColumns)*H*4);let fashionIndex=0;
for(const style of fashionStyles)for(const pose of poses)for(const direction of directions)for(let frame=0;frame<4;frame++){
 packFrame(drawFashion(style,pose,frame,direction[0]==='n'),fashionAtlas,fashionColumns,fashionIndex++,direction);
}
// The existing wardrobe atlas stays within the mobile texture limit. Only
// gestures used by each wearer are packed into a separate, smaller sheet.
const gestureCount=fashionStyles.reduce((total,style)=>total+gesturePoses[style.person].length*directions.length*4,0);
const gestureHeight=Math.ceil(gestureCount/fashionColumns)*H;
const gestureAtlas=Buffer.alloc(fashionColumns*W*gestureHeight*4),gestureStarts={};
let gestureIndex=0;
for(const style of fashionStyles){
 gestureStarts[style.ref]=gestureIndex;
 for(const pose of gesturePoses[style.person])for(const direction of directions)for(let frame=0;frame<4;frame++){
  packFrame(drawFashion(style,pose,frame,direction[0]==='n'),gestureAtlas,fashionColumns,gestureIndex++,direction);
 }
}
await sharp(atlas,{raw:{width:columns*W,height:rows*H,channels:4}}).png().toFile('public/art/characters.png');
await writeFile('src/garden/characters.json',JSON.stringify({width:columns*W,height:rows*H,frames}));
const fashionHeight=Math.ceil(fashionStyles.length*poses.length*directions.length*4/fashionColumns)*H;
await sharp(fashionAtlas,{raw:{width:fashionColumns*W,height:fashionHeight,channels:4}}).png().toFile('public/art/fashion.png');
await sharp(gestureAtlas,{raw:{width:fashionColumns*W,height:gestureHeight,channels:4}}).png().toFile('public/art/fashion-gestures.png');
await writeFile('src/garden/fashion.json',JSON.stringify({width:fashionColumns*W,height:fashionHeight,columns:fashionColumns,
 styles:fashionStyles.map(style=>style.ref),gestureHeight,gesturePoses,gestureStarts}));
await writeFile('public/art/characters-LICENSE.txt','Original LoveGarden character sprites, authored for this project. No reference photographs or third-party artwork are included. Rebuild with scripts/characters.mjs.\n');
await writeFile('public/art/fashion-LICENSE.txt','Original LoveGarden wardrobe sprites, authored for this project. No third-party artwork is included. Rebuild with scripts/characters.mjs.\n');
console.log(`Created ${index} character frames and ${fashionIndex} wardrobe layer frames.`);
