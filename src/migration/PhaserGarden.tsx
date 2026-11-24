import {useEffect,useRef} from 'react';
import type {GardenState} from '../lib/types';
import type {GardenScene} from './scene';

export type WorldView={x:number;y:number;zoom:number;width:number;height:number};
export type ViewBridge={view?:WorldView;scene?:GardenScene};
type Props={state:GardenState;now:number;bridge:ViewBridge;onError:()=>void};

export default function PhaserGarden({state,now,bridge,onError}:Props){
 const host=useRef<HTMLDivElement>(null);
 const latest=useRef({state,now});
 useEffect(()=>{latest.current={state,now};bridge.scene?.sync(state,now);},[state,now,bridge]);
 useEffect(()=>{
  let disposed=false;
  let destroy:(()=>void)|undefined;
  void import('./scene').then(({mountGarden})=>{
   if(disposed||!host.current)return;
   const mounted=mountGarden(host.current,()=>latest.current,()=>bridge.view,onError);
   bridge.scene=mounted.scene;
   destroy=mounted.destroy;
  }).catch(()=>{if(!disposed)onError();});
  return ()=>{disposed=true;bridge.scene=undefined;destroy?.();};
 },[bridge,onError]);
 return <div ref={host} aria-hidden="true" style={{position:'absolute',inset:0,pointerEvents:'none',imageRendering:'pixelated'}}/>;
}
