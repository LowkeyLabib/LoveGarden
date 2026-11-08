export type AudioPreferences={volume:number;muted:boolean;sfx:boolean};
export type AudioStatus='idle'|'loading'|'playing'|'paused'|'muted'|'blocked'|'error';
type Options=AudioPreferences & {night:boolean;visible:boolean;paused:boolean};
type Track='day'|'night';
type Voice={source:AudioBufferSourceNode;gain:GainNode;started:number;offset:number;timer?:ReturnType<typeof setTimeout>};
export const defaultPreferences:AudioPreferences={volume:.25,muted:false,sfx:false};
export function parsePreferences(raw:string|null):AudioPreferences{
 try{const value=JSON.parse(raw||'null');return {volume:typeof value?.volume==='number'&&Number.isFinite(value.volume)?Math.max(0,Math.min(1,value.volume)):.25,muted:typeof value?.muted==='boolean'?value.muted:false,sfx:typeof value?.sfx==='boolean'?value.sfx:false};}catch{return {...defaultPreferences};}
}
/** One audio graph owned by the app, independent of panels and garden renders. */
export class GardenAudio{
 private context:AudioContext|null=null;
 private master:GainNode|null=null;
 private buffers:Partial<Record<Track,AudioBuffer>>={};
 private voices=new Map<Track,Voice>();
 private offsets:Record<Track,number>={day:0,night:0};
 private effects=new Set<OscillatorNode>();
 private loading:Promise<void>|null=null;
 private abort=new AbortController();
 private active=false;
 private disposed=false;
 private request=0;
 private phase:Track|null=null;
 private status:AudioStatus='idle';
 private options:Options;
 private notify:(status:AudioStatus)=>void;
 private createContext:()=>AudioContext;
 constructor(options:Options,notify:(status:AudioStatus)=>void,createContext=()=>new AudioContext()){
  this.options=options;this.notify=notify;this.createContext=createContext;
 }
 setOptions(options:Options){this.options=options;void this.synchronize();}
 unlock(){if(this.disposed)return;const first=!this.active;this.active=true;if(first||this.status==='blocked'||(this.context&&this.context.state!=='running'&&this.status!=='error')){try{void this.graph().resume().then(()=>this.synchronize()).catch(()=>this.publish('blocked'));}catch{this.publish('error');}}}
 retry(){if(this.disposed)return;this.active=true;try{void this.graph().resume().then(()=>this.synchronize()).catch(()=>this.publish('blocked'));}catch{this.publish('error');}}
 private publish(status:AudioStatus){if(!this.disposed&&this.status!==status){this.status=status;this.notify(status);}}
 private graph(){if(!this.context){this.context=this.createContext();this.master=this.context.createGain();this.master.gain.value=this.options.volume;this.master.connect(this.context.destination);}return this.context;}
 private ramp(param:AudioParam,value:number,seconds:number){const now=this.context!.currentTime;if(typeof param.cancelAndHoldAtTime==='function')param.cancelAndHoldAtTime(now);else{const current=param.value;param.cancelScheduledValues(now);param.setValueAtTime(current,now);}param.linearRampToValueAtTime(value,now+seconds);}
 private async load(){
  if(this.buffers.day&&this.buffers.night)return;
  if(!this.loading)this.loading=(async()=>{
   const tracks=await Promise.all((['day','night'] as Track[]).map(async track=>{
    const response=await fetch(`/audio/${track}.wav`,{signal:this.abort.signal});if(!response.ok)throw new Error('Music file unavailable');
    const bytes=await response.arrayBuffer();if(this.disposed)return null;
    const buffer=await this.context!.decodeAudioData(bytes);return {track,buffer};
   }));
   if(!this.disposed)for(const result of tracks)if(result)this.buffers[result.track]=result.buffer;
  })().finally(()=>{this.loading=null;});
  await this.loading;
 }
 private async synchronize(){
  const request=++this.request;if(!this.active||this.disposed)return;
  const current=()=>!this.disposed&&request===this.request;
  if(!this.options.visible){this.stopMusic();this.stopEffects();void this.context?.suspend().catch(()=>{});this.publish('paused');return;}
  try{
   const ctx=this.graph();this.ramp(this.master!.gain,this.options.volume,.15);
   if(!this.options.sfx)this.stopEffects();
   if(this.options.muted||this.options.volume===0||this.options.paused){
    this.stopMusic();if(!this.options.sfx)void ctx.suspend().catch(()=>{});
    this.publish(this.options.paused?'paused':'muted');return;
   }
   // resume() happens inside the initiating gesture, before fetching or decoding any files.
   if(ctx.state!=='running')await ctx.resume();if(!current())return;
   if(ctx.state!=='running'){this.publish('blocked');return;}
   if(!this.buffers.day||!this.buffers.night)this.publish('loading');
   await this.load();if(!current())return;
   this.transition(this.options.night?'night':'day');this.publish('playing');
  }catch(error){if(current())this.publish(error instanceof DOMException&&error.name==='NotAllowedError'?'blocked':'error');}
 }
 private transition(track:Track){
  const ctx=this.context!,buffer=this.buffers[track]!;
  if(this.phase===track&&this.voices.has(track))return;
  const fading=this.voices.size>0;
  let voice=this.voices.get(track);
  if(voice){clearTimeout(voice.timer);voice.timer=undefined;}
  else{
   const source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=buffer;source.loop=true;source.loopStart=0;source.loopEnd=buffer.duration;
   gain.gain.value=0;source.connect(gain);gain.connect(this.master!);const offset=this.offsets[track]%buffer.duration;
   voice={source,gain,offset,started:ctx.currentTime};this.voices.set(track,voice);source.start(0,offset);
  }
  this.ramp(voice.gain.gain,1,fading?4:.8);
  for(const [other,old]of this.voices)if(other!==track){clearTimeout(old.timer);this.ramp(old.gain.gain,0,4);old.timer=setTimeout(()=>this.stopVoice(other),4050);}
  this.phase=track;
 }
 private stopVoice(track:Track){const voice=this.voices.get(track);if(!voice)return;clearTimeout(voice.timer);this.offsets[track]=(voice.offset+this.context!.currentTime-voice.started)%this.buffers[track]!.duration;voice.source.stop();voice.source.disconnect();voice.gain.disconnect();this.voices.delete(track);}
 private stopMusic(){for(const track of this.voices.keys())this.stopVoice(track);this.phase=null;}
 private stopEffects(){for(const node of this.effects){node.stop();node.disconnect();}this.effects.clear();}
 chime(){
  if(this.disposed||!this.options.sfx||!this.options.visible||!this.active)return;
  try{const ctx=this.graph();const play=()=>{
   if(this.disposed||!this.options.sfx||!this.options.visible||ctx.state!=='running')return;
   const gain=ctx.createGain();gain.connect(ctx.destination);gain.gain.setValueAtTime(.06,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,ctx.currentTime+.7);let remaining=3;
   [523.25,659.25,783.99].forEach((hz,i)=>{const osc=ctx.createOscillator();osc.frequency.value=hz;osc.connect(gain);this.effects.add(osc);osc.onended=()=>{this.effects.delete(osc);osc.disconnect();if(--remaining===0)gain.disconnect();};osc.start(ctx.currentTime+i*.09);osc.stop(ctx.currentTime+.8);});
  };if(ctx.state==='running')play();else void ctx.resume().then(play).catch(()=>{});}catch{/* Audio never blocks an action. */}
 }
 dispose(){this.disposed=true;this.request++;this.abort.abort();this.stopMusic();this.stopEffects();this.master?.disconnect();void this.context?.close().catch(()=>{});this.buffers={};}
}
