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
