import {contactCell,momentCell,momentEffects,momentTexture} from './momentArt';
import {momentRows} from './littleMoments';
import type {ReactNode} from 'react';
import atlas from './characters.json';
import fashion from './fashion.json';
import type {CharacterPose} from './characters';
import {fashionFrame,gestureFrame} from './characterFrames';
function GestureEffects({character}:{character:CharacterPose}){
 const {gesture,gestureTime:time=0,direction}=character;
 const side=direction.endsWith('w')?-1:1;
 if(gesture==='surprised'&&time<720)return <path d="M-2-49h3v6h-3zm0 8h3v2h-3z" fill="#fff1bb" stroke="#b16a57" strokeWidth="1" shapeRendering="crispEdges"/>;
 if(gesture==='bonk'&&time>=745&&time<940)return <path transform={`translate(${side*18} -38)`} d="M0-6h2v4h4v2H2v4H0V0h-4v-2h4Z" fill="#ffe29e" shapeRendering="crispEdges"/>;
 if(gesture==='embarrassed'&&time<700)return <path transform={`translate(${side*10} ${-43+Math.floor(time/110)})`} d="M0-3h1v2h1v3h-3V0h1Z" fill="#a0d6da" opacity=".9"/>;
 if(gesture==='throw'&&time>=2250&&time<2740){
  const t=(time-2250)/490;
  return <g transform={`translate(${Math.round(side*(18+28*t))} ${Math.round(-34-18*t+32*t*t)})`} opacity={t<.78?1:(1-t)/.22}>
   <path d="M-2 0h4v1h-4z" fill="#f0dfc4"/><path d="M2 0h1v1H2z" fill="#d38663"/>
  </g>;
 }
 return null;
}
export function CharacterSprite({character,layers}:{character:CharacterPose;layers:string[]}){
 const {person,x,y,hearts}=character;
 const {pose,direction,frame}=gestureFrame(character);
 if(character.moment||character.catPose){
  const {row,column}=character.catPose?contactCell(character):momentCell(character.moment!,person,direction),effects:ReactNode[]=[];
  if(character.moment)momentEffects(character.moment,person,(x,y,w,h,color,alpha)=>effects.push(<rect key={effects.length} x={x} y={y} width={w} height={h} fill={'#'+color.toString(16).padStart(6,'0')} opacity={alpha}/>));
  return <g transform={`translate(${Math.round(x)} ${Math.round(y)})`} pointerEvents="none" aria-hidden="true">
   <svg x={-24} y={-49} width={48} height={56} viewBox={`${column*48} ${row*56} 48 56`} overflow="hidden">
    {[person,...layers].map(ref=><image key={ref} href={momentTexture(ref)} width={768} height={momentRows.length*56} style={{imageRendering:'pixelated'}}/>)}
   </svg>{effects}</g>;
 }
 const f=atlas.frames[`${person}-${pose}-${direction}-${frame}` as keyof typeof atlas.frames];
 const clothing=layers.flatMap(sprite=>{
  const layer=fashionFrame(sprite,person,pose,direction,frame);
  return layer?[{sprite,layer}]:[];
 });
 return <g transform={`translate(${Math.round(x)} ${Math.round(y)})`} pointerEvents="none" aria-hidden="true" data-character={person} data-pose={pose} data-gesture={character.gesture}>
  <svg x={-f.anchorX} y={-f.anchorY} width={f.w} height={f.h} viewBox={`${f.x} ${f.y} ${f.w} ${f.h}`} overflow="hidden"><image href="/art/characters.png" width={atlas.width} height={atlas.height} style={{imageRendering:'pixelated'}}/></svg>
  {character.gesture==='hurry'&&direction.startsWith('s')&&<path transform={`translate(0 ${frame%2-1})`} d="M-5-28h2v1h1v1h-2v-1h-1zm6 1h1v-1h2v1H3v1H1z" fill="#51333d" shapeRendering="crispEdges"/>}
  {clothing.map(({sprite,layer})=><svg key={sprite} x={-layer.anchorX} y={-layer.anchorY} width={layer.w} height={layer.h} viewBox={`${layer.x} ${layer.y} ${layer.w} ${layer.h}`} overflow="hidden"><image href={layer.source} width={fashion.width} height={layer.height} style={{imageRendering:'pixelated'}}/></svg>)}
  <GestureEffects character={character}/>
  {character.idleHeart&&!hearts&&<path className="character-hearts" style={{animationDuration:'1.25s',animationIterationCount:1}} d="M-2-45h2v1h1v-1h2v3H2v1H1v1H0v-1h-1v-1h-1Z" fill="#e6a0b0"/>}
  {hearts&&<g className="character-hearts" style={{animationDelay:person==='labib'?'-.7s':'-1.8s'}}><path d="M-4-47h2v1h1v-1h2v3h-1v1h-1v1h-1v-1h-1v-1h-1Z" fill="#e58cac"/><path d="M6-51h2v1h1v-1h2v3h-1v1H9v1H8v-1H7v-1H6Z" fill="#f2bdcb"/></g>}
 </g>;
}
