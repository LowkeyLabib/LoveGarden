import Modal from './Modal';
import {Icon,Flower} from './Art';
import type {GardenAudioControls} from '../audio/useGardenAudio';
export default function AudioSettings({audio,onClose}:{audio:GardenAudioControls;onClose:()=>void}){
 const {preferences,status,night,setPreferences}=audio;
 const caption=status==='error'?'Music couldn’t load. Please try again.':status==='blocked'||status==='idle'?'Tap to begin your garden soundtrack.':status==='loading'?'Getting the music ready…':audio.paused?'Music rests while you enjoy your song.':status==='muted'?'A quiet moment. Music is muted.':status==='paused'?'Music will return with you.':'An original soundtrack for your little world.';
 return <Modal title="Sound of the garden" subtitle="A softer pace, a little closer to home." onClose={onClose}>
 <div className={`soundtrack-cover ${night?'night':''}`}><svg viewBox="-50 -105 100 125" aria-hidden="true"><Flower type={night?'bluebell':'daisy'}/></svg><div><span className="eyebrow">{night?'MOONLIGHT MELODY':'DAYLIGHT MELODY'}</span><h3>{night?'Moonlit Petals':'Morning Letters'}</h3><div className={`audio-bars ${status==='playing'?'playing':''}`} aria-hidden="true">{[0,1,2,3,4].map(i=><i key={i} style={{animationDelay:`${i*-.17}s`}}/> )}</div></div></div>
 <div className="audio-setting"><div><strong>Background music</strong><small>Changes gently with the garden clock</small></div><button className="audio-toggle" aria-label="Background music" aria-pressed={!preferences.muted} onClick={()=>setPreferences(p=>({...p,muted:!p.muted}))}><span/>{preferences.muted?'Off':'On'}</button></div>
 <label className="volume-label" htmlFor="music-volume"><span>Music volume</span><output htmlFor="music-volume">{Math.round(preferences.volume*100)}%</output></label>
 <div className="volume-control"><Icon name="mute" size={18}/><input id="music-volume" type="range" min="0" max="100" step="1" value={Math.round(preferences.volume*100)} onChange={e=>setPreferences(p=>({...p,volume:Number(e.target.value)/100}))} aria-valuetext={`${Math.round(preferences.volume*100)} percent`}/><Icon name="sound" size={19}/></div>
 <div className="audio-setting"><div><strong>Garden sound effects</strong><small>Little chimes for your lovely moments</small></div><button className="audio-toggle" aria-label="Garden sound effects" aria-pressed={preferences.sfx} onClick={()=>setPreferences(p=>({...p,sfx:!p.sfx}))}><span/>{preferences.sfx?'On':'Off'}</button></div>
 <p className="audio-status" role="status">{caption}</p>{(status==='error'||status==='blocked'||status==='idle')&&<button className="secondary full" onClick={audio.retry}>{status==='error'?'Try music again':'Play music'}</button>}
 </Modal>;
}
