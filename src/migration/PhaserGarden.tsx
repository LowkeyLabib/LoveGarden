import {useEffect,useRef,useState} from 'react';
import {Icon} from '../components/Art';
import type {GardenState} from '../lib/types';
import type {GardenScene} from './scene';

export default function PhaserGarden(props:{state:GardenState;now:number}) {
 const host=useRef<HTMLDivElement>(null);
 const latest=useRef(props);
 const scene=useRef<GardenScene|null>(null);
 const [error,setError]=useState('');
 useEffect(()=>{latest.current=props;scene.current?.sync(props.state,props.now);},[props.state,props.now]);
 useEffect(()=>{
  let disposed=false;
  let cleanup:(()=>void)|undefined;
  void import('./scene').then(({mountGarden})=>{
   if(disposed||!host.current)return;
   const mounted=mountGarden(host.current,()=>latest.current);
   scene.current=mounted.scene;
   cleanup=mounted.destroy;
  }).catch(()=>{if(!disposed)setError('The canvas could not start.');});
  return ()=>{disposed=true;scene.current=null;cleanup?.();};
 },[]);
 return <div className="garden-world">
  <div ref={host} className="garden-canvas" role="img" aria-label="Read-only isometric LoveGarden" style={{position:'absolute',inset:0,touchAction:'none'}}/>
  <div className="camera-controls"><button aria-label="Zoom in" onClick={()=>scene.current?.zoom(1.2)}><Icon name="plus"/></button><button aria-label="Zoom out" onClick={()=>scene.current?.zoom(1/1.2)}><Icon name="minus"/></button><button className="camera-reset" onClick={()=>scene.current?.reset()}><Icon name="reset" size={17}/>Reset View</button></div>
  {error&&<p role="alert">{error} <a href="?renderer=legacy">Open the original garden</a></p>}
 </div>;
}
