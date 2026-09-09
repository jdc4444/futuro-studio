'use client';
import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const allStudies=[{id:0,title:'Fractal architecture',line:'Structure within structure.'},{id:1,title:'Coordinate planes',line:'Three planes. One changing space.'},{id:2,title:'Cloud / floating cube',line:'A solid form in a shifting atmosphere.'},{id:5,title:'Tree in the wind',line:'A study of movement and resistance.'},{id:6,title:'Inverted cosmos',line:'An interior with no fixed horizon.'},{id:7,title:'Contour well',line:'Depth revealed one contour at a time.'},{id:10,title:"Contour blue whale",line:"Form, motion and changing sections."},{id:11,title:"Contour Empire State",line:"Form, motion and changing sections."},{id:12,title:"Contour solar system",line:"Form, motion and changing sections."},{id:13,title:"Bicycle / cube",line:"Form, motion and changing sections."},{id:14,title:"Track bicycle / axial assembly",line:"Form, motion and changing sections."},{id:15,title:"Volcano / strata",line:"Form, motion and changing sections."},{id:16,title:"Asteroid / impact sections",line:"Form, motion and changing sections."},{id:17,title:"Murmuration / flight volume",line:"Form, motion and changing sections."},{id:20,title:"Murmuration / divide & return",line:"Form, motion and changing sections."},{id:21,title:"Butterflies / floating sections",line:"Form, motion and changing sections."},{id:22,title:"Half beehive",line:"Form, motion and changing sections."}];
const studies=allStudies.filter(item=>![0,1,2,6,14].includes(item.id));
const subscribeMotion=(callback:()=>void)=>{const query=matchMedia('(prefers-reduced-motion: reduce)');query.addEventListener('change',callback);return()=>query.removeEventListener('change',callback);};
type Config={id:number;heading:string;body:string;mode:string};
function display(text:string,font:string,mode:string){return font==='Major'||mode==='lower'?text.toLowerCase():font.endsWith(' Caps')||mode==='upper'?text.toUpperCase():text;}
export function BookMotion({config}:{config:Config}){
 const [study,setStudy]=useState('5');
 const [playing,setPlaying]=useState<boolean|null>(null);
 const reduced=useSyncExternalStore(subscribeMotion,()=>matchMedia('(prefers-reduced-motion: reduce)').matches,()=>true);
 const isPlaying=playing??!reduced;
 const [visible,setVisible]=useState(false);
 const frame=useRef<HTMLIFrameElement>(null);
 const root=useRef<HTMLElement>(null);
 const current=studies.find(item=>String(item.id)===study)!;
 const heading=config.heading.replace(/ Caps$/,'');
 const body=config.body.replace(/ Caps$/,'');
 const send=()=>frame.current?.contentWindow?.postMessage({type:'book-motion',study:Number(study),playing:isPlaying&&visible},'*');
 useEffect(()=>{const observer=new IntersectionObserver(([entry])=>setVisible(entry.isIntersecting),{rootMargin:'100px'});if(root.current)observer.observe(root.current);return()=>observer.disconnect();},[]);
 useEffect(()=>{
  const update=()=>frame.current?.contentWindow?.postMessage({type:'book-motion',study:Number(study),playing:isPlaying&&visible},'*');
  const ready=(event:MessageEvent)=>{if(event.source===frame.current?.contentWindow&&event.data?.type==='book-motion-ready')update();};
  window.addEventListener('message',ready);update();
  return()=>window.removeEventListener('message',ready);
 },[study,isPlaying,visible]);
 const fontStyle={'--book-heading':`"Book ${heading}"`,'--book-body':`"Book ${body}"`} as CSSProperties;
 return <figure ref={root} className="study motion-study" style={fontStyle}>
  <div className="motion-spread">
   <div className="motion-copy">
    <p className="motion-eyebrow">{display('Motion studies',config.heading,config.mode)}</p>
    <h3>{display(current.title,config.heading,config.mode)}</h3>
    <p className="motion-line">{display(current.line,config.body,config.mode)}</p>
    <p className="motion-byline">{display('Jos Diaz Contreras\nForm / space / movement',config.body,config.mode)}</p>
    <span className="motion-folio">{String(config.id).padStart(2,'0')} / {display('Motion',config.body,config.mode)}</span>
   </div>
   <div className="motion-art"><iframe ref={frame} src="/motion/index.html" title="Rotating studies — drag to orbit" sandbox="allow-scripts allow-same-origin" loading="lazy" onLoad={send}/></div>
  </div>
  <figcaption>{String(config.id).padStart(2,'0')} / Motion spread · Interactive</figcaption>
  <div className="motion-controls"><Tabs value={study} onValueChange={value=>setStudy(String(value))}><TabsList variant="line" aria-label="Motion study" className="motion-options">{studies.map(item=><TabsTrigger key={item.id} value={String(item.id)}>{item.title}</TabsTrigger>)}</TabsList></Tabs><button type="button" onClick={()=>setPlaying(!isPlaying)} aria-pressed={!isPlaying}>{isPlaying?'Pause':'Play'}</button><span>Drag sculpture to orbit</span></div>
 </figure>;
}

export function LightMotion({cycle=0,outerOnly=false,enabled,onEnabled,layout,onLayout}:{cycle?:number;outerOnly?:boolean;enabled:boolean;onEnabled:(value:boolean)=>void;layout:string;onLayout:(value:string)=>void}){
 const [study,setStudy]=useState('7');
 const [frameReady,setFrameReady]=useState(false);
 const angles=['front','three-quarter','elevated','profile'];
 const [cameraAngle,setCameraAngle]=useState('three-quarter');
 const randomAngle=()=>{let previous:string|null=null;try{previous=sessionStorage.getItem('light-last-angle');}catch{}const options=angles.filter(angle=>angle!==previous);const next=options[Math.floor(Math.random()*options.length)];setCameraAngle(next);try{sessionStorage.setItem('light-last-angle',next);}catch{}};
 useEffect(()=>{
  randomAngle();
  let previous:string|null=null;
  try{previous=sessionStorage.getItem('light-last-animation');}catch{}
  const candidates=studies.filter(item=>String(item.id)!==previous);
  const next=String(candidates[Math.floor(Math.random()*candidates.length)].id);
  setStudy(next);
  try{sessionStorage.setItem('light-last-animation',next);}catch{}
 },[]);
 const previousCycle=useRef(cycle);
 useEffect(()=>{if(cycle===previousCycle.current)return;previousCycle.current=cycle;randomAngle();setStudy(value=>{const next=String(studies[(studies.findIndex(item=>String(item.id)===value)+1)%studies.length].id);try{sessionStorage.setItem('light-last-animation',next);}catch{}return next;});},[cycle]);
 const [playing,setPlaying]=useState<boolean|null>(null);
 const reduced=useSyncExternalStore(subscribeMotion,()=>matchMedia('(prefers-reduced-motion: reduce)').matches,()=>true);
 const isPlaying=playing??!reduced;
 const frame=useRef<HTMLIFrameElement>(null);
 const update=()=>frame.current?.contentWindow?.postMessage({type:'book-motion',study:Number(study),playing:enabled&&isPlaying,centered:true,cameraAngle,outerOnly},'*');
 useEffect(()=>{
  const send=()=>frame.current?.contentWindow?.postMessage({type:'book-motion',study:Number(study),playing:enabled&&isPlaying,centered:true,cameraAngle,outerOnly},'*');
  const ready=(event:MessageEvent)=>{if(event.source!==frame.current?.contentWindow)return;if(event.data?.type==='book-motion-ready')send();if(event.data?.type==='book-motion-painted'&&event.data.study===Number(study))setFrameReady(true);};
  window.addEventListener('message',ready);send();return()=>window.removeEventListener('message',ready);
 },[study,isPlaying,enabled,cameraAngle,outerOnly]);
 return <>{enabled&&<iframe className="light-motion-art" style={{opacity:frameReady?1:0}} ref={frame} src="/motion/index.html" title="Light sculpture — drag to orbit" sandbox="allow-scripts allow-same-origin" onLoad={update}/>}</>;
}
