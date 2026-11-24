import {momentFrame,momentRow,momentRows,type MomentPose} from './littleMoments.ts';
import type {CharacterPose,Person} from './characters.ts';

export function momentCell(m:MomentPose,person:Person,direction:CharacterPose['direction']){
 // A brief glance turns a moving pair inward. Their clasp stays on the same
 // world-space side in every direction of the walking sheet.
 if(m.kind==='hands'&&m.elapsed%8700>7850)direction=person==='labib'?'se':'sw';
 if(m.kind==='chase'&&person==='mehezad'&&m.elapsed%4900>4240)
  direction=({se:'nw',sw:'ne',ne:'sw',nw:'se'} as const)[direction];
 const row=momentRows.indexOf(momentRow(m,person));
 const column=['se','sw','ne','nw'].indexOf(direction)*4+momentFrame(m);
 return {row,column,index:row*16+column};
}
export function contactCell(p:CharacterPose){
 const row=momentRows.indexOf(p.catPose!),column=['se','sw','ne','nw'].indexOf(p.direction)*4+p.frame;
 return {row,column,index:row*16+column};
}
export const momentTexture=(ref:string)=>'/art/moments/'+ref.replace(/^fashion\//,'').replaceAll('/','-')+'.png';

type Pixel=(x:number,y:number,w:number,h:number,color:number,alpha:number)=>void;
// Effect coordinates are relative to the actor's feet, just like the sprite artwork.
export function momentEffects(m:MomentPose,person:Person,draw:Pixel){
 const {kind,elapsed:t,duration:d}=m;
 const progress=t/d,phase=(t%2600)/2600;
 if(kind==='stars'&&person==='labib'){
  for(let i=0;i<3;i++){
   const x=-24+i*23,y=-41-(i%2)*10,a=.35+.55*(1+Math.sin(t/850+i*2))/2;
   draw(x,y-1,1,3,0xffedb7,a);draw(x-1,y,3,1,0xd5e5ff,a);
  }
  if(t>16500&&t<17200){
   const f=(t-16500)/700,x=Math.round(-37+f*50),y=Math.round(-54+f*13);
   draw(x,y,3,1,0xffecc4,1-f);draw(x-3,y-1,3,1,0xc5cbee,(1-f)*.7);
  }
 }
 if(kind==='cuddle'&&person==='mehezad'&&phase<.58&&progress>.13&&progress<.86){
  const y=-38-Math.floor(phase*9);
  draw(6,y,3,1,0xefe3cf,.8);draw(7,y+1,1,1,0xefe3cf,.8);draw(6,y+2,3,1,0xefe3cf,.8);
 }
 if(kind==='dance'&&person==='labib'){
  const x=-13+Math.round(phase*25),y=-4-Math.round(Math.sin(phase*Math.PI)*12);
  draw(x,y,2,1,0xffe3b4,.65);draw(x+1,y-1,1,3,0xf1ce9a,.45);
 }
 if(!['hug','kiss','flower','dance'].includes(kind)||person!==m.initiator||progress<.26||progress>.9||phase>.52)return;
 const x=Math.round(3+Math.sin(phase*4)*2),y=-39-Math.round(phase*13),a=1-phase;
 draw(x,y,2,1,0xffbdd0,a);draw(x+3,y,2,1,0xffbdd0,a);draw(x,y+1,5,2,0xf398af,a);
 draw(x+1,y+3,3,1,0xd67f9a,a);draw(x+2,y+4,1,1,0xd67f9a,a);
}
