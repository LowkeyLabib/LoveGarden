// Original pixel rainbow, rendered locally without external assets.
import sharp from 'sharp';
const width=720,height=450,pixels=Buffer.alloc(width*height*4);
const colors=['#ee9eaa','#f4b888','#f8df94','#b9d795','#8fcbd2','#a6b9e5','#c5a7db'].map(c=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16)));
for(let y=0;y<230;y+=2)for(let x=80;x<560;x+=2){
 const distance=Math.hypot(x-320,y-230),band=Math.floor((224-distance)/6);
 if(band<0||band>=colors.length)continue;
 for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++){const i=((y+dy)*width+x+dx)*4;pixels.set([...colors[band],205],i);}
}
await sharp(pixels,{raw:{width,height,channels:4}}).png().toFile('public/art/rainbow.png');
