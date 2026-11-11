import atlas from './characters.json';
import type {CharacterPose} from './characters';
export function CharacterSprite({character}:{character:CharacterPose}){
 const {person,pose,direction,frame,x,y,hearts}=character;
 const f=atlas.frames[`${person}-${pose}-${direction}-${frame}` as keyof typeof atlas.frames];
 return <g transform={`translate(${Math.round(x)} ${Math.round(y)})`} pointerEvents="none" aria-hidden="true" data-character={person} data-pose={pose}>
  <svg x={-f.anchorX} y={-f.anchorY} width={f.w} height={f.h} viewBox={`${f.x} ${f.y} ${f.w} ${f.h}`} overflow="hidden"><image href="/art/characters.png" width={atlas.width} height={atlas.height} style={{imageRendering:'pixelated'}}/></svg>
  {hearts&&<g className="character-hearts" style={{animationDelay:person==='labib'?'-.7s':'-1.8s'}}><path d="M-4-47h2v1h1v-1h2v3h-1v1h-1v1h-1v-1h-1v-1h-1Z" fill="#e58cac"/><path d="M6-51h2v1h1v-1h2v3h-1v1H9v1H8v-1H7v-1H6Z" fill="#f2bdcb"/></g>}
 </g>;
}
