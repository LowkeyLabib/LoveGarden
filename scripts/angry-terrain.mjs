// Original empty, rain-soaked pixel island. Rebuild with node scripts/angry-terrain.mjs.
import sharp from 'sharp';
import { iso as worldIso, grid, gardenBounds } from '../src/garden/world.ts';
const {x:ox,y:oy,width,height}=gardenBounds;
const iso=(u,v)=>{const {x,y}=worldIso(u,v);return [x-ox,y-oy];};
const point=(u,v)=>iso(u,v).join(',');
const parts=[`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" shape-rendering="crispEdges">`];
const corners=[iso(grid.minU,grid.minV),iso(grid.maxU,grid.minV),iso(grid.maxU,grid.maxV),iso(grid.minU,grid.maxV)];
const lower=([x,y])=>[x,y+20];
for(const [a,b,color] of [[3,2,'#52606a'],[2,1,'#3f505e']]){
 parts.push(`<polygon points="${[corners[a],corners[b],lower(corners[b]),lower(corners[a])].map(p=>p.join(',')).join(' ')}" fill="${color}"/>`);
}
for(let u=grid.minU;u<grid.maxU;u++)for(let v=grid.minV;v<grid.maxV;v++){
 const colors=['#70818a','#71838b','#73858d','#6e8089'];
 parts.push(`<polygon points="${point(u,v)} ${point(u+1,v)} ${point(u+1,v+1)} ${point(u,v+1)}" fill="${colors[(u*7+v*11+400)%4]}"/>`);
 const [x,y]=iso(u+.5,v+.5);
 parts.push(`<path d="M${x-3} ${y}h3m2 2h2" stroke="${(u+v)%3?'#83949a':'#60757e'}" opacity=".45"/>`);
 if((u*13+v*17)%19===0)parts.push(`<path d="M${x-9} ${y}l9-4 11 4-10 5Z" fill="#8a9da6" opacity=".5"/><path d="M${x-4} ${y-1}h7" stroke="#adbfc7" opacity=".6"/>`);
}
for(let i=grid.minU;i<grid.maxU;i++){const [x,y]=iso(i,grid.maxV);parts.push(`<path d="M${x+4} ${y+5}h7v4h-7Z" fill="#79828a" opacity=".35"/>`);}
parts.push('</svg>');
await sharp(Buffer.from(parts.join(''))).png().toFile('public/art/angry-terrain.png');
