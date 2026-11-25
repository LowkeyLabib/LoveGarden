import {useEffect,useRef,useState} from 'react';
import type {ViewBridge} from '../migration/PhaserGarden';
import Modal from './Modal';

type Phase='waiting'|'star'|'wish'|'sent';
export default function WishStar({bridge,player,chime}:{bridge:ViewBridge;player:boolean;chime:()=>void}){
 const [phase,set]=useState<Phase>('waiting');
 const target=useRef<HTMLButtonElement>(null), sound=useRef(chime);
 sound.current=chime;
 useEffect(()=>{
  if(phase==='waiting'){
   const appear=()=>{if(bridge.scene?.sys.isActive()){set('star');sound.current();}};
   const timer=window.setTimeout(appear,180000+Math.random()*240000);
   if(import.meta.env.DEV)window.addEventListener('lovegarden:test-star',appear);
   return ()=>{clearTimeout(timer);if(import.meta.env.DEV)window.removeEventListener('lovegarden:test-star',appear);};
  }
  if(phase==='wish')return;
  const scene=bridge.scene;
  if(!scene?.sys.isActive()){set('waiting');return;}
  const stars=scene.add.graphics().setDepth(100000);
  const progress={t:0}, sent=phase==='sent', still=matchMedia('(prefers-reduced-motion: reduce)').matches;
  function draw(){
   if(!scene)return;
   const cam=scene.cameras.main,t=progress.t;
   const x=Math.round(cam.width*(sent?.5:.15+(still?.35:t*.67))),y=Math.round(cam.height*(sent?.42:.21+(still?0:t*.15)));
   const pos=cam.getWorldPoint(x,y);
   stars.clear().setPosition(pos.x,pos.y).setScale(1/cam.zoom);
   if(target.current){target.current.style.left=x+'px';target.current.style.top=y+'px';}
   if(sent){
    for(let i=0;i<12;i++)stars.fillStyle(i%2?0xffedbd:0xd8bef4,1-t).fillRect(Math.round(Math.sin(i*7)*(12+36*t)),Math.round(-i*2-(still?0:64*t)),2,2);
   }else{
    for(let i=1;i<=9;i++)stars.fillStyle(0xe8cffb,(10-i)*.08).fillRect(-i*3,-i,4,2);
    stars.fillStyle(0xdcc4ef,.25).fillCircle(0,0,8).fillStyle(0xffedbb).fillRect(-6,-1,13,3).fillRect(-1,-6,3,13).fillStyle(0xfffced).fillRect(-2,-2,5,5);
   }
  }
  draw();
  const tween=scene.tweens.add({targets:progress,t:1,duration:sent?2300:6000,onUpdate:draw,onComplete:()=>set('waiting')});
  return ()=>{tween.remove();stars.destroy();};
 },[phase,bridge]);
 if(phase==='star'&&player)return <button ref={target} aria-label="Make a wish on the shooting star" onClick={()=>set('wish')} style={{position:'absolute',zIndex:2,transform:'translate(-50%,-50%)',width:48,height:48,padding:0,background:'transparent',border:0,boxShadow:'none'}}/>;
 if(phase==='wish'&&player)return <Modal title="Make a wish…" subtitle="Some wishes are too precious to say out loud." onClose={()=>set('waiting')}><form style={{background:'#302945',color:'#fff4dc',padding:'1rem',borderRadius:12,display:'grid',gap:12}} onSubmit={e=>{e.preventDefault();set('sent');sound.current();}}><input aria-label="Your wish" placeholder="Write your wish here…" maxLength={200} autoComplete="off" spellCheck={false}/><button>Send to the stars</button></form></Modal>;
 return phase==='sent'?<span role="status" style={{position:'absolute',top:'43%',width:'100%',textAlign:'center',color:'#fff6dc',textShadow:'0 1px 4px #29213d',pointerEvents:'none'}}>The universe is listening.</span>:null;
}
