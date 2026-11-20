import {useEffect,useMemo,useRef,useState} from 'react';
import {equipFashion,loadFashion,purchaseFashion} from '../lib/api';
import type {FashionCatalogItem,FashionCharacter,FashionState,FashionVariant,PublicFashionState,Role} from '../lib/types';
import {CharacterSprite} from '../garden/CharacterSprite';
import type {CharacterPose} from '../garden/characters';
import {Icon} from './Art';

type Props={mode:'shop'|'wardrobe';role:Role;balance:number;fashion:PublicFashionState;online:boolean;onChanged:()=>Promise<void>;onNotify:(message:string)=>void;onOpenWardrobe?:()=>void};
type Collection='MEHEZAD'|'BOTH'|'DESI';
const empty:FashionState={catalog:[],variants:[],ownership:[],equipped:[]};
const defaultFor:Record<FashionCharacter,string>={LABIB:'default-labib',MEHEZAD:'default-mehezad'};
const ownerFor=(role:Role):FashionCharacter|null=>role==='GARDENER'?'LABIB':role==='CARETAKER'?'MEHEZAD':null;
const errorText=(error:unknown)=>error instanceof Error?error.message:'Something went wrong. Please try again.';
const pose=(person:'labib'|'mehezad',x:number,frame:number):CharacterPose=>({person,pose:'idle',direction:'se',frame,x,y:58,depth:0,hearts:false});

function Preview({item,variants,frame=0,wearer}:{item:FashionCatalogItem;variants:FashionVariant[];frame?:number;wearer?:FashionCharacter}){
 const sprites=new Map(variants.filter(v=>v.catalog_id===item.id).map(v=>[v.character,v.sprite_ref]));
 const showBoth=item.ownership_target==='BOTH'&&!wearer;
 const single=wearer??'MEHEZAD';
 const sprite=sprites.get(single);
 return <svg className={`fashion-characters ${showBoth?'couple':''}`} viewBox={showBoth?'0 0 126 72':'0 0 76 72'} role="img" aria-label={`${item.name} outfit preview`}>
  {showBoth
   ?<><CharacterSprite character={pose('labib',43,frame)} layers={sprites.get('LABIB')?[sprites.get('LABIB')!]:[]}/><CharacterSprite character={pose('mehezad',82,frame)} layers={sprites.get('MEHEZAD')?[sprites.get('MEHEZAD')!]:[]}/></>
   :<CharacterSprite character={pose(single==='LABIB'?'labib':'mehezad',38,frame)} layers={sprite?[sprite]:[]}/>
  }
 </svg>;
}

function WardrobePreview({character,item,variants,frame}:{character:FashionCharacter;item:FashionCatalogItem;variants:FashionVariant[];frame:number}){
 const sprite=variants.find(v=>v.catalog_id===item.id&&v.character===character)?.sprite_ref;
 return <svg className="fashion-characters wardrobe-character" viewBox="0 0 76 72" role="img" aria-label={`${character==='LABIB'?'Labib':'Mehezad'} wearing ${item.name}`}><CharacterSprite character={pose(character==='LABIB'?'labib':'mehezad',38,frame)} layers={sprite?[sprite]:[]}/></svg>;
}

export default function FashionBoutique({mode,role,balance,fashion,online,onChanged,onNotify,onOpenWardrobe}:Props){
 const [data,setData]=useState<FashionState>(empty),[loading,setLoading]=useState(true),[failure,setFailure]=useState('');
 const [collection,setCollection]=useState<Collection>('MEHEZAD'),[selected,setSelected]=useState<string|null>(null),[confirming,setConfirming]=useState<FashionCatalogItem|null>(null);
 const [busyId,setBusyId]=useState<string|null>(null),[feedback,setFeedback]=useState(''),[liveBalance,setLiveBalance]=useState(balance),[frame,setFrame]=useState(0);
 const requestIds=useRef(new Map<string,string>());
 const reload=async()=>{try{setData(await loadFashion());setFailure('');}catch(error){setFailure(errorText(error));}finally{setLoading(false);}};
 useEffect(()=>{void reload();},[]);
 useEffect(()=>setLiveBalance(balance),[balance]);
 useEffect(()=>{
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const timer=window.setInterval(()=>setFrame(value=>(value+1)%4),320);
  return()=>window.clearInterval(timer);
 },[]);
 // Prefer the shared public state so Realtime wardrobe changes made on another client
 // update an already-open boutique; the private load still supplies ownership data.
 const variants=data.variants.length?data.variants:fashion.variants;
 const equipped=fashion.equipped.length?fashion.equipped:data.equipped;
 const owned=useMemo(()=>new Set([...data.catalog.filter(item=>item.is_default).map(item=>item.id),...data.ownership.map(item=>item.catalog_id)]),[data]);
 const shopItems=data.catalog.filter(item=>!item.is_default&&(collection==='DESI'?item.collection==='desi':item.ownership_target===collection));
 const selectedItem=shopItems.find(item=>item.id===selected)||shopItems[0];
 const character=ownerFor(role);
 const wearable=character?data.catalog.filter(item=>owned.has(item.id)&&variants.some(v=>v.catalog_id===item.id&&v.character===character)):[];
 const equippedId=character?equipped.find(item=>item.character===character&&item.slot==='outfit')?.catalog_id||defaultFor[character]:'';
 const wardrobeSelection=wearable.find(item=>item.id===selected)||wearable.find(item=>item.id===equippedId)||wearable[0];

 const buy=async(item:FashionCatalogItem)=>{
  if(busyId)return;
  setBusyId(item.id);setFeedback('');
  try{
   let request=requestIds.current.get(item.id);if(!request){request=crypto.randomUUID();requestIds.current.set(item.id,request);}
   const result=await purchaseFashion(item.id,request);requestIds.current.delete(item.id);setLiveBalance(result.balance);
   const message=result.purchased?`${item.name} is now in your wardrobe.`:`${item.name} was already yours.`;
   setFeedback(message);setConfirming(null);onNotify(message);await reload();await onChanged();
  }catch(error){setFeedback(errorText(error));}finally{setBusyId(null);}
 };
 const equip=async(item:FashionCatalogItem)=>{
  if(busyId||!character)return;
  const target=item.id===equippedId?defaultFor[character]:item.id;
  setBusyId(item.id);setFeedback('');
  try{await equipFashion(target);const message=target===defaultFor[character]?'Back in the classic outfit.':`${item.name} is now equipped.`;setFeedback(message);onNotify(message);await reload();await onChanged();}
  catch(error){setFeedback(errorText(error));}finally{setBusyId(null);}
 };

 if(loading)return <div className="fashion-loading" role="status">Opening the wardrobe…</div>;
 if(failure)return <div className="fashion-feedback error" role="alert">{failure}<button className="text-button" onClick={()=>{setLoading(true);void reload();}}>Try again</button></div>;
 if(!data.catalog.length)return <div className="fashion-feedback error" role="alert">Fashion is waiting for its database migration.</div>;

 if(mode==='wardrobe'){
  if(!character)return <section className="fashion-boutique wardrobe-view"><div className="fashion-hero guest-wardrobe"><div><span className="fashion-kicker">Shared wardrobe</span><h3>Today’s garden looks</h3><p>Guests can admire the couple’s current outfits. Sign in as Labib or Mehezad to change clothes.</p></div><div className="current-couple">{(['LABIB','MEHEZAD'] as FashionCharacter[]).map(person=>{const id=equipped.find(e=>e.character===person&&e.slot==='outfit')?.catalog_id||defaultFor[person];const item=data.catalog.find(i=>i.id===id)||data.catalog.find(i=>i.id===defaultFor[person]);return item&&<WardrobePreview key={person} character={person} item={item} variants={variants} frame={frame}/>;})}</div></div></section>;
  return <section className="fashion-boutique wardrobe-view">
   <div className="fashion-hero wardrobe-hero">{wardrobeSelection&&<WardrobePreview character={character} item={wardrobeSelection} variants={variants} frame={frame}/>}<div><span className="fashion-kicker">{character==='LABIB'?"Labib’s wardrobe":"Mehezad’s wardrobe"}</span><h3>{wardrobeSelection?.name||'Classic outfit'}</h3><p>Select an owned look to preview it live, then equip it for everyone in the garden to see.</p><span className="fashion-live"><i/>Live preview</span></div></div>
   {feedback&&<p className={`fashion-feedback ${feedback.includes('now')||feedback.includes('classic')?'success':'error'}`} role="status">{feedback}</p>}
   <div className="wardrobe-grid">{wearable.map(item=>{const active=item.id===equippedId;return <article className={`fashion-card wardrobe-card ${selected===item.id?'selected':''} ${active?'owned':''}`} key={item.id} onClick={()=>setSelected(item.id)}><Preview item={item} variants={variants} wearer={character}/><div className="fashion-card-copy"><span className="fashion-rarity">{item.is_default?'Free default':item.rarity}</span><h4>{item.name}</h4><span className="fashion-state">{active?'Equipped':'Owned'}</span></div><button className={active&&!item.is_default?'secondary':'buy-button'} disabled={busyId!==null||!online||(active&&item.is_default)} onClick={event=>{event.stopPropagation();void equip(item);}}>{busyId===item.id?'Changing…':active?item.is_default?'Default equipped':'Unequip':'Equip'}</button></article>;})}</div>
  </section>;
 }

 const collectionTabs=[['MEHEZAD','For Mehezad'],['BOTH','Matching Collection'],['DESI','Desi Collection']] as const;
 const renderProduct=(item:FashionCatalogItem)=>{const isOwned=owned.has(item.id),affordable=liveBalance>=item.price,locked=role!=='CARETAKER';return <article className={`fashion-card ${selected===item.id?'selected':''} ${isOwned?'owned':locked?'locked':affordable?'affordable':'insufficient'}`} key={item.id} onClick={()=>setSelected(item.id)}><Preview item={item} variants={variants}/><div className="fashion-card-copy"><span className="fashion-rarity">{item.rarity}{item.ownership_target==='BOTH'?' · Couple set':''}</span><h4>{item.name}</h4><p>{item.description}</p></div><div className="fashion-purchase"><span className="fashion-price"><Icon name="heart" size={14}/>{item.price} LP</span><span className="fashion-state">{isOwned?'Owned':locked?'Locked':affordable?'Affordable':`${item.price-liveBalance} LP short`}</span></div><button className="buy-button" disabled={isOwned||locked||!affordable||busyId!==null||!online} onClick={event=>{event.stopPropagation();setConfirming(item);}}>{isOwned?'In wardrobe':locked?role==='GARDENER'?'Mehezad purchases':'Sign in to purchase':!affordable?'Not enough LovePoints':'Buy outfit'}</button></article>;};
 return <section className="fashion-boutique">
  <div className="fashion-tabs" role="tablist" aria-label="Fashion collections">{collectionTabs.map(([id,label])=><button key={id} role="tab" aria-selected={collection===id} className={collection===id?'selected':''} onClick={()=>{setCollection(id);setSelected(null);}}>{label}</button>)}</div>
  {selectedItem&&<div className="fashion-hero"><Preview item={selectedItem} variants={variants} frame={frame}/><div><span className="fashion-kicker">{selectedItem.ownership_target==='BOTH'?'Made for two':'A look for Mehezad'}</span><h3>{selectedItem.name}</h3><p>{selectedItem.description}</p><span className="fashion-live"><i/>Live preview</span></div><div className="fashion-balance"><Icon name="heart" size={16}/><strong>{liveBalance}</strong><small>LovePoints</small></div></div>}
  <div className="fashion-toolbar"><p>{role==='CARETAKER'?'Choose a new look with your LovePoints.':role==='GARDENER'?'Labib can browse; Mehezad makes boutique purchases.':'Browse the collection. Sign in to shop or change outfits.'}</p>{onOpenWardrobe&&<button className="secondary" onClick={onOpenWardrobe}>Open Wardrobe</button>}</div>
  {feedback&&<p className={`fashion-feedback ${feedback.includes('wardrobe')||feedback.includes('yours')?'success':'error'}`} role="status">{feedback}</p>}
  {collection==='DESI'&&shopItems.length===0&&<p className="fashion-feedback">The Desi Collection is coming soon.</p>}
  {collection==='DESI'?([['MEHEZAD','Solo outfits'],['BOTH','Matching sets']] as const).map(([owner,label])=>{
   const items=shopItems.filter(item=>item.ownership_target===owner).sort((a,b)=>a.price-b.price);
   return items.length>0&&<section key={owner} aria-label={label}><h3>{label}</h3><div className="fashion-grid">{items.map(renderProduct)}</div></section>;
  }):<div className="fashion-grid">{shopItems.map(renderProduct)}</div>}
  {confirming&&<div className="fashion-confirm" role="dialog" aria-labelledby="fashion-confirm-title"><Preview item={confirming} variants={variants}/><div><span className="fashion-kicker">Confirm purchase</span><h3 id="fashion-confirm-title">Bring home {confirming.name}?</h3><p>{confirming.price} LovePoints will be used. This outfit stays owned forever.</p><div className="fashion-confirm-actions"><button className="secondary" disabled={!!busyId} onClick={()=>setConfirming(null)}>Not yet</button><button className="primary" disabled={!!busyId||!online} onClick={()=>void buy(confirming)}>{busyId===confirming.id?'Purchasing…':`Buy for ${confirming.price} LP`}</button></div></div></div>}
 </section>;
}
