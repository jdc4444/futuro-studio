"use client";
import {useEffect,useRef,useState} from 'react';
import {dottedPath} from './light-typography';
export function GlossaryText({text,locale,family,weight,dotted}:{text:string;locale:string;family:string;weight:number;dotted:boolean}){
 const ref=useRef<HTMLParagraphElement>(null),[art,setArt]=useState<{path:string;width:number;height:number}|null>(null);
 useEffect(()=>{if(!dotted)return;const el=ref.current;if(!el)return;let stopped=false;
 const update=()=>{if(stopped)return;const width=el.clientWidth,height=el.clientHeight,size=parseFloat(getComputedStyle(el).fontSize),canvas=document.createElement('canvas'),ctx=canvas.getContext('2d')!;ctx.font=`${weight} ${size}px "${family}"`;ctx.textAlign='center';ctx.direction=['ar','fa','he','ur'].includes(locale)?'rtl':'ltr';const m=ctx.measureText(text),fit=Math.min(1,width/Math.max(1,m.width)),fontSize=size*fit;
 const entry={locale,script:'',text,family,weight,size:fontSize,bodySample:text,bodyHeight:fontSize,opticalBoost:1,lines:[{text,x:(m.actualBoundingBoxLeft)*fit,y:(height+(m.actualBoundingBoxAscent-m.actualBoundingBoxDescent)*fit)/2,inkHeight:height,inkWidth:width}]};
 setArt({path:dottedPath(entry,{width,rowHeight:height,bodyHeight:fontSize,entries:{[locale]:entry}}),width,height});};
 const ready=document.fonts.load(`${weight} 100px "${family}"`,text);const observer=new ResizeObserver(()=>{void ready.then(update)});observer.observe(el);void ready.then(update);return()=>{stopped=true;observer.disconnect()};
 },[text,locale,family,weight,dotted]);
 return <p ref={ref} lang={locale} dir="auto" className={dotted?'glossary-dotted':undefined} style={{fontFamily:`"${family}", sans-serif`,fontWeight:weight}}><span style={dotted?{visibility:'hidden'}:undefined}>{text}</span>{dotted&&art&&<svg aria-hidden="true" viewBox={`0 0 ${art.width} ${art.height}`}><path d={art.path} fill="currentColor"/></svg>}</p>;
}
