import Phaser from 'phaser';
import type {GardenState} from '../lib/types';
import {gardenBounds} from '../garden/world';

type Snapshot=()=>{state:GardenState;now:number};
export class GardenScene extends Phaser.Scene {
 constructor(private snapshot:Snapshot){super('garden');}
 preload(){this.load.image('ground','/art/terrain.png');}
 create(){
  const b=gardenBounds;
  this.add.image(b.x,b.y,'ground').setOrigin(0);
  const fit=()=>this.cameras.main.setZoom(Math.min(this.scale.width/b.width,this.scale.height/b.height)).centerOn(b.x+b.width/2,b.y+b.height/2);
  fit();this.scale.on('resize',fit);
  this.events.once('shutdown',()=>this.scale.off('resize',fit));
  const {state,now}=this.snapshot();this.sync(state,now);
 }
 sync(_state:GardenState,_now:number){}
}
export function mountGarden(host:HTMLDivElement,snapshot:Snapshot){
 const scene=new GardenScene(snapshot);
 const game=new Phaser.Game({type:Phaser.AUTO,parent:host,transparent:true,pixelArt:true,roundPixels:true,
  scale:{mode:Phaser.Scale.RESIZE,width:host.clientWidth,height:host.clientHeight},
  input:{keyboard:false,mouse:false,touch:false,gamepad:false},audio:{noAudio:true},
  fps:{target:30},banner:false,scene});
 return {scene,destroy:()=>{game.loop.wake();game.destroy(true);}};
}
