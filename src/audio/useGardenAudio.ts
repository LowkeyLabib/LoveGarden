import {useEffect,useRef,useState} from 'react';
import {GardenAudio,parsePreferences,type AudioPreferences,type AudioStatus} from './GardenAudio';
const storageKey='lovegarden.audio.v1';
export function useGardenAudio(night:boolean,paused:boolean){
 const [preferences,setPreferences]=useState<AudioPreferences>(()=>{try{return parsePreferences(localStorage.getItem(storageKey));}catch{return parsePreferences(null);}});
 const [status,setStatus]=useState<AudioStatus>('idle');
 const controller=useRef<GardenAudio|null>(null);
 const latest=useRef({night,paused,...preferences});latest.current={night,paused,...preferences};
 useEffect(()=>{
  const audio=new GardenAudio({...latest.current,visible:document.visibilityState==='visible'},setStatus);controller.current=audio;
  const gesture=()=>audio.unlock();
  const visibility=()=>audio.setOptions({...latest.current,visible:document.visibilityState==='visible'});
  const hide=()=>audio.setOptions({...latest.current,visible:false});
  document.addEventListener('pointerdown',gesture,{passive:true});document.addEventListener('keydown',gesture);document.addEventListener('click',gesture);
  document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',hide);window.addEventListener('pageshow',visibility);
  audio.start();
  return()=>{controller.current=null;document.removeEventListener('pointerdown',gesture);document.removeEventListener('keydown',gesture);document.removeEventListener('click',gesture);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',hide);window.removeEventListener('pageshow',visibility);audio.dispose();};
 },[]);
 useEffect(()=>{controller.current?.setOptions({...preferences,night,paused,visible:document.visibilityState==='visible'});try{localStorage.setItem(storageKey,JSON.stringify(preferences));}catch{/* Storage can be unavailable in private browsing. */}},[preferences,night,paused]);
 return {preferences,status,night,paused,setPreferences,chime:()=>controller.current?.chime(),retry:()=>controller.current?.retry()};
}
export type GardenAudioControls=ReturnType<typeof useGardenAudio>;
