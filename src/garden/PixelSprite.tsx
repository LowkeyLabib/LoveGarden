import atlas from './atlas.json';
export function PixelSprite({name,x=0,y=0,scale=1}:{name:string;x?:number;y?:number;scale?:number}){
 const frame=atlas.frames[name as keyof typeof atlas.frames];
 if(!frame)return null;
 return <g transform={`translate(${x} ${y}) scale(${scale})`} pointerEvents="none"><svg x={-frame.anchorX} y={-frame.anchorY} width={frame.w} height={frame.h} viewBox={`${frame.x} ${frame.y} ${frame.w} ${frame.h}`} overflow="hidden"><image href="/art/atlas.png" width={atlas.width} height={atlas.height} style={{imageRendering:'pixelated'}}/></svg></g>;
}
