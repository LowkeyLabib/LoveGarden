// Display coordinates only. Persisted plot, hiding-place and decoration slot IDs stay unchanged.
export const iso=(u:number,v:number)=>({x:320+(u-v)*16,y:64+(u+v)*8});
export const spots=Array.from({length:15},(_,id)=>({id,...iso(7+(id%5)*2,6+Math.floor(id/5)*2)}));
export const hidingPlaces=[
 {...iso(2,6),name:'By the willow'}, {...iso(16,15),name:'Behind the hydrangeas'},
 {...iso(5.8,11.7),name:'Beside the pond'}, {...iso(18,4),name:'Under the wishing tree'},
 {...iso(7,16),name:'Near the garden gate'},
];
export const decorSlots=[[7,14],[10,14],[13,14],[16,13],[3,6],[11,2],[18,7],[18,11],[9,16],[14,16]].map(([u,v])=>iso(u,v));
export type Scenery={name:string;x:number;y:number};
const objects:[string,number,number][]=[
 ['oak',1,1],['pine',3,1],['oak',1,4],['pine',.4,7],['cherry',18,1],['bush',19,4],
 ['wildflowers',19,15],['bush',17,17],['oak',1,15],['pine',3,17],
 ['cottage',15,2],['sign',8,2],['bench',7,2],['lantern',5,4],['lantern',17,12],['lantern',5,15],
 ['bush',3,3],['bush',16,16],['bush',18,15],['bush',2,16],['bush',19,9],['bush',13,1],
 ['reeds',1,10],['reeds',4,13],['reeds',1,12],['rock',4,8],['rock',1,13],['rock',19,12],
 ['wildflowers',4,4],['wildflowers',4,15],['wildflowers',15,16],['wildflowers',18,5],['wildflowers',9,1],
 ['wildflowers',2,7],['wildflowers',18,14],['wildflowers',11,16],['wildflowers',1,5],
 ['birdhouse',2,3],['butterfly-small',5,8],['butterfly-small',15,12],
];
for(let u=5;u<18;u+=2)objects.push(['fence-x',u,.5]);
for(let v=5;v<15;v+=2)objects.push(['fence-y',19.5,v]);
for(let u=5;u<16;u+=2)if(u!==7)objects.push(['fence-x',u,17.5]);
export const scenery:Scenery[]=objects.map(([name,u,v])=>({name,...iso(u,v)}));


