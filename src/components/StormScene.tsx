// Appearance only: the normal scene and its hit targets are unmounted, never deleted.
export default function StormScene(){
 const drops=Array.from({length:12},(_,i)=>({x:(i*47)%128,y:(i*61)%160}));
 return <g pointerEvents="none" aria-hidden="true" shapeRendering="crispEdges">
  <defs><pattern id="angry-rain" width="128" height="160" patternUnits="userSpaceOnUse"><g className="angry-rain-drops">{[-160,0].map(offset=>drops.map(({x,y},i)=><path key={`${offset}-${i}`} d={`M${x} ${y+offset}v5h-1v5h-1v3`} stroke={i%3?'#bbd0db':'#deebee'} strokeWidth="1" fill="none" opacity={.16+i%3*.08}/>))}</g></pattern></defs>
  <image href="/art/angry-terrain.png" width="720" height="450" style={{imageRendering:'pixelated'}}/>
  {[[260,200],[347,252],[421,224],[318,150],[373,300],[196,228]].map(([x,y],i)=><path key={i} className="rain-ripple" d={`M${x-8} ${y}l8-4 8 4-8 4Z`} fill="none" stroke="#adbfca" opacity=".35" style={{animationDelay:`${-i*.43}s`}}/>)}
  <rect x="-1000" y="-1000" width="3000" height="3000" fill="url(#angry-rain)"/>
 </g>;
}
