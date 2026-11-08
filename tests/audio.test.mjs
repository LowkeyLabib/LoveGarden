import test from 'node:test';
import assert from 'node:assert/strict';
import {GardenAudio,parsePreferences} from '../src/audio/GardenAudio.ts';

const options={volume:.25,muted:false,sfx:false,night:false,visible:true,paused:false};
const settle=()=>new Promise(resolve=>setImmediate(resolve));
class Context{
 state='suspended';currentTime=0;destination={};sources=[];gains=[];
 resume(){this.state='running';return Promise.resolve();}
 suspend(){this.state='suspended';return Promise.resolve();}
 close(){this.state='closed';return Promise.resolve();}
 decodeAudioData(){return Promise.resolve({duration:48});}
 createGain(){const node={gain:{value:0,ramps:[],cancelAndHoldAtTime(){},linearRampToValueAtTime(value,time){this.ramps.push({value,time});}},connect(){},disconnect(){}};this.gains.push(node);return node;}
 createBufferSource(){const node={stopped:false,connect(){},disconnect(){},start(time,offset){this.offset=offset;},stop(){this.stopped=true;}};this.sources.push(node);return node;}
}
const response=()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)});

test('audio preferences survive malformed storage and clamp volume',()=>{
 assert.deepEqual(parsePreferences('broken'),{volume:.25,muted:false,sfx:false});
 assert.deepEqual(parsePreferences('{"volume":4,"muted":true,"sfx":true}'),{volume:1,muted:true,sfx:true});
 assert.equal(parsePreferences('{"volume":-1}').volume,0);
});

test('one graph shares loading, crossfades for four seconds and reuses reversing tracks',async t=>{
 let fetches=0,graphs=0;const ctx=new Context();
 t.mock.method(globalThis,'fetch',async()=>{fetches++;return response();});
 const audio=new GardenAudio(options,()=>{},()=>{graphs++;return ctx;});t.after(()=>audio.dispose());
 audio.unlock();audio.unlock();await settle();
 assert.equal(graphs,1);assert.equal(fetches,2);assert.equal(ctx.sources.length,1);
 assert.equal(ctx.sources[0].loop,true);assert.equal(ctx.gains[0].gain.value,.25);
 audio.setOptions({...options,night:true});await settle();
 assert.equal(ctx.sources.length,2);
 assert.deepEqual(ctx.gains[1].gain.ramps.at(-1),{value:0,time:4});
 assert.deepEqual(ctx.gains[2].gain.ramps.at(-1),{value:1,time:4});
 audio.setOptions(options);await settle();
 assert.equal(ctx.sources.length,2);assert.deepEqual(ctx.gains[1].gain.ramps.at(-1),{value:1,time:4});
 audio.dispose();assert.equal(ctx.state,'closed');assert.ok(ctx.sources.every(s=>s.stopped));
});

test('hidden, muted and embedded-song states stop playback and resume saved position',async t=>{
 const ctx=new Context();const statuses=[];t.mock.method(globalThis,'fetch',async()=>response());
 const audio=new GardenAudio(options,status=>statuses.push(status),()=>ctx);t.after(()=>audio.dispose());
 audio.unlock();await settle();ctx.currentTime=12;
 audio.setOptions({...options,visible:false});await settle();
 assert.equal(ctx.state,'suspended');assert.equal(statuses.at(-1),'paused');assert.ok(ctx.sources[0].stopped);
 audio.setOptions(options);await settle();assert.equal(ctx.sources.at(-1).offset,12);
 audio.setOptions({...options,muted:true});await settle();assert.equal(statuses.at(-1),'muted');assert.ok(ctx.sources.every(s=>s.stopped));
 audio.setOptions({...options,paused:true});await settle();assert.equal(statuses.at(-1),'paused');
});

test('disposing during a pending download cannot start late audio',async t=>{
 const ctx=new Context();const pending=[];const signals=[];
 t.mock.method(globalThis,'fetch',(url,init)=>{signals.push(init.signal);return new Promise(resolve=>pending.push(resolve));});
 const audio=new GardenAudio(options,()=>{},()=>ctx);audio.unlock();await settle();
 assert.equal(pending.length,2);audio.dispose();pending.forEach(resolve=>resolve(response()));await settle();
 assert.equal(ctx.sources.length,0);assert.equal(ctx.state,'closed');assert.ok(signals.every(signal=>signal.aborted));
});
