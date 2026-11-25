import Phaser from 'phaser';
import {contactCell,momentCell,momentEffects,momentTexture} from '../garden/momentArt';
import catFrames from '../garden/shontuFrames.json';
import atlas from '../garden/characters.json';
import fashion from '../garden/fashion.json';
import {CharacterTimeline} from '../garden/characterTimeline';
import {gestureFrame,wardrobeLayers,poses,directions} from '../garden/characterFrames';
import type {CharacterPose,Person} from '../garden/characters';
import type {GardenState} from '../lib/types';

const people:Person[]=['labib','mehezad'];
const styles=new Set(fashion.styles);
const clothingPath=(ref:string)=>'/art/wardrobe/'+ref.split('/').slice(1).join('-')+'.png';
const poseRow=(person:Person,pose:string)=>{
 const ordinary=poses.indexOf(pose);
 return ordinary>=0?ordinary:poses.length+fashion.gesturePoses[person].indexOf(pose);
};
function actor(scene:Phaser.Scene,person:Person){
 const body=scene.add.image(0,0,'couple',person+'-idle-se-0').setOrigin(.5,49/56);
 const layers=Array.from({length:3},()=>scene.add.image(0,0,'__DEFAULT').setOrigin(.5,49/56).setVisible(false));
 const effects=scene.add.graphics();
 return {group:scene.add.container(0,0,[body,...layers,effects]),body,layers,effects};
}

function drawExpression(g:Phaser.GameObjects.Graphics,p:CharacterPose,clock:number,reduced:boolean){
 g.clear();
 if(p.moment)momentEffects(p.moment,p.person,(x,y,w,h,color,alpha)=>g.fillStyle(color,alpha).fillRect(x,y,w,h));
 const side=p.direction.endsWith('w')?-1:1,t=p.gestureTime??0;
 if(p.gesture==='hurry'&&p.direction.startsWith('s')){
  const y=-29+p.frame%2;
  g.fillStyle(0x51333d).fillRect(-5,y,2,1).fillRect(-3,y+1,1,1).fillRect(1,y+1,2,1).fillRect(3,y,1,1);
 }
 if(p.gesture==='surprised'&&t<720){
  g.fillStyle(0xb16a57).fillRect(-2,-50,4,8).fillStyle(0xfff1bb).fillRect(-1,-49,2,6).fillRect(-1,-41,2,2);
 }else if(p.gesture==='bonk'&&t>=745&&t<940){
  const x=side*18;
  g.fillStyle(0xffe29e).fillRect(x,-44,2,10).fillRect(x-4,-40,10,2);
 }else if(p.gesture==='embarrassed'&&t<700){
  const x=side*10,y=-46+Math.floor(t/110);
  g.fillStyle(0xa0d6da).fillRect(x,y,1,2).fillRect(x-1,y+2,3,3);
 }else if(p.gesture==='throw'&&t>=2250&&t<2740){
  const arc=(t-2250)/490,x=Math.round(side*(18+28*arc)),y=Math.round(-34-18*arc+32*arc*arc);
  const alpha=Math.min(1,(1-arc)/.22);
  g.fillStyle(0xf0dfc4,alpha).fillRect(x-2,y,4,1).fillStyle(0xd38663,alpha).fillRect(x+2,y,1,1);
 }
 if(p.hearts||p.idleHeart){
  const phase=reduced?0:((clock+(p.person==='labib'?700:1800))%1600)/1600;
  for(let i=0;i<(p.hearts?2:1);i++){
   const y=-44-i*4-Math.floor(phase*5),x=-3+i*9;
   g.fillStyle(i?0xf2bdcb:0xe58cac,1-phase*.65).fillRect(x,y,2,1).fillRect(x+3,y,2,1)
    .fillRect(x,y+1,5,2).fillRect(x+1,y+3,3,1).fillRect(x+2,y+4,1,1);
  }
 }
}

// Positions and poses come exclusively from the existing director. The scene
// interpolates between its 80 ms samples and owns no independent animation loop.
export class PhaserCouple {
 private actors:Record<Person,ReturnType<typeof actor>>;
 private supportingHands:Phaser.GameObjects.Graphics;
 private cat:Phaser.GameObjects.Image;
 private timeline=new CharacterTimeline();
 private outfits:Record<Person,string[]>={labib:[],mehezad:[]};
 private loading=new Set<string>();
 private fashion?:GardenState['fashion'];
 private state?:GardenState;
 private serverNow=0;
 private localNow=0;
 private refresh=true;
 private reduced=false;
 constructor(private scene:Phaser.Scene){
  this.supportingHands=scene.add.graphics();
  this.cat=scene.add.image(0,0,'shontu',0).setOrigin(.5,49/56).setScale(.85);
  const tex=scene.textures.get('couple');
  for(const [name,f] of Object.entries(atlas.frames))tex.add(name,0,f.x,f.y,f.w,f.h);
  this.actors={labib:actor(scene,'labib'),mehezad:actor(scene,'mehezad')};
  scene.game.events.on(Phaser.Core.Events.PAUSE,this.pause,this);
  scene.load.on(Phaser.Loader.Events.FILE_COMPLETE,this.loaded,this);
  scene.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR,this.failed,this);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>{
   scene.game.events.off(Phaser.Core.Events.PAUSE,this.pause,this);
   scene.load.off(Phaser.Loader.Events.FILE_COMPLETE,this.loaded,this);
   scene.load.off(Phaser.Loader.Events.FILE_LOAD_ERROR,this.failed,this);
  });
 }
 get wildlife(){return this.timeline.cat(this.serverNow+performance.now()-this.localNow,this.reduced);}
 private pause(){this.timeline.pause();this.refresh=true;}
 private loaded(key:string){if(this.loading.delete(key))this.refresh=true;}
 private failed(file:Phaser.Loader.File){this.loading.delete(file.key);}
 sync(state:GardenState,now:number){
  this.state=state;
  this.serverNow=now;this.localNow=performance.now();this.refresh=true;
  if(this.fashion===state.fashion)return;
  this.fashion=state.fashion;this.outfits=wardrobeLayers(state.fashion);
  for(const ref of [...this.outfits.labib,...this.outfits.mehezad]){
   if(!styles.has(ref))continue;
   for(const [key,path] of [[ref,clothingPath(ref)],['moment/'+ref,momentTexture(ref)]]){
    if(this.scene.textures.exists(key)||this.loading.has(key))continue;
    this.loading.add(key);
    this.scene.load.spritesheet(key,path,{frameWidth:48,frameHeight:56});
   }
  }
  if(this.loading.size&&!this.scene.load.isLoading())this.scene.load.start();
 }
 update(reduced:boolean){
  if(!this.state||reduced&&this.reduced&&!this.refresh&&!this.loading.size)return;
  this.reduced=reduced;
  const now=this.serverNow+performance.now()-this.localNow;
  const current=this.timeline.sample(this.state,now,reduced,this.refresh);
  this.refresh=false;
  const cat=this.timeline.cat(now,reduced);
  this.supportingHands.clear().setDepth(cat.depth+.1);
  this.cat.setVisible(true).setPosition(Math.round(cat.x-cat.lift*.3),Math.round(cat.y-cat.lift)).setDepth(cat.depth)
   .setFrame(catFrames.indexOf(cat.art)*16+directions.indexOf(cat.direction)*4+cat.frame);
  for(const person of people){
   const a=this.actors[person],p=current.find(p=>p.person===person);
   a.group.setVisible(!!p);
   if(!p)continue;
   const previous=this.timeline.previous.find(p=>p.person===person)??p;
   const progress=this.timeline.progress;
   const x=Math.round(previous.x+(p.x-previous.x)*progress);
   const y=Math.round(previous.y+(p.y-previous.y)*progress);
   const depth=previous.depth+(p.depth-previous.depth)*progress;
   a.group.setPosition(x,y).setDepth(depth+x*.000001);
   const frame=gestureFrame(p);
   const cell=p.catPose?contactCell(p):p.moment?momentCell(p.moment,person,p.direction):null;
   const bodyKey=cell?'moment/'+person:'couple';
   const bodyFrame=cell?.index??(person+'-'+frame.pose+'-'+frame.direction+'-'+frame.frame);
   if(a.body.texture.key!==bodyKey)a.body.setTexture(bodyKey,bodyFrame);
   else if(a.body.frame.name!==String(bodyFrame))a.body.setFrame(bodyFrame);
   const index=(poseRow(person,frame.pose)*4+directions.indexOf(frame.direction))*4+frame.frame;
   a.layers.forEach((layer,i)=>{
    const item=this.outfits[person][i],ref=item&&cell?'moment/'+item:item;
    if(ref&&this.scene.textures.exists(ref))layer.setTexture(ref,cell?.index??index).setVisible(true);
    else layer.setVisible(false);
   });
   drawExpression(a.effects,p,now,reduced);
   if(this.state.angryMode&&person==='mehezad'&&p.pose==='sit'){
    const g=a.effects;
    g.fillStyle(0xa99583).fillRect(9,-33,1,20);
    g.fillStyle(0x564863).fillRect(-5,-33,29,3).fillRect(-2,-36,23,4).fillRect(2,-39,15,4);
    g.fillStyle(0x9c83aa).fillRect(5,-40,8,2).fillRect(1,-36,7,3);
   }
   if(p.pose==='smoke'){
    const rise=reduced?3:Math.floor(now/300)%8;
    a.effects.fillStyle(0xdad6de,.55-rise*.04).fillRect(p.direction.endsWith('w')?-9:8,-15-rise,2,2);
   }
   if(p.catPose&&cat.lift>1){
    this.supportingHands.fillStyle(person==='labib'?0xf5d2b1:0xf8d6c3).fillRect(x+5,y-12,4,2).fillRect(x+13,y-13,3,2);
   }
  }
 }
}
