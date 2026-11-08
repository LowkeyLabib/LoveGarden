/** Original LoveGarden compositions and instruments. No samples or third-party audio.
 * Rebuild: node scripts/music.mjs. PCM WAV keeps sample-accurate loops on mobile browsers.
 */
import {mkdir,writeFile} from 'node:fs/promises';
const rate=24000, TAU=Math.PI*2;
let random=731;const noise=()=>{random=(random*1664525+1013904223)>>>0;return random/4294967296*2-1;};
const frequency=midi=>440*2**((midi-69)/12);
function instrument(kind,midi,duration){
 const count=Math.ceil(duration*rate),out=new Float32Array(count),hz=frequency(midi);
 if(kind==='guitar'){
  // A damped plucked string with a small resonant wooden-body contribution.
  const period=Math.max(3,Math.round(rate/hz-.5)),ring=Float32Array.from({length:period},()=>noise()*.6);let last=0;
  for(let i=0;i<count;i++){const p=i%period,v=ring[p];ring[p]=.497*(v+ring[(p+1)%period]);last=.5*last+.5*v;const t=i/rate;out[i]=(last*.8+Math.sin(TAU*hz*t)*.09*Math.exp(-t*2.2))*Math.min(1,t/.003)*Math.min(1,(duration-t)/.07);}
 }else{
  const partials=kind==='piano'?[[1,1,1.6],[2,.32,2.8],[3,.18,3.8],[4,.075,5],[5,.045,7],[7,.022,9]]:kind==='bell'?[[1,1,1],[2,.13,2],[3,.04,4]]:kind==='pad'?[[1,1,0],[2,.18,0],[3,.055,0]]:[[1,1,2],[2,.1,3]];
  for(const [partial,amp,decay]of partials){const detune=kind==='piano'?Math.sqrt(1+.000025*partial*partial):1;
   for(let i=0;i<count;i++){const t=i/rate;let envelope;
    if(kind==='pad')envelope=Math.sin(Math.PI*t/duration)**2*.16;
    else envelope=(1-Math.exp(-t/(kind==='piano'?.008:.014)))*Math.exp(-t*decay)*Math.min(1,(duration-t)/.12);
    out[i]+=Math.sin(TAU*hz*partial*detune*t)*amp*envelope;
   }
  }
  if(kind==='piano')for(let i=0;i<count;i++){const t=i/rate;out[i]+=.11*Math.sin(TAU*hz*1.0014*t)*Math.exp(-t*1.9)*Math.min(1,t/.012)*Math.min(1,(duration-t)/.1);}
 }
 return out;
}
function compose(night){
 const bpm=night?64:80,beat=60/bpm,length=Math.round(16*4*beat*rate),mix=new Float32Array(length);
 const add=(kind,note,time,duration,volume)=>{const signal=instrument(kind,note,duration),start=Math.round(time*rate);for(let i=0;i<signal.length;i++)mix[(start+i+length)%length]+=signal[i]*volume;};
 const dayChords=[[50,57,61,66],[47,54,57,62],[43,50,54,59],[45,52,59,61],[50,57,61,66],[42,49,54,57],[43,50,54,59],[45,52,57,61],[47,54,57,62],[43,50,54,59],[50,57,61,66],[45,52,59,61],[43,50,54,59],[45,52,57,61],[50,57,61,66],[45,52,59,61]];
 const nightChords=[[47,54,57,62],[43,50,54,59],[50,57,61,66],[45,52,59,61],[47,54,57,62],[42,49,54,57],[43,50,54,59],[45,52,59,61],[50,57,61,66],[43,50,54,59],[47,54,57,62],[45,52,59,61],[43,50,54,59],[45,52,59,61],[47,54,57,62],[45,52,59,61]];
 const dayMelody=[[66,69],[66,64],[62,66],[64,61],[66,73],[69,66],[67,66],[64,61],[66,69],[71,67],[69,66],[64,61],[62,66],[64,69],[66,62],[61,64]];
 const nightMelody=[[66,62],[59,62],[61,66],[64,61],[66,69],[66,61],[62,59],[61,64],[66,73],[71,67],[66,62],[64,61],[62,66],[64,61],[62,66],[64,61]];
 const chords=night?nightChords:dayChords,melody=night?nightMelody:dayMelody;
 for(let bar=0;bar<16;bar++){
  const start=bar*4*beat,chord=chords[bar];add('bass',chord[0]-12,start,beat*3.4,night?.055:.07);
  for(let n=0;n<4;n++){
   add(night?'piano':'guitar',chord[n],start+([0,1.5,2,3.25][n])*beat,night?3.4:2.4,night?.027:.24);
   if(night)add('pad',chord[n]+12,start-.6,beat*5.5,.09);
   else if(n===1||n===3)add('piano',chord[n],start+.035*n,beat*2,.023);
  }
  melody[bar].forEach((note,i)=>add('piano',note,start+(i?2.5:.5)*beat,night?3.8:2.8,(night?.08:.10)*(1+(bar%3)*.05)));
  if(bar%4===2)add('bell',melody[bar][1]+12,start+3.5*beat,night?4:2.5,night?.016:.01);
 }
 // Circular room reflections carry their tails over the loop boundary rather than fading to silence.
 const wet=new Float32Array(length);for(const [delay,gain]of[[.071,.12],[.113,.1],[.173,.08],[.239,.07],[.347,.055],[.463,.04],[.619,.03],[.811,.02]]){const d=Math.round(delay*rate);for(let i=0;i<length;i++)wet[(i+d)%length]+=mix[i]*gain;}
 let peak=0,mean=0;for(let i=0;i<length;i++){mix[i]+=wet[i];mean+=mix[i];}mean/=length;
 for(let i=0;i<length;i++){mix[i]-=mean;peak=Math.max(peak,Math.abs(mix[i]));}
 const level=.68/peak,pcm=Buffer.alloc(44+length*2);pcm.write('RIFF',0);pcm.writeUInt32LE(pcm.length-8,4);pcm.write('WAVEfmt ',8);pcm.writeUInt32LE(16,16);pcm.writeUInt16LE(1,20);pcm.writeUInt16LE(1,22);pcm.writeUInt32LE(rate,24);pcm.writeUInt32LE(rate*2,28);pcm.writeUInt16LE(2,32);pcm.writeUInt16LE(16,34);pcm.write('data',36);pcm.writeUInt32LE(length*2,40);
 let power=0;for(let i=0;i<length;i++){const value=mix[i]*level;power+=value*value;pcm.writeInt16LE(Math.round(Math.max(-1,Math.min(1,value))*32767),44+i*2);}
 console.log(JSON.stringify({track:night?'Moonlit Petals':'Morning Letters',seconds:length/rate,bytes:pcm.length,rms:Math.sqrt(power/length).toFixed(3),seamDelta:Math.abs(mix[0]-mix[length-1]).toFixed(5)}));return pcm;
}
await mkdir('public/audio',{recursive:true});
await writeFile('public/audio/day.wav',compose(false));await writeFile('public/audio/night.wav',compose(true));
await writeFile('public/audio/LICENSE.txt',`LoveGarden original soundtrack\n\nMorning Letters (day) and Moonlit Petals (night) are original compositions created for LoveGarden. Instruments are synthesized from mathematical models; no third-party recordings, samples, melodies, or commercial game music are used.\n\nThese recordings and their source composition in scripts/music.mjs are dedicated to the public domain under CC0 1.0: https://creativecommons.org/publicdomain/zero/1.0/\n`);
