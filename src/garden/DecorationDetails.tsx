import {memo} from 'react';

const lights:Record<string,readonly [number,number,number][]> = {
 'glowing-mushrooms': [[-11,-8,12],[0,-13,15],[10,-8,10]],
 'romantic-gazebo': [[-32,-29,21],[32,-29,21]],
 'moonlit-bridge': [[-36,-22,14],[30,-22,14],[-27,-14,16],[39,-14,16]],
 'fairy-cottage': [[-26,-20,20],[19,-18,22]],
};

export function DecorationLights({kind,x,y}:{kind:string;x:number;y:number}){
 return (lights[kind]??[]).map(([dx,dy,r],i)=><circle key={i} cx={x+dx} cy={y+dy} r={r} fill="url(#lamp-light)"/>);
}

export const PondLife=memo(function PondLife({main=false}:{main?:boolean}){
 return <g pointerEvents="none" aria-hidden="true">
  <g className="koi-drift">
   <path d="M-5 0-2-2h6l3 2-3 2h-6l-3-1-3 2V-2Z" fill="#e8d7b0"/>
   <path d="M-1-2h2v2h-3zm4 2h2v1H3z" fill="#c67b63"/>
   <path d="M-8 5h5m-3 2h6" stroke="#9ccec0" opacity=".65"/>
  </g>
  {main&&<g className="koi-drift koi-drift-late" transform="translate(25 -5)"><path d="M-5 0-2-2h6l3 2-3 2h-6l-3-1-3 2V-2Z" fill="#e3b17a"/></g>}
  <path className="pond-glimmer" d="M-19-2h5m15 6h6m5-9h5" stroke="#c1e0c9" fill="none"/>
 </g>;
});

export const SceneryLife=memo(function SceneryLife({kind,x,y}:{kind:string;x:number;y:number}){
 if(kind==='birdhouse'||kind==='garden-birdhouse')return <g transform={`translate(${x} ${y-33})`} pointerEvents="none" aria-hidden="true">
  <g className="visiting-bird"><path d="M-5 1h3v-2h4l2 1h2v1H3L1 3h-4z" fill="#6d7a85"/><path d="M-2 0h3v2h-3z" fill="#c8c3a9"/></g>
 </g>;
 if(kind==='cherry'||kind==='cherry-blossom-tree')return <g transform={`translate(${x} ${y-42})`} pointerEvents="none" aria-hidden="true">
  {[-11,10].map((dx,i)=><path key={dx} className="garden-petal" d={`M${dx} 0h3v1h-1v2h-2z`} fill="#f1b9c5" style={{animationDelay:`${-i*6-x%9}s`}}/>)}
 </g>;
 return null;
});

export function MushroomFireflies({x,y}:{x:number;y:number}){
 return <g transform={`translate(${x} ${y-14})`} pointerEvents="none" aria-hidden="true">
  {[-8,5,13].map((dx,i)=><rect key={dx} x={dx} y={-i*4} width="2" height="2" fill="#ffe4a7" className="pixel-firefly" style={{animationDelay:`${-i*2}s`}}/>)}
 </g>;
}
