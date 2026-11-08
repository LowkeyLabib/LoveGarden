import { useRef, useState, type FormEvent } from 'react';
import Modal from './Modal';
import { Icon, Flower, ItemPicture, flowerColors } from './Art';
import { hidingPlaces, spots } from './Garden';
import { supabase, rpc, spotifyTrack, uploadPhoto } from '../lib/api';
import type { GardenState } from '../lib/types';
export const giftNames:Record<string,string>={letter:'Love letter',chocolate:'Chocolates',teddy:'Teddy bear',bouquet:'Bouquet',box:'Gift box',special:'Special present'};
export const date=(value:string)=>new Date(value).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'});
export const errorMessage=(e:unknown)=>e && typeof e==='object' && 'message' in e ? String(e.message) : 'Something went wrong. Please try again.';
export const titleCase=(s:string)=>s.charAt(0).toUpperCase()+s.slice(1);
export function Compose({mode,spot,state,onDone,onCancel}:{mode:'flower'|'gift';spot:number;state:GardenState;onDone:()=>void;onCancel:()=>void}){
 const [type,setType]=useState(mode==='flower'?'rose':'letter'),[location,setLocation]=useState(spot);
 const [message,setMessage]=useState(''),[song,setSong]=useState(''),[caption,setCaption]=useState(''),[file,setFile]=useState<File|null>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const request=useRef(crypto.randomUUID()),photo=useRef<{file:File;path:string}|null>(null);
 async function submit(e:FormEvent){e.preventDefault();if(busy)return;setBusy(true);setError('');try{
  const spotify=spotifyTrack(song);if(mode==='flower'&&!message.trim()&&!spotify&&!file)throw new Error('Tuck in a message, a song, or a photograph.');
  let path:string|null=null;if(file){if(photo.current?.file===file)path=photo.current.path;else{path=await uploadPhoto(file);photo.current={file,path};}}
  await rpc(mode==='flower'?'plant_seed':'hide_gift',{p_id:request.current,...(mode==='flower'?{p_spot:location,p_type:type}:{p_location:location,p_kind:type}),p_message:message.trim(),p_spotify:spotify,p_photo:path,p_caption:caption.trim()});onDone();
 }catch(err){setError(errorMessage(err));}finally{setBusy(false);}}
 const options=mode==='flower'?Object.keys(flowerColors):Object.keys(giftNames);
 return <Modal title={mode==='flower'?'Plant a little love':'Hide a little happiness'} subtitle={mode==='flower'?'A flower on the outside. A memory on the inside.':'A small surprise, waiting just for Mehezad.'} onClose={()=>{if(!busy)onCancel();}}><form onSubmit={submit} className="compose-form"><fieldset disabled={busy}><legend className="sr-only">Create a {mode}</legend><label>Choose your {mode}</label><div className="type-picker">{options.map(item=><button key={item} type="button" aria-pressed={type===item} className={type===item?'selected':''} onClick={()=>setType(item)}>{mode==='flower'?<svg viewBox="-40 -100 80 120" aria-hidden="true"><Flower type={item}/></svg>:<ItemPicture kind={item} gift/>}<span>{mode==='flower'?titleCase(item):giftNames[item]}</span></button>)}</div>
 <label htmlFor="location">{mode==='flower'?'Planting spot':'A hiding place'}</label><select id="location" value={location} onChange={e=>setLocation(Number(e.target.value))}>{(mode==='flower'?spots.filter(p=>!state.seeds.some(s=>s.spot===p.id)).map(p=>({id:p.id,name:`Flower bed ${Math.floor(p.id/5)+1} · spot ${p.id%5+1}`})):hidingPlaces.map((p,id)=>({id,name:p.name})).filter(p=>!state.gifts.some(g=>g.location===p.id&&!g.claimed_at))).map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>
 <label htmlFor="message">A note from the heart <span>optional with a song or photo</span></label><textarea id="message" maxLength={4000} rows={4} value={message} onChange={e=>setMessage(e.target.value)} placeholder="Something I've been meaning to tell you…"/>
 <label htmlFor="song">Your song <span>optional</span></label><input id="song" type="url" value={song} onChange={e=>setSong(e.target.value)} placeholder="https://open.spotify.com/track/…"/>
 <label htmlFor="photo">A photograph <span>optional · JPG, PNG, WebP · up to 5 MB</span></label><input id="photo" type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setFile(e.target.files?.[0]??null)}/>
 {file&&<><label htmlFor="caption">Photo caption</label><input id="caption" maxLength={300} value={caption} onChange={e=>setCaption(e.target.value)} placeholder="The story behind this moment"/></>}{error&&<p className="form-error" role="alert">{error}</p>}<p className="privacy-note"><Icon name="lock" size={15}/>Only the two of you can read what’s inside.</p><button type="submit" className="primary full" disabled={busy}>{busy?'Tucking away your memory…':mode==='flower'?'Plant this memory':'Hide this surprise'}<Icon name={mode==='flower'?'leaf':'gift'} size={18}/></button></fieldset></form></Modal>;
}
export function Login({onClose,onSignedIn}:{onClose:()=>void;onSignedIn:()=>void}){
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function submit(e:FormEvent){e.preventDefault();if(!supabase||busy)return;setBusy(true);setError('');try{const {error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error;onSignedIn();}catch(err){setError(errorMessage(err));}finally{setBusy(false);}}
 return <Modal title="Welcome home" subtitle="A little world, just for the two of you." onClose={onClose}>{supabase?<form onSubmit={submit} className="login-form"><div className="login-illustration"><ItemPicture kind="arch"/><span>YOUR LITTLE WORLD AWAITS</span></div><label htmlFor="email">Email address</label><input id="email" autoComplete="username" type="email" value={email} onChange={e=>setEmail(e.target.value)} required/><label htmlFor="password">Password</label><input id="password" autoComplete="current-password" type="password" value={password} onChange={e=>setPassword(e.target.value)} required/>{error&&<p className="form-error" role="alert">{error}</p>}<button className="primary full" disabled={busy}>{busy?'Opening the gate…':'Enter our garden'}<Icon name="leaf" size={18}/></button><p className="small muted">Your memories, your favorite person, your little garden.</p></form>:<Empty icon="leaf" title="Your garden is ready to connect" text="Supabase setup is still needed before signing in. You can explore the illustrated garden in the meantime."/>}</Modal>;
}
export function Empty({icon,title,text}:{icon:string;title:string;text:string}){return <div className="empty-state"><span><Icon name={icon} size={36}/></span><h3>{title}</h3><p>{text}</p></div>}
