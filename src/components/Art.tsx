import { PixelSprite } from '../garden/PixelSprite';
import type { CSSProperties } from 'react';
export const flowerColors:Record<string,string>={rose:'#dc8b9e',daisy:'#edcc76',tulip:'#e5a386',lavender:'#a49bca',cosmos:'#db9db9',bluebell:'#89b4cc'};
export function Icon({name,size=22,...rest}:{name:string;size?:number;className?:string}){
 const paths:Record<string,React.ReactNode>={
 leaf:<><path d="M19 4C9 3 3 8 5 15s13 7 14-11Z"/><path d="m5 20 9-10"/></>,
 garden:<><path d="M12 21V11m0 5c-8 0-9-5-9-5 7-2 9 5 9 5Zm0-3s1-7 8-6c0 0 1 6-8 6Z"/><path d="M12 11C4 9 7 2 12 5c6-4 9 4 0 6Z"/></>,
 store:<><path d="M4 10v11h16V10M3 4h18l1 6c-2 3-5 2-5 0-2 3-5 2-5 0-2 3-5 2-5 0-2 2-4 2-5 0l1-6Z"/><path d="M9 21v-7h6v7"/></>,
 book:<><path d="M12 5v16M3 3c5-1 9 2 9 2s4-3 9-2v16c-5-1-9 2-9 2s-4-3-9-2Z"/></>,
 heart:<path d="M12 21 3 12C-3 4 7-1 12 6c5-7 15-2 9 6Z"/>,
 sun:<><circle cx="12" cy="12" r="4"/><path d="M12 1v2m0 18v2M1 12h2m18 0h2M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/></>,
 moon:<path d="M20 16A9 9 0 0 1 8 4a9 9 0 1 0 12 12Z"/>,
 close:<path d="m6 6 12 12M6 18 18 6"/>,
 plus:<path d="M12 5v14M5 12h14"/>,minus:<path d="M5 12h14"/>,
 water:<><path d="M12 2S4 11 4 15a8 8 0 0 0 16 0c0-4-8-13-8-13Z"/><path d="M8 15a4 4 0 0 0 4 4"/></>,
 gift:<><path d="M3 10h18v4H3zM5 14v8h14v-8M12 10v12"/><path d="M12 10C0 10 5 0 9 5l3 5c12 0 7-10 3-5l-3 5Z"/></>,
 lock:<><rect x="5" y="10" width="14" height="12" rx="3"/><path d="M8 10V6a4 4 0 0 1 8 0v4m-4 5v3"/></>,
 sound:<><path d="m3 9 5 0 5-5v16l-5-5H3ZM17 8c3 2 3 6 0 8m3-11c5 4 5 10 0 14"/></>,
 music:<><path d="M9 18V5l12-3v13M9 9l12-3"/><ellipse cx="6" cy="18" rx="3" ry="2"/><ellipse cx="18" cy="15" rx="3" ry="2"/></>,
 mute:<><path d="m3 9 5 0 5-5v16l-5-5H3Zm14 0 5 6m0-6-5 6"/></>,
 user:<><circle cx="12" cy="7" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3"/></>,
 reset:<><path d="M5 8a8 8 0 1 1-1 8M5 3v6h6"/></>,
 check:<path d="m4 12 5 5L20 6"/>,
 };
 return <svg {...rest} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]||paths.leaf}</svg>;
}
export function Flower({type='rose',stage=3,style}:{type?:string;stage?:number;style?:CSSProperties}){return <g style={style}><PixelSprite name={`flower-${type}-${stage}`} scale={2.4}/></g>;}
export function GiftArt({kind='box'}:{kind?:string}){return <PixelSprite name={`gift-${kind}`} scale={2.2}/>;}
export function DecorationArt({kind}:{kind:string}){return <PixelSprite name={kind} scale={1.2}/>;}
export function ItemPicture({kind,gift=false}:{kind:string;gift?:boolean}){return <svg className="item-picture" viewBox="-65 -110 130 130" aria-hidden="true">{gift?<GiftArt kind={kind}/>:<DecorationArt kind={kind}/>}</svg>;}
