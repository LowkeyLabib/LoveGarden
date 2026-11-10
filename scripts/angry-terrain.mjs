// Original empty, rain-soaked pixel island. Rebuild with node scripts/angry-terrain.mjs.
import sharp from 'sharp';
const iso=(u,v)=>[320+(u-v)*16,64+(u+v)*8];
const point=(u,v)=>iso(u,v).join(',');
const parts=['<svg xmlns="http://www.w3.org/2000/svg" width="720" height="450" shape-rendering="crispEdges">'];
parts.push('<path d="M32 234 352 74 674 234 354 400Z" fill="#263c48" opacity=".18"/>');
parts.push('<path d="M0 224 320 384 320 401 0 241Z" fill="#52606a"/><path d="M320 384 640 224 640 241 320 401Z" fill="#3f505e"/>');
for(let u=0;u<20;u++)for(let v=0;v<20;v++){
 const colors=['#70818a','#71838b','#73858d','#6e8089'];
 parts.push(`<polygon points="${point(u,v)} ${point(u+1,v)} ${point(u+1,v+1)} ${point(u,v+1)}" fill="${colors[(u*7+v*11)%4]}"/>`);
 const [x,y]=iso(u+.5,v+.5);
 parts.push(`<path d="M${x-3} ${y}h3m2 2h2" stroke="${(u+v)%3?'#83949a':'#60757e'}" opacity=".45"/>`);
 if((u*13+v*17)%19===0)parts.push(`<path d="M${x-9} ${y}l9-4 11 4-10 5Z" fill="#8a9da6" opacity=".5"/><path d="M${x-4} ${y-1}h7" stroke="#adbfc7" opacity=".6"/>`);
}
for(let i=0;i<20;i++){const [x,y]=iso(i,20);parts.push(`<path d="M${x+4} ${y+5}h7v4h-7Z" fill="#79828a" opacity=".35"/>`);}
parts.push('</svg>');
await sharp(Buffer.from(parts.join(''))).png().toFile('public/art/angry-terrain.png');
