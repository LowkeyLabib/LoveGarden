import {Shontu,contacts} from '../../../src/garden/shontu';
import {WalkingMap} from '../../../src/garden/characters';
import {momentRows} from '../../../src/garden/littleMoments';
import names from '../../../src/garden/shontuFrames.json';
import {iso} from '../../../src/garden/world';
const load=(url:string)=>new Promise<HTMLImageElement>((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src=url;});
const cat=await load('/art/shontu.png'),grass=await load('/art/phaser-meadow.png');
const people=['labib','mehezad'] as const;
const sheets=await Promise.all(people.map(async p=>[await load('/art/moments/'+p+'.png'),await load('/art/moments/'+p+'-desi-jamdani-sharee-premium-panjabi.png')]));
function panel(label:string,w:number,h:number){
 const fig=document.createElement('figure'),canvas=document.createElement('canvas'),caption=document.createElement('figcaption');
 canvas.width=w;canvas.height=h;caption.textContent=label;fig.append(canvas,caption);document.querySelector('main')!.append(fig);
 const g=canvas.getContext('2d')!;g.imageSmoothingEnabled=false;return g;
}
const dirs=['se','sw','ne','nw'];
for(const host of people)for(const kind of contacts){
 const c=new Shontu(),map=new WalkingMap([]),pair=people.map((person,i)=>({person,point:{u:5.5,v:6.5+i*2},direction:'se' as const,pose:'idle' as const}));
 const g=panel(host+' · '+kind,300,65);
 if(!c.begin(kind,1000,map,pair,host))throw Error(kind);
 let stage=0;
 for(let t=0;t<115000&&c.reserved;t+=80){
  c.step(1000+t,.08,map,pair,true,false);
  if(!c.humans.has(host)||!c.reserved)continue;
  const f=c.frame(1000+t);
  if(t<[0,3000,5500][stage])continue;
  const cx=50+stage*100;
  g.save();g.beginPath();g.rect(stage*100,0,100,65);g.clip();g.drawImage(grass,570,320,100,65,stage*100,0,100,65);
  for(const [i,a] of pair.entries()){
   const action=c.humans.get(a.person);if(!action)continue;
   const p=iso(a.point.u,a.point.v),x=cx+p.x-f.x,y=52+p.y-f.y;
   for(const im of sheets[i])g.drawImage(im,(dirs.indexOf(a.direction)*4+Math.floor(t/240)%4)*48,momentRows.indexOf(action)*56,48,56,Math.round(x)-24,Math.round(y)-49,48,56);
  }
  g.drawImage(cat,(dirs.indexOf(f.direction)*4+f.frame)*48,names.indexOf(f.art)*56,48,56,Math.round(cx-20-f.lift*.3),Math.round(52-42-f.lift),41,48);
  if(host==='mehezad'){g.fillStyle='#29365666';g.fillRect(stage*100,0,100,65);}
  g.restore();if(++stage===3)break;
 }
 if(stage!==3)throw Error('Missing contact stage '+kind);
}
for(const [i,name] of names.entries()){
 const g=panel(name,16*35,40);
 for(let col=0;col<16;col++)g.drawImage(cat,col*48+2,i*56+14,44,40,col*35,0,35,38);
}
