"""Generate approved Compact Shontu in 48x56 RGBA animation cells. Feet share the couple atlas anchor (24,49)."""
from PIL import Image, ImageDraw
from pathlib import Path
import json
root=Path(__file__).parent
ink='#776e71';cap='#322f37';dark='#292731';white='#faf4df';light='#fffbea';mid='#dedbd0';shade='#b9bab8';pink='#d99997'
def cell(action,view,f):
 w,h,head,leg=9,7,6,3
 pace=[0,1,0,-1][f]
 pose=3 if action in ('belly','rub','flop') else 2 if action in ('loaf','curl','side','stalk','wiggle','pounce','lap','carry','stretch') else 1 if action in ('sit','groom','wash','yawn','alert','confused','pet','squirm') else 0
 im=Image.new('RGBA',(48,56));d=ImageDraw.Draw(im)
 def oval(x,y,rx,ry,color):d.ellipse((x-rx,y-ry,x+rx,y+ry),fill=color)
 def coat(x,y,rx,ry):
  oval(x,y,rx,ry,ink);oval(x,y,rx-1,ry-1,shade)
  oval(x-1,y-1,rx-2,ry-2,mid);oval(x-1,y-2,rx-2,max(2,ry-3),white)
 def paw(x,y):
  oval(x,y,3,2,shade);oval(x,y-1,2,1,white);d.point((x+1,y),fill=mid)
 def tail(points):
  points=list(points);x,y=points[-1];points[-1]=(x+pace,y-(2 if action=='squirm' else 1)*pace)
  d.line(points,fill=dark,width=5,joint='curve');oval(*points[-1],2,2,dark)
  d.line([(x,y-1) for x,y in points],fill='#514955',width=2)
 side=view==1;rear=view==2;iso=view==3
 cx=23;cy=46-leg-h
 if pose==1:cy=36;h+=2;w-=1
 if pose==2:cy=43-h//2;h=max(6,h-2);w+=1
 if pose==3:cy=36;h+=2
 if action in ('side','stretch','carry','lap','stalk','pounce'):w+=2;h-=2;cy+=2
 if action in ('carry','lap','side'):h=7;cy=41;w-=1
 if action in ('curl','loaf','belly','rub','lap'):h+=int(f==2)
 if action in ('run','pounce','flop'):cy-=[0,2,4,1][f]
 if action=='wiggle':cx+=pace
 if action in ('walk','run'):cy-=abs(pace)
 if action not in ('carry','lap'):oval(24,48,min(18,w+3),3,(67,66,64,48))
 if pose==3:
  tail([(20,42),(16,47),(10,48),(7,46)])
  coat(cx,cy,w,h)
  # Splayed back legs and soft upturned forepaws frame the exposed belly.
  for x,y,xx,yy in [(17,42,15,47),(28,42,32,46),(17,31,13,34),(29,31,33,33)]:
   d.line((x,y,xx,yy),fill=mid,width=4);paw(xx,yy);d.point((xx,yy),fill='#e1bab3')
  oval(cx,cy+2,w-4,h-5,'#f5eadc');d.line((22,39,24,39),fill='#e6d7cb')
  hx=cx+(5 if side else 3 if iso else 0);hy=cy-h+1
 else:
  if side or iso: w+=2
  if not rear and action!='curl':tail([(cx-w+3,cy+2),(cx-w-3,cy+4),(max(3,cx-w-6),cy),(max(3,cx-w-5),cy-4)])
  if pose==0:
   for n,x in enumerate([cx-w+4,cx+w-4]):
    stride=(1 if n else -1)*pace*(2 if action=='run' else 1) if action in ('walk','run') else 0
    d.line((x,cy+2,x+stride,46-abs(stride)),fill=mid,width=4);paw(x+stride,47-abs(stride))
  coat(cx,cy,w,h)
  if pose==1:
   for x in [18,27]:d.line((x,cy+2,x,46),fill=mid,width=3);paw(x,47)
  if pose==2:paw(cx+5,cy+h-1)
  hx=cx+(w-3 if side else w//2 if iso else 0)
  hy=cy-(h//2 if pose==0 else h-2) + (2 if pose==2 else 0)
 if action=='curl':hx=cx+4;hy=cy+1
 if action in ('side','carry','lap'):hx=cx+w-2;hy=cy-3
 if action=='groom':hx-=3;hy+=f%3
 if action in ('pet','rub','squirm'):hy+=pace
 hx=min(39,hx)
 for sign in [-1,1]:
  ex=hx+sign*(head-3);tip=(ex+sign*(3 if f==3 else 2),hy-head-(0 if action=='squirm' else 3))
  d.polygon([(ex-3,hy-2),tip,(ex+3,hy-2)],fill=cap)
  if not rear:d.line((tip[0],tip[1]+2,ex,hy-4),fill='#bd9d9b')
 coat(hx,hy,head,head-1)
 # Two asymmetric crown patches divided by the white forehead blaze.
 for sign in [-1,1]:
  ex=hx+sign*(head//2);ry=3+(sign==-1)
  oval(ex,hy-3,head//2-1,ry,cap)
  d.line((ex-1,hy-4,ex,hy-5),fill='#514953')
 if not rear:
  off=3 if side else 1 if iso else 0
  for dx in ([3] if side else [-3,3]):
   x=hx+dx+off;y=hy+1
   d.line((x-1,y,x+1,y+(dx>0)),fill=dark)
   if pose<2:d.point((x,y+1),fill='#6d715b')
  nx=hx+off+(2 if side else 0)
  d.line((nx-1,hy+3,nx+1,hy+3),fill=pink);d.point((nx,hy+4),fill='#aa777d')
 if rear and pose!=3 and action!='curl':tail([(cx,cy+3),(cx+1,cy+h-1),(cx+7,cy+h),(cx+10,cy+h-3)])
 if action=='wash':paw(hx+4,hy+3-f)
 if action=='groom':paw(hx-2,hy+5);d.point((hx,hy+4),fill=pink)
 if action=='yawn' and f in (1,2):oval(hx+2,hy+5,2,2,'#ae8484')
 if action in ('stretch','pounce'):paw(min(44,cx+w+3+f),46)
 if action=='curl':tail([(cx-w,cy),(cx-w,cy+4),(cx,cy+6),(cx+5,cy+4)])
 if action in ('belly','rub'):
  im=im.rotate(-32 if not rear else 28,resample=Image.Resampling.NEAREST,center=(24,38),translate=(0,-3))
  d=ImageDraw.Draw(im)
 if action in ('pet','rub','lap') and f==2:
  d.line((35,29,36,28),fill='#c3bca7')
 if action in ('belly','curl','side') and f==3:
  d.line((32,19,34,19,32,21,34,21),fill='#d8d8cd')
 if action=='confused':d.line((hx+2,hy-1,hx+4,hy-2),fill=ink)
 if action=='alert' and not rear:oval(hx+2,hy+1,1,1,dark)
 if action=='flop':im=im.rotate([72,48,22,0][f],resample=Image.Resampling.NEAREST,center=(24,39),translate=(0,-[5,4,3,0][f]))
 return im
actions='sit walk run belly curl side loaf flop stretch yawn groom wash stalk alert wiggle pounce confused pet rub carry lap squirm'.split()
sheet=Image.new('RGBA',(48*16,56*len(actions)))
for row,action in enumerate(actions):
 for direction in range(4):
  for frame in range(4):
   im=cell(action,3 if direction<2 else 2,frame)
   if direction%2:im=im.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
   sheet.paste(im,((direction*4+frame)*48,row*56))
sheet.save(root.parent/'public/art/shontu.png',optimize=True)
(root.parent/'src/garden/shontuFrames.json').write_text(json.dumps(actions))
