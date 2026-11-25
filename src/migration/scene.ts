import Phaser from 'phaser';
import atlas from '../garden/atlas.json';
import type {WorldView} from './PhaserGarden';
import {previewLight} from './preview';
import {gardenBounds,iso,scenery,spots} from '../garden/world';
import {clockState} from '../lib/clock.mjs';
import type {GardenState} from '../lib/types';
import {worldObjects} from './worldObjects';
import {PhaserCouple} from './PhaserCouple';

type Snapshot=()=>{state:GardenState;now:number};
type Image=Phaser.GameObjects.Image;
type FrameName=keyof typeof atlas.frames;
type Drift={image:Image;x:number;y:number;kind:'petal'|'ripple'|'koi'|'firefly'|'foliage'};

const trees=['oak','cherry','pine','willow'];

export class GardenScene extends Phaser.Scene {
 private placed=new Map<string,Image>();
 private lighting=new Map<Image,Image>();
 private ambient:Drift[]=[];
 private night=0;
 private butterflies:{image:Image;x:number;y:number}[]=[];
 private couple?:PhaserCouple;
 private veil?:Phaser.GameObjects.Rectangle;
 private rainbow?:Image;
 private weather?:Phaser.GameObjects.Graphics;
 private rainOpacity=0;
 private nextFlash=0;
 private storm=false;
 private motion=window.matchMedia('(prefers-reduced-motion: reduce)');
 constructor(private snapshot:Snapshot,private view:()=>WorldView|undefined,private fallback:()=>void){super('garden');}
 preload(){
  this.load.once(Phaser.Loader.Events.FILE_LOAD_ERROR,this.fallback);
  this.load.image('ground','/art/phaser-meadow.png');
  this.load.image('trees','/art/phaser-canopies.png');
  this.load.image('objects','/art/phaser-objects.png');
  for(const person of ['labib','mehezad'])this.load.spritesheet('moment/'+person,'/art/moments/'+person+'.png',{frameWidth:48,frameHeight:56});
  this.load.spritesheet('shontu','/art/shontu.png',{frameWidth:48,frameHeight:56});
  this.load.image('couple','/art/characters.png');
  this.load.image('rainbow','/art/rainbow.png');
 }
 private sprite(name:FrameName,x:number,y:number,depth:number){
  const f=atlas.frames[name];
  const image=this.add.image(x,y,trees.includes(name)?'trees':'objects',name).setOrigin(f.anchorX/f.w,f.anchorY/f.h).setDepth(depth+x*.000001);
  return image;
 }
 private lantern(image:Image,name:string){
  const offset:Record<string,[number,number,number]>={lantern:[11,-31,60],cottage:[14,-20,40],'fairy-cottage':[10,-23,46],'glowing-mushrooms':[0,-6,34],'romantic-gazebo':[0,-30,44],'moonlit-bridge':[12,-16,34]};
  const p=offset[name];
  if(p)this.lighting.set(image,this.add.image(image.x+p[0],image.y+p[1],'halo').setDisplaySize(p[2],p[2]).setDepth(3000));
 }
 create(){
  const texture=this.textures.get('objects');
  for(const [name,f] of Object.entries(atlas.frames))texture.add(name,0,f.x,f.y,f.w,f.h);
  trees.forEach((name,i)=>this.textures.get('trees').add(name,0,i*72,0,72,96));
  const halo=this.textures.createCanvas('halo',64,64)!;
  const gradient=halo.context.createRadialGradient(32,32,0,32,32,32);
  gradient.addColorStop(0,'rgba(255,235,165,.95)');gradient.addColorStop(.16,'rgba(255,200,102,.64)');
  gradient.addColorStop(.48,'rgba(255,180,97,.25)');gradient.addColorStop(1,'rgba(255,179,85,0)');
  halo.context.fillStyle=gradient;halo.context.fillRect(0,0,64,64);halo.refresh();
  for(const [key,data,palette] of [
   ['petal',['.1.','122','.2.'],{1:'#f5c8cb',2:'#dc91a8'}],
   ['ripple',['..111....','11....112','....22...'],{1:'#bfe6d8',2:'#77c2bf'}],
   ['firefly',['.1.','121','.1.'],{1:'#d4bd75',2:'#fff5aa'}]
  ] as const)this.textures.generate(key,{data:[...data],palette:{...Phaser.Create.Palettes.ARNE16,...palette},pixelWidth:1});
  this.rainbow=this.add.image(0,0,'rainbow').setOrigin(0).setDisplaySize(720,450).setDepth(-3000);
  this.add.image(gardenBounds.x,gardenBounds.y,'ground').setOrigin(0).setDepth(-2000);
  for(const p of spots)this.sprite('plot',p.x,p.y,-1000);
  for(const p of scenery){
   const image=this.sprite(p.name as FrameName,p.x,p.y,p.y);
   this.lantern(image,p.name);
   if(p.name==='willow'||p.name==='bush')this.ambient.push({image,x:p.x,y:p.y,kind:'foliage'});
   if(p.name==='butterfly-small')this.butterflies.push({image,x:p.x,y:p.y});
   if(p.name==='koi')this.ambient.push({image,x:p.x,y:p.y,kind:'koi'});
   if(p.name==='cherry')this.drift('petal',p.x+7,p.y-38,p.y+.01);
   if(p.name==='lantern')this.drift('firefly',p.x+16,p.y-18,3100);
  }
  for(const [u,v] of [[-4,11],[-2.8,10.5],[-1,11.8],[2.3,10],[3.2,11.5],[4.4,11.5]]){
   const p=iso(u,v);this.drift('ripple',p.x,p.y,-1200);
  }
  const b=gardenBounds;
  this.veil=this.add.rectangle(b.x+b.width/2,b.y+b.height/2,b.width+4000,b.height+2000,0x27355f).setDepth(2000);
  this.couple=new PhaserCouple(this);
  this.weather=this.add.graphics().setDepth(3000);
  const initial=this.view();
  if(initial)this.setView(initial);
  const {state,now}=this.snapshot();
  this.sync(state,now);
 }
 private drift(kind:'petal'|'firefly'|'ripple',x:number,y:number,depth:number){
  this.ambient.push({kind,x,y,image:this.add.image(x,y,kind).setDepth(depth)});
 }
 sync(state:GardenState,now:number){
  if(!this.veil)return;
  this.couple?.sync(state,now);
  this.storm=state.angryMode;
  this.night=previewLight==='night'?1:previewLight==='day'||state.rainbowMode?0:clockState(now,state.epoch).night;
  this.veil.setFillStyle(Phaser.Display.Color.GetColor(Math.round(255-208*this.night),Math.round(209-152*this.night),Math.round(145-40*this.night))).setAlpha(.045+this.night*.46);
  this.rainbow?.setVisible(state.rainbowMode);
  const keep=new Set<string>();
  for(const p of worldObjects(state,now)){
   if(!Object.hasOwn(atlas.frames,p.name))continue;
   keep.add(p.key);
   let image=this.placed.get(p.key);
   if(image&&(image.frame.name!==p.name||image.x!==p.x||image.y!==p.y)){
    this.removePlaced(p.key,image);image=undefined;
   }
   if(!image){
    image=this.sprite(p.name as FrameName,p.x,p.y,p.depth);
    this.placed.set(p.key,image);
    this.lantern(image,p.name);
   }
  }
  for(const [key,image] of this.placed)if(!keep.has(key))this.removePlaced(key,image);
  for(const glow of this.lighting.values())glow.setAlpha(this.night*.9);
 }
 private removePlaced(key:string,image:Image){
  this.lighting.get(image)?.destroy();this.lighting.delete(image);
  image.destroy();this.placed.delete(key);
 }
 setView(view:WorldView){
  if(!this.cameras?.main)return;
  const w=Math.round(view.width),h=Math.round(view.height);
  if(this.scale.width!==w||this.scale.height!==h)this.scale.resize(w,h);
  this.cameras.main.setZoom(view.zoom).centerOn(view.x,view.y);
 }
 update(time:number){
  this.couple?.update(this.motion.matches);
  const g=this.weather;
  if(g&&(this.storm||this.rainOpacity>0)){
   const dt=Math.min(100,this.game.loop.delta);
   this.rainOpacity=Phaser.Math.Clamp(this.rainOpacity+(this.storm?1:-1)*dt/900,0,1);
   const cam=this.cameras.main, origin=cam.getWorldPoint(0,0), w=cam.width,h=cam.height;
   g.clear().setPosition(origin.x,origin.y).setScale(1/cam.zoom).setAlpha(this.rainOpacity);
   g.fillStyle(0x516782,.18).fillRect(0,0,w,h);
   const t=this.motion.matches?0:time;
   g.lineStyle(1,0xcbe0ed,.53);
   g.beginPath();
   for(let i=0;i<128;i++){
    const x=((i*179.71-t*.13)%w+w)%w,y=(i*73.17+t*.48)%h;
    g.moveTo(x,y);g.lineTo(x-5,y+17);
   }
   g.strokePath();
   if(!this.storm)this.nextFlash=0;
   else if(!this.nextFlash||time>this.nextFlash+350)this.nextFlash=time+20000+Math.random()*25000;
   else if(time>=this.nextFlash&&!this.motion.matches)g.fillStyle(0xe7eefb,.13*(1-(time-this.nextFlash)/350)).fillRect(0,0,w,h);
  }
  const cat=this.couple?.wildlife;
  this.butterflies.forEach((b,i)=>{
   const escape=cat?.prey===i?cat.escape:0;
   b.image.setPosition(b.x+Math.round(escape*27),b.y-Math.round(escape*16));
  });
  const t=this.motion.matches?0:time*.001;
  for(let i=0;i<this.ambient.length;i++){
   const {image,kind,x,y}=this.ambient[i],phase=t+i*2.27;
   if(kind==='petal'){
    const fall=(phase%11)/11;
    image.setPosition(Math.round(x+fall*13+Math.sin(phase)*3),Math.round(y+fall*27)).setAlpha(Math.sin(fall*Math.PI)*.83);
   }else if(kind==='foliage'){
    image.setRotation(t?Math.sin(phase*.53)*.012:0);
   }else if(kind==='koi'){
    image.setPosition(Math.round(x+Math.sin(phase*.34)*5),Math.round(y+Math.cos(phase*.34)*2));
   }else if(kind==='ripple'){
    image.setPosition(Math.round(x+Math.sin(phase*.6)*3),y).setAlpha(.23+.24*(1+Math.cos(phase)));
   }else{
    image.setPosition(Math.round(x+Math.sin(phase*.7)*4),Math.round(y+Math.cos(phase*.9)*3)).setAlpha(this.night*(.55+.4*Math.sin(phase)));
   }
  }
 }
}
export function mountGarden(host:HTMLDivElement,snapshot:Snapshot,view:()=>WorldView|undefined,fallback:()=>void){
 const scene=new GardenScene(snapshot,view,fallback);
 const game=new Phaser.Game({type:Phaser.AUTO,parent:host,transparent:true,pixelArt:true,roundPixels:true,
  scale:{mode:Phaser.Scale.NONE,width:Math.max(1,host.clientWidth),height:Math.max(1,host.clientHeight)},
  input:{keyboard:false,mouse:false,touch:false,gamepad:false},audio:{noAudio:true},
  fps:{target:30},banner:false,scene});
 return {scene,destroy:()=>{game.loop.wake();game.destroy(true);}};
}
