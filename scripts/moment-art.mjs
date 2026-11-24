// Hand coordinates, posture and expressions share the original 48 × 56 clothing rig.
export const striding=p=>['walk','hands','hands-left','cat-walk','chase','dance'].includes(p);
export const seated=p=>['sit','smoke','shoulder','cuddle','cat-pet','cat-lap'].includes(p);
export function momentHand(p,f,top,person){
 const girl=person==='mehezad';
 if(p==='hands-left')return {x:13,y:top+(girl?5:8)+f%2,left:true};
 const targets={
  'cat-pet':[34+f%3,9-f%2],'cat-lap':[33,6+f%2],'cat-lift':[34,5],'cat-walk':[34,5],
  hands:[33,(girl?5:8)+(f%2)], hug:[f?36:33,f===2?-3:0], shoulder:[girl?25:33,girl?9:1],
  stars:[f===2?37:29,f===2?-13:3], flower:[f===0?29:f===3?30:36,(girl?5:0)+(f===0?3:0)],
  chase:[f%2?34:28,f%2?0:5],hair:girl?[28,8]:[[30,3],[38,-6],[40,-12],[36,-8]][f],
  dance:[34+(f%2),1],cuddle:[girl?26:34,girl?7:0],kiss:[32,f===2?0:4],'receive-kiss':[f===2?28:31,f===2?-5:6]
 };
 const hand=targets[p];return hand?{x:hand[0],y:top+hand[1]}:null;
}
export function expression(c,p,f,h,girl){
 const berry=girl?'#ad656c':'#a5645b',blush=girl?'#ecaa9d':'#e6a58e';
 if(['hug','flower','hair','kiss','receive-kiss','dance'].includes(p)&&f){
  c.rect(19,h+10,2,1,blush);c.rect(28,h+10,2,1,blush);
  if(p==='receive-kiss'&&f===1){
   c.rect(20,h+4,2,1,'#59424a');c.rect(24,h+12,2,2,berry);
  }else{
   c.dot(23,h+12,berry);c.rect(24,h+13,3,1,berry);c.dot(27,h+12,berry);
  }
 }
 if(p==='kiss'&&f===2){c.rect(23,h+12,3,2,girl?'#efc5b2':'#edc2a4');c.rect(26,h+12,2,2,berry);}
 if(p==='hair'&&girl&&f>0){
  c.line(30,h+6,32+f%2,h+14,'#534552');c.line(32+f%2,h+14,31,h+20,'#403644');
 }
}
export function carriedFlower(c,p,f,hand,person){
 if(p!=='flower'||!hand||(person==='labib')!==(f<2))return;
 const x=hand.x+2,y=hand.y;
 c.line(x,y,x+2,y-7,'#507859');c.line(x+1,y-3,x-1,y-5,'#7f9b63');
 c.rect(x-1,y-10,5,4,'#a6506f');c.rect(x,y-11,4,2,'#ffb9be');
 c.rect(x,y-9,4,3,'#bc617d');c.rect(x+1,y-10,2,3,'#f092a6');
 c.dot(x+3,y-9,'#ffceba');c.dot(x,y-8,'#d97f9a');
}
// Inverse nearest-neighbor sampling makes a single silhouette transform apply to hair,
// limbs and every equipped garment. The ground shadow stays on the ground.
export function posture(src,p,f,person,body){
 const out=Buffer.alloc(src.length),girl=person==='mehezad';
 const reclining=p==='stars',rest=p==='cuddle'||p==='shoulder';
 const lean=p==='cat-pet'?6:p==='cat-lap'?3:rest?(girl?5:2):p==='hug'?(f?4:1):p==='kiss'?[0,3,6,1][f]:
  p==='receive-kiss'?[0,-2,-1,1][f]:p==='chase'?3:p==='hair'&&!girl?2:p==='dance'?[0,1,2,1][f]:0;
 const angle=reclining?(f?-1.19:-.63):0,cos=Math.cos(angle),sin=Math.sin(angle);
 for(let y=0;y<56;y++)for(let x=0;x<48;x++){
  const i=(y*48+x)*4;
  if(body&&!rest){
   const shadow=reclining?((x-24)/20)**2+((y-44)/5)**2:((x-25)/10)**2+((y-49)/3)**2;
   if(shadow<1)out.set([40,51,48,Math.round(48*(1-shadow)+18)],i);
  }
  let sx=x,sy=y;
  if(reclining){const dx=x-24,dy=y-(f?39:34);sx=24+cos*dx+sin*dy;sy=29-sin*dx+cos*dy;}
  else{
   if(p==='cat-pet')sy-=Math.round(Math.max(0,(45-y)/5));
   sx-=Math.round(lean*Math.max(0,Math.min(1,(48-y)/26)));
   if((rest||p==='hug')&&f===2&&y<38)sy-=1;
  }
  sx=Math.round(sx);sy=Math.round(sy);
  if(sx<0||sx>=48||sy<0||sy>=56)continue;
  const j=(sy*48+sx)*4;if(src[j+3]===255)src.copy(out,i,j,j+4);
 }
 return out;
}
