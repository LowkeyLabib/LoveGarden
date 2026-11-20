import { createClient } from '@supabase/supabase-js';
import type { GardenState, Content, Catalog, FashionCatalogItem, FashionVariant, FashionOwnership, EquippedFashion, FashionState, FashionPurchaseResult, FashionEquipResult } from './types';
import { EPOCH } from './clock.mjs';
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const supabase = url && key && !url.includes('YOUR_PROJECT') ? createClient(url,key) : null;
export const catalog:Catalog[] = [
 ['lantern','Fairy lantern','A little golden light for moonlit evenings.',75],['bench','Garden bench','A quiet place to sit together, always.',100],['butterfly','Butterfly haven','A gathering place for fluttering friends.',150],['arch','Flower arch','A doorway wrapped in climbing roses.',200],['fountain','Little fountain','A soft ripple, a wish, a moment of peace.',250],['cottage','Tiny cottage','A storybook home for your sweetest dreams.',500],['birdhouse','Songbird house','A home for the morning chorus.',125],['heart','Heart ornament','A small reminder of a very big love.',80],['tree','Wishing tree','Tie a little hope to every branch.',300],['seasonal','Harvest pumpkins','Warm autumn colors for your world.',90],
].map(([id,name,description,price])=>({id:String(id),name:String(name),description:String(description),price:Number(price),category:'DECORATION'}));
export const emptyGarden:GardenState = {seeds:[],gifts:[],decorations:[],catalog,inventory:[],transactions:[],fashion:{variants:[],equipped:[]},balance:0,role:'GUEST',epoch:EPOCH,serverTime:Date.now(),angryMode:false,rainbowMode:false,noDataMode:false};
async function rows(table:string) {
 const result:unknown[]=[];
 for(let offset=0;;offset+=1000){
  const {data,error}=await supabase!.from(table).select('*').range(offset,offset+999);
  if(error) throw error;
  result.push(...data);
  if(data.length<1000) return result;
 }
}
async function optionalRows(table:string){
 try{return await rows(table);}
 catch(error){
  const code=(error as {code?:string}).code;
  if(code==='42P01'||code==='PGRST205')return [];
  throw error;
 }
}
export async function loadGarden():Promise<GardenState>{
 if(!supabase) return {...emptyGarden,serverTime:Date.now()};
 const [seeds,gifts,decorations,store,variants,equipped,clock,profile] = await Promise.all([
 rows('seeds'),rows('gifts'),rows('decorations'),rows('store_catalog'),optionalRows('fashion_variants'),optionalRows('character_wardrobe'),supabase.rpc('garden_clock'),supabase.from('profiles').select('role').maybeSingle()
 ]);
 if(clock.error) throw clock.error;
 // Anonymous users have no profile-table privilege; that expected denial is not an app error.
 if(profile.error && profile.error.code!=='42501') throw profile.error;
 const role=profile.data?.role ?? 'GUEST';
 let inventory:unknown[]=[],transactions:unknown[]=[],balance=0;
 if(role==='CARETAKER'){
  const [i,t,w]=await Promise.all([rows('inventory'),rows('point_transactions'),supabase.from('wallets').select('balance').maybeSingle()]);
  if(w.error) throw w.error;
  inventory=i;transactions=t;balance=w.data?.balance??0;
 }
 const decorationsCatalog=(store as Catalog[]).filter(item=>item.category!=='FASHION');
 return {seeds,gifts,decorations,catalog:decorationsCatalog,inventory,transactions,fashion:{variants:variants as FashionVariant[],equipped:equipped as EquippedFashion[]},balance,role,angryMode:clock.data.angry_mode===true,rainbowMode:clock.data.rainbow_mode===true,noDataMode:clock.data.no_data_mode===true,epoch:Date.parse(clock.data.epoch),serverTime:Date.parse(clock.data.server_time)} as GardenState;
}
export async function rpc(name:string,args:Record<string,unknown>){
 if(!navigator.onLine) throw new Error('Reconnect to the internet to tend the garden.');
 if(!supabase) throw new Error('Connect Supabase to bring your shared garden to life.');
 const {data,error}=await supabase.rpc(name,args);
 if(error) throw error;
 return data;
}
export async function loadFashion():Promise<FashionState>{
 if(!supabase) return {catalog:[],variants:[],ownership:[],equipped:[]};
 const [store,details,variants,ownership,equipped]=await Promise.all([
  rows('store_catalog'),rows('fashion_catalog'),rows('fashion_variants'),rows('fashion_ownership'),rows('character_wardrobe')
 ]);
 type FashionDetails=Omit<FashionCatalogItem,keyof Catalog>;
 const detailById=new Map((details as (FashionDetails&{catalog_id:string})[]).map(item=>[item.catalog_id,item]));
 const fashionCatalog=(store as Catalog[]).filter(item=>item.category==='FASHION').flatMap(item=>{
  const detail=detailById.get(item.id);
  return detail?[{...item,...detail}]:[];
 });
 return {catalog:fashionCatalog,variants:variants as FashionVariant[],ownership:ownership as FashionOwnership[],equipped:equipped as EquippedFashion[]};
}
export async function purchaseFashion(catalogId:string,requestId:string):Promise<FashionPurchaseResult>{
 return await rpc('purchase_fashion',{p_catalog:catalogId,p_request:requestId}) as FashionPurchaseResult;
}
export async function equipFashion(catalogId:string):Promise<FashionEquipResult>{
 return await rpc('equip_fashion',{p_catalog:catalogId}) as FashionEquipResult;
}
export function spotifyTrack(input:string){
 if(!input.trim()) return null;
 let parsed:URL;
 try{parsed=new URL(input.trim());}catch{throw new Error('Please use a Spotify track link.');}
 const match=parsed.pathname.match(/^\/track\/([A-Za-z0-9]{22})\/?$/);
 if(parsed.protocol!=='https:'||parsed.hostname!=='open.spotify.com'||!match) throw new Error('Please use a link like https://open.spotify.com/track/…');
 return `https://open.spotify.com/track/${match[1]}`;
}
export async function uploadPhoto(file:File){
 if(!supabase) throw new Error('Connect your garden first.');
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024) throw new Error('Choose a JPG, PNG, or WebP photograph under 5 MB.');
 const {data:{user},error}=await supabase.auth.getUser();
 if(error||!user) throw new Error('Please sign in again.');
 const ext=({'image/jpeg':'jpg','image/png':'png','image/webp':'webp'} as Record<string,string>)[file.type];
 const path=`${user.id}/${crypto.randomUUID()}.${ext}`;
 const {error:uploadError}=await supabase.storage.from('memories').upload(path,file,{contentType:file.type,upsert:false,cacheControl:'0'});
 if(uploadError) throw uploadError;
 return path;
}
export async function openMemory(id:string,kind:'flower'|'gift'):Promise<Content & {awarded:number;opened_at?:string|null}>{
 const content=await rpc('open_memory',{p_id:id,p_kind:kind});
 return content;
}
export async function signedPhoto(path:string){
 const {data,error}=await supabase!.storage.from('memories').createSignedUrl(path,60);
 if(error) throw error;
 return data.signedUrl;
}
