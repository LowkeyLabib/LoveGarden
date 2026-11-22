// Display coordinates only. Persisted plot, hiding-place and decoration slot IDs stay unchanged.
export const iso=(u:number,v:number)=>({x:320+(u-v)*16,y:64+(u+v)*8});
export const grid={minU:-10,maxU:30,minV:-9,maxV:27};
export const gardenBounds={x:-304,y:-152,width:1280,height:728};
export const groundPoint=(x:number,y:number)=>({u:((x-320)/16+(y-64)/8)/2,v:((y-64)/8-(x-320)/16)/2});
const originalBeds=Array.from({length:15},(_,id)=>({u:7+(id%5)*2,v:6+Math.floor(id/5)*2}));
const newBeds=[{u:5,v:-6},{u:23,v:5},{u:6,v:21},{u:-7,v:1}].flatMap(({u,v})=>
 Array.from({length:6},(_,i)=>({u:u+(i%3)*2,v:v+Math.floor(i/3)*2})));
export const spots=[...originalBeds,...newBeds].map(({u,v},id)=>({id,u,v,...iso(u,v)}));
export const hidingPlaces=[
 {...iso(2,6),name:'By the willow'}, {...iso(16,15),name:'Behind the hydrangeas'},
 {...iso(5.8,11.7),name:'Beside the pond'}, {...iso(18,4),name:'Under the wishing tree'},
 {...iso(7,16),name:'Near the garden gate'},
 {...iso(-7,-1),name:'Along the fern trail'}, {...iso(24,1),name:'By the orchard path'},
 {...iso(20,19),name:'In the sunset meadow'}, {...iso(-3,19),name:'Near the lower pond bank'},
 {...iso(12,-3),name:'Beyond the north beds'},
];
const originalBays=[[7,14],[10,14],[13,14],[16,13],[3,6],[11,2],[18,7],[18,11],[9,16],[14,16]];
const newBays=[
 [-7,-6,3],[-2,-6,2],[14,-6,3],[20,-6,3],[26,-6,3],[26,-1,2],
 [24,12,3],[26,17,2],[26,23,3],[19,23,3],[14,24,2],[1,23,3],
 [-5,23,3],[-6,18,2],[-7,14,1],[-8,7,1],[-3,-2,1],[18,-2,1],
];
export const decorSlots=[...originalBays,...newBays].map(([u,v,capacity=0])=>({u,v,capacity,...iso(u,v)}));
export const pondRadius=(u:number,v:number)=>{
 const original=Math.hypot((u-3.1)/2.25,(v-11.2)/2.9);
 const west=Math.hypot((u+1.7)/5.8,(v-11.15)/3.35);
 const a=Math.atan2((v-11.15)/3.35,(u+1.7)/5.8);
 return Math.min(original,west)/(1+.035*Math.sin(a*5)+.02*Math.cos(a*7));
};
export type Scenery={name:string;x:number;y:number};
const objects:[string,number,number][]=[
 ['oak',1,1],['pine',3,1],['willow',1,4],['pine',.4,7],['cherry',18,1],['bush',19,4],
 ['wildflowers',19,15],['bush',17,17],['oak',1,15],['pine',3,17],
 ['cottage',15,2],['sign',8,2],['bench',8,14.5],['lantern',5,4],['lantern',17,12],['lantern',5,15],
 ['bush',3,3],['hydrangea',16,16],['hydrangea',18,15],['bush',2,16],['bush',19,9],['hydrangea',13,1],
 ['reeds',1,10],['reeds',4,13],['reeds',1,12],['rock',4,8],['koi',3,10.5],['rock',1,13],['rock',19,12],
 ['wildflowers',4,4],['wildflowers',4,15],['wildflowers',15,16],['wildflowers',18,5],['wildflowers',9,1],
 ['wildflowers',2,7],['wildflowers',18,14],['wildflowers',11,16],['wildflowers',1,5],
 ['birdhouse',2,3],['butterfly-small',5,8],['butterfly-small',15,12],
];
for(let u=5;u<18;u+=2)objects.push(['fence-x',u,.5]);
for(let v=5;v<15;v+=2)objects.push(['fence-y',19.5,v]);
for(let u=5;u<16;u+=2)if(u!==7)objects.push(['fence-x',u,17.5]);
objects.push(
 ['willow',-8,11],['reeds',-6.9,11.5],['reeds',-5.4,8.8],['reeds',-4.4,14.4],['rock',-3,14.7],['koi',-3.8,11],
 ['oak',-8,-8],['pine',-4,-8],['cherry',2,-7],['pine',11,-8],['oak',18,-8],['cherry',23,-8],['pine',28,-7],
 ['pine',-9,-3],['wildflowers',-8,-3.8],['hydrangea',-6.3,-1.8],['oak',-9,5],['rock',-4.5,5.7],['wildflowers',-8.5,4.5],
 ['cherry',-8.5,16],['pine',-8,22],['oak',-7,25],['hydrangea',-3,24.8],['willow',-1,26],['bench',-3,16.2],
 ['oak',4,25],['wildflowers',8,25],['cherry',11,25.5],['pine',17,25.5],['willow',23,25],['oak',28,25],
 ['pine',29,-2],['hydrangea',24,2.5],['cherry',28.7,3],['pine',28.8,9],['wildflowers',28,13],['oak',28.5,16],
 ['cherry',28,20],['bush',21,20],['wildflowers',16,20],['hydrangea',19,19.2],['bush',11.5,-4],
 ['birdhouse',0,-5],['birdhouse',28,10],['lantern',5,-2],['lantern',22,4],['lantern',12,21],
 ['lantern',-2,15],['rock',-7,16],['wildflowers',-4,19.7],['wildflowers',2,20],['bush',25,-3],
);
export const scenery:Scenery[]=objects.map(([name,u,v])=>({name,...iso(u,v)}));


