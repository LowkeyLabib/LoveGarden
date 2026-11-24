import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import sharp from 'sharp';

test('Phaser garments match the wardrobe preview in every direction and pose',async()=>{
 const fashion=JSON.parse(await readFile('src/garden/fashion.json','utf8'));
 const originals=await Promise.all(['fashion','fashion-gestures'].map(name=>sharp('public/art/'+name+'.png').ensureAlpha().raw().toBuffer()));
 for(const [style,ref] of fashion.styles.entries()){
  const [,person,name]=ref.split('/');
  const {data,info}=await sharp('public/art/wardrobe/'+person+'-'+name+'.png').ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const rows=7+fashion.gesturePoses[person].length;
  assert.equal(info.width,768);assert.equal(info.height,rows*56);
  for(let i=0;i<rows*16;i++){
   const gesture=i>=112,index=gesture?fashion.gestureStarts[ref]+i-112:style*112+i;
   for(let dy=0;dy<56;dy++){
    const x=((i%16)*48+(Math.floor(i/16)*56+dy)*info.width)*4;
    const y=((index%fashion.columns)*48+(Math.floor(index/fashion.columns)*56+dy)*fashion.width)*4;
    assert.ok(data.subarray(x,x+192).equals(originals[Number(gesture)].subarray(y,y+192)),ref+' frame '+i);
   }
  }
 }
});
