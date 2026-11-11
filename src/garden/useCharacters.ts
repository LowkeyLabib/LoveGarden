import {useEffect,useRef,useState} from 'react';
import type {GardenState} from '../lib/types';
import {CharacterDirector,type CharacterPose} from './characters';
export function useCharacters(state:GardenState,now:number){
 const director=useRef<CharacterDirector|null>(null);
 if(!director.current)director.current=new CharacterDirector();
 const current=useRef({state,now,local:performance.now()});
 const [poses,setPoses]=useState<CharacterPose[]>([]);
 const draw=useRef<()=>void>(()=>{});
 useEffect(()=>{current.current={state,now,local:performance.now()};draw.current();},[state,now]);
 useEffect(()=>{
  const motion=window.matchMedia('(prefers-reduced-motion: reduce)');let handle=0,last=performance.now(),disposed=false;
  const paint=(time:number)=>{const latest=current.current;setPoses(director.current!.update(latest.state,latest.now+time-latest.local,(time-last)/1000,motion.matches));last=time;};
  const tick=(time:number)=>{if(disposed)return;if(time-last>=80)paint(time);handle=requestAnimationFrame(tick);};
  const resume=()=>{cancelAnimationFrame(handle);if(document.visibilityState!=='visible')return;last=performance.now();paint(last);if(!motion.matches)handle=requestAnimationFrame(tick);};
  draw.current=()=>{if(document.visibilityState==='visible')paint(performance.now());};
  document.addEventListener('visibilitychange',resume);motion.addEventListener('change',resume);resume();
  return()=>{disposed=true;cancelAnimationFrame(handle);draw.current=()=>{};document.removeEventListener('visibilitychange',resume);motion.removeEventListener('change',resume);};
 },[]);
 return poses;
}
