import fashion from './fashion.json';
import type {CharacterPose} from './characters';
import type {GardenState} from '../lib/types';
export const poses=['idle','walk','sit','plant','water','sad','smoke'],directions=['se','sw','ne','nw'];
const styleIndexes=new Map(fashion.styles.map((style,index)=>[style,index]));
const gestureStarts=new Map(Object.entries(fashion.gestureStarts));
export function fashionFrame(sprite:string,person:CharacterPose['person'],pose:string,direction:string,frame:number){
 const style=styleIndexes.get(sprite),directionIndex=directions.indexOf(direction);
 if(style===undefined||directionIndex<0)return null;
 const gestureIndex=fashion.gesturePoses[person].indexOf(pose),gesturing=gestureIndex>=0;
 const start=gesturing?gestureStarts.get(sprite):style*poses.length*directions.length*4;
 const poseIndex=gesturing?gestureIndex:poses.indexOf(pose);
 if(start===undefined||poseIndex<0)return null;
 const index=start+poseIndex*directions.length*4+directionIndex*4+frame;
 return {x:index%fashion.columns*48,y:Math.floor(index/fashion.columns)*56,w:48,h:56,anchorX:24,anchorY:49,
  source:gesturing?'/art/fashion-gestures.png':'/art/fashion.png',height:gesturing?fashion.gestureHeight:fashion.height};
}
const sequenceFrame=(time:number,start:number,duration:number)=>Math.max(0,Math.min(3,Math.floor((time-start)*4/duration)));
export function gestureFrame(character:CharacterPose){
 const {gesture,gestureTime:time=0}=character;
 const turn=character.direction.endsWith('w')?'se':'sw';
 switch(gesture){
  case 'lookout':return {pose:'idle',direction:time<550?turn:character.direction,frame:0};
  case 'light':return {...character,pose:'smoke-standing',frame:time<1650?0:1};
  case 'smoking':return {...character,pose:'smoke-standing',frame:Math.floor((time-2200)/660)%4};
  case 'surprised':return {...character,pose:'smoke-standing',frame:0};
  case 'hurry':return {...character,frame:character.pose==='walk'?Math.floor(time/95)%4:0};
  case 'scold':return {...character,pose:gesture,frame:sequenceFrame(time,0,650)};
  case 'bonk':return {...character,pose:gesture,frame:sequenceFrame(time,650,400)};
  case 'snatch':return {...character,pose:gesture,frame:sequenceFrame(time,1050,650)};
  case 'throw':return {...character,pose:gesture,frame:sequenceFrame(time,1700,1100)};
  case 'embarrassed':return {...character,pose:gesture,frame:sequenceFrame(time,0,640)};
  default:return character;
 }
}


export function wardrobeLayers(fashion:GardenState['fashion']){
  const variants=new Map((fashion?.variants??[]).map(item=>[`${item.catalog_id}:${item.character}:${item.slot}`,item.sprite_ref]));
  const equipped=new Map((fashion?.equipped??[]).map(item=>[`${item.character}:${item.slot}`,item.catalog_id]));
  const layers=(character:'LABIB'|'MEHEZAD')=>['outfit','headwear','accessory'].flatMap(slot=>{
   const catalogId=equipped.get(`${character}:${slot}`);
   const sprite=catalogId&&variants.get(`${catalogId}:${character}:${slot}`);
   return sprite?[sprite]:[];
  });
  const result={labib:layers('LABIB'),mehezad:layers('MEHEZAD')};
  return result;
}
