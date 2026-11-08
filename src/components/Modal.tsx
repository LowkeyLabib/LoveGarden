import { useEffect, useRef, useId, type ReactNode } from 'react';
import { Icon } from './Art';
export default function Modal({title,subtitle,children,onClose,wide=false}:{title:string;subtitle?:string;children:ReactNode;onClose:()=>void;wide?:boolean}){
 const titleId=useId(); const ref=useRef<HTMLDialogElement>(null), close=useRef(onClose);close.current=onClose;
 useEffect(()=>{const previous=document.activeElement as HTMLElement|null;const el=ref.current!;el.showModal();const cancel=(e:Event)=>{e.preventDefault();close.current();};el.addEventListener('cancel',cancel);return()=>{el.removeEventListener('cancel',cancel);el.close();previous?.focus();};},[]);
 return <dialog ref={ref} className={`modal ${wide?'wide':''}`} onClick={e=>{if(e.target===ref.current){const b=ref.current.getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)onClose();}}} aria-labelledby={titleId}><div className="modal-heading"><div><span className="eyebrow modal-eyebrow"><Icon name="leaf" size={13}/> A LOVEGARDEN MOMENT</span><h2 id={titleId}>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div><button className="icon-button close" aria-label="Close dialog" onClick={onClose}><Icon name="close"/></button></div>{children}</dialog>;
}

