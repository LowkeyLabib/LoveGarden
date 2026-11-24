import {CharacterDirector,type CharacterPose} from './characters';
import type {GardenState} from '../lib/types';

export const characterStepMs=80;
export class CharacterTimeline {
 private director=new CharacterDirector();
 cat(now:number,reduced:boolean){return this.director.cat.frame(now,reduced);}
 private tick:number|null=null;
 previous:CharacterPose[]=[];
 current:CharacterPose[]=[];
 progress=1;

 pause(){this.tick=null;this.director.pause();}
 sample(state:GardenState,now:number,reduced:boolean,refresh=false){
  const target=Math.floor(now/characterStepMs)*characterStepMs;
  if(this.tick===null||Math.abs(target-this.tick)>1000||target<this.tick||reduced){
   this.director.pause();
   this.tick=target;
   this.current=this.director.update(state,target,0,reduced);
   this.previous=this.current;
  }else if(target>this.tick){
   while(this.tick<target){
    this.tick+=characterStepMs;
    this.previous=this.current;
    this.current=this.director.update(state,this.tick,characterStepMs/1000);
   }
  }else if(refresh)this.current=this.director.update(state,target,0);
  this.progress=Math.max(0,Math.min(1,(now-target)/characterStepMs));
  return this.current;
 }
}
