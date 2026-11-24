import {useEffect,useRef,useState} from 'react';
import type {GardenState} from '../lib/types';
import type {CharacterPose} from './characters';
import {CharacterTimeline,characterStepMs} from './characterTimeline';
export function useCharacters(state:GardenState,now:number,enabled=true){
 const director=useRef<CharacterTimeline|null>(null);
 if(enabled&&!director.current)director.current=new CharacterTimeline();
 const current=useRef({state,now,local:performance.now()});
 const [poses,setPoses]=useState<CharacterPose[]>([]);
 const draw=useRef<()=>void>(()=>{});
 useEffect(()=>{current.current={state,now,local:performance.now()};draw.current();},[state,now]);
 useEffect(()=>{
  if(!enabled)return;
  const motion=window.matchMedia('(prefers-reduced-motion: reduce)');let handle=0,last=performance.now(),disposed=false;
  const paint=(time:number)=>{
   const latest=current.current;
   setPoses(director.current!.sample(latest.state,latest.now+time-latest.local,motion.matches,true));
   last=time;
  };
  const tick=(time:number)=>{if(disposed)return;if(time-last>=characterStepMs)paint(time);handle=requestAnimationFrame(tick);};
  const resume=()=>{
   cancelAnimationFrame(handle);
   director.current?.pause();
   if(document.visibilityState!=='visible')return;
   last=performance.now();paint(last);
   if(!motion.matches)handle=requestAnimationFrame(tick);
  };
  draw.current=()=>{if(document.visibilityState==='visible')paint(performance.now());};
  document.addEventListener('visibilitychange',resume);motion.addEventListener('change',resume);resume();
  return()=>{disposed=true;cancelAnimationFrame(handle);draw.current=()=>{};document.removeEventListener('visibilitychange',resume);motion.removeEventListener('change',resume);};
 },[enabled]);
 return poses;
}
