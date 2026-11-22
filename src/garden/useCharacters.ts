import {useEffect,useRef,useState} from 'react';
import type {GardenState} from '../lib/types';
import {CharacterDirector,type CharacterPose} from './characters';
const stepMs=80;
export function useCharacters(state:GardenState,now:number){
 const director=useRef<CharacterDirector|null>(null);
 if(!director.current)director.current=new CharacterDirector();
 const current=useRef({state,now,local:performance.now()});
 const [poses,setPoses]=useState<CharacterPose[]>([]);
 const draw=useRef<()=>void>(()=>{});
 useEffect(()=>{current.current={state,now,local:performance.now()};draw.current();},[state,now]);
 useEffect(()=>{
  const motion=window.matchMedia('(prefers-reduced-motion: reduce)');let handle=0,last=performance.now(),disposed=false;
  let simulatedAt:number|null=null;
  const paint=(time:number)=>{
   const latest=current.current,characters=director.current!;
   const target=Math.floor((latest.now+time-latest.local)/stepMs)*stepMs;
   let next:CharacterPose[]|undefined;
   // The shared clock selects the same simulation ticks on fast and slow screens.
   // A suspension skips ahead without replaying scenes or jumping the actors.
   if(simulatedAt===null||Math.abs(target-simulatedAt)>1000||motion.matches){
    characters.pause();
    simulatedAt=target;
   }else while(simulatedAt+stepMs<=target){
    simulatedAt+=stepMs;
    next=characters.update(latest.state,simulatedAt,stepMs/1000);
   }
   setPoses(next??characters.update(latest.state,simulatedAt,0,motion.matches));
   last=time;
  };
  const tick=(time:number)=>{if(disposed)return;if(time-last>=stepMs)paint(time);handle=requestAnimationFrame(tick);};
  const resume=()=>{
   cancelAnimationFrame(handle);
   simulatedAt=null;
   if(document.visibilityState!=='visible'){director.current?.pause();return;}
   last=performance.now();paint(last);
   if(!motion.matches)handle=requestAnimationFrame(tick);
  };
  draw.current=()=>{if(document.visibilityState==='visible')paint(performance.now());};
  document.addEventListener('visibilitychange',resume);motion.addEventListener('change',resume);resume();
  return()=>{disposed=true;cancelAnimationFrame(handle);draw.current=()=>{};document.removeEventListener('visibilitychange',resume);motion.removeEventListener('change',resume);};
 },[]);
 return poses;
}
