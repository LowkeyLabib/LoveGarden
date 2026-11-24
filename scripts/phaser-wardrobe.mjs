// Compact, independently loadable wardrobe sheets for the Phaser renderer.
// Each row is one pose and each row contains all four directions and walk frames.
import sharp from 'sharp';
import {mkdir,readFile} from 'node:fs/promises';
const fashion=JSON.parse(await readFile('src/garden/fashion.json','utf8'));
const paths=['public/art/fashion.png','public/art/fashion-gestures.png'];
const [regular,gestures]=await Promise.all(paths.map(path=>sharp(path).ensureAlpha().raw().toBuffer()));
const w=48,h=56,columns=16,normalRows=7;
await mkdir('public/art/wardrobe',{recursive:true});
for(const [style,ref] of fashion.styles.entries()){
 const person=ref.split('/')[1];
 const rows=normalRows+fashion.gesturePoses[person].length;
 const width=w*columns,height=h*rows;
 const destination=Buffer.alloc(width*height*4);
 for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){
  const special=row>=normalRows;
  const index=special?fashion.gestureStarts[ref]+(row-normalRows)*columns+col:(style*normalRows+row)*columns+col;
  const source=special?gestures:regular;
  const x=(index%fashion.columns)*w,y=Math.floor(index/fashion.columns)*h;
  for(let dy=0;dy<h;dy++){
   const start=((y+dy)*fashion.width+x)*4;
   source.copy(destination,((row*h+dy)*width+col*w)*4,start,start+w*4);
  }
 }
 await sharp(destination,{raw:{width,height,channels:4}}).png().toFile('public/art/wardrobe/'+ref.split('/').slice(1).join('-')+'.png');
}
