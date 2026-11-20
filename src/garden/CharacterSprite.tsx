import atlas from './characters.json';
import fashion from './fashion.json';
import type {CharacterPose} from './characters';
const poses=['idle','walk','sit','plant','water','sad','smoke'],directions=['se','sw','ne','nw'];
const styleIndexes=new Map(fashion.styles.map((style,index)=>[style,index]));
function fashionFrame(sprite:string,pose:string,direction:string,frame:number){
 const style=styleIndexes.get(sprite),poseIndex=poses.indexOf(pose),directionIndex=directions.indexOf(direction);
 if(style===undefined||poseIndex<0||directionIndex<0)return null;
 const index=style*poses.length*directions.length*4+poseIndex*directions.length*4+directionIndex*4+frame;
 return {x:index%fashion.columns*48,y:Math.floor(index/fashion.columns)*56,w:48,h:56,anchorX:24,anchorY:49};
}
export function CharacterSprite({character,layers}:{character:CharacterPose;layers:string[]}){
 const {person,pose,direction,frame,x,y,hearts}=character;
 const f=atlas.frames[`${person}-${pose}-${direction}-${frame}` as keyof typeof atlas.frames];
 const clothing=layers.flatMap(sprite=>{
  const layer=fashionFrame(sprite,pose,direction,frame);
  return layer?[{sprite,layer}]:[];
 });
 return <g transform={`translate(${Math.round(x)} ${Math.round(y)})`} pointerEvents="none" aria-hidden="true" data-character={person} data-pose={pose}>
  <svg x={-f.anchorX} y={-f.anchorY} width={f.w} height={f.h} viewBox={`${f.x} ${f.y} ${f.w} ${f.h}`} overflow="hidden"><image href="/art/characters.png" width={atlas.width} height={atlas.height} style={{imageRendering:'pixelated'}}/></svg>
  {clothing.map(({sprite,layer})=><svg key={sprite} x={-layer.anchorX} y={-layer.anchorY} width={layer.w} height={layer.h} viewBox={`${layer.x} ${layer.y} ${layer.w} ${layer.h}`} overflow="hidden"><image href="/art/fashion.png" width={fashion.width} height={fashion.height} style={{imageRendering:'pixelated'}}/></svg>)}
  {hearts&&<g className="character-hearts" style={{animationDelay:person==='labib'?'-.7s':'-1.8s'}}><path d="M-4-47h2v1h1v-1h2v3h-1v1h-1v1h-1v-1h-1v-1h-1Z" fill="#e58cac"/><path d="M6-51h2v1h1v-1h2v3h-1v1H9v1H8v-1H7v-1H6Z" fill="#f2bdcb"/></g>}
 </g>;
}
