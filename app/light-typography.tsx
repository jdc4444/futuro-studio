'use client';
import {useEffect,useRef,useState} from 'react';
import {typesetLight,type TypeEntry,type TypesetPage,type TypesetEntry} from './light-typesetting';
const dotCache=new WeakMap<TypesetEntry,string>();
export function dottedPath(entry:TypesetEntry,page:TypesetPage){
 const cached=dotCache.get(entry);if(cached!==undefined)return cached;
 const scale=100/entry.size,canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{willReadFrequently:true})!;
 ctx.font=`${entry.weight} 100px "${entry.family}"`;ctx.textAlign='center';ctx.direction=['ar','fa','ur','he'].includes(entry.locale)?'rtl':'ltr';
 const line=entry.lines[0],metrics=ctx.measureText(line.text),pad=6;
 canvas.width=Math.ceil(metrics.actualBoundingBoxLeft+metrics.actualBoundingBoxRight+pad*2);canvas.height=Math.ceil(metrics.actualBoundingBoxAscent+metrics.actualBoundingBoxDescent+pad*2);
 ctx.font=`${entry.weight} 100px "${entry.family}"`;ctx.textAlign='center';ctx.direction=['ar','fa','ur','he'].includes(entry.locale)?'rtl':'ltr';
 ctx.fillStyle='#fff';ctx.fillText(line.text,metrics.actualBoundingBoxLeft+pad,metrics.actualBoundingBoxAscent+pad);
 const w=canvas.width,h=canvas.height,pixels=ctx.getImageData(0,0,w,h).data,mask=new Uint8Array(w*h);
 for(let i=0;i<mask.length;i++)mask[i]=pixels[i*4+3]>60?1:0;
 // Topology-preserving thinning produces one centerline, not two outline edges.
 const offsets=[-w,-w+1,1,w+1,w,w-1,-1,-w-1];
 let changed=true;
 while(changed){changed=false;for(let pass=0;pass<2;pass++){
  const remove:number[]=[];
  for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
   const i=y*w+x;if(!mask[i])continue;const n=offsets.map(d=>mask[i+d]),count=n.reduce((a,b)=>a+b,0);if(count<2||count>6)continue;
   let transitions=0;for(let k=0;k<8;k++)if(!n[k]&&n[(k+1)%8])transitions++;if(transitions!==1)continue;
   if(pass===0?(n[0]*n[2]*n[4]||n[2]*n[4]*n[6]):(n[0]*n[2]*n[6]||n[0]*n[4]*n[6]))continue;
   remove.push(i);
  }
  if(remove.length)changed=true;for(const i of remove)mask[i]=0;
 }}
 const visited=new Uint8Array(w*h),paths:string[]=[],dots:Array<[number,number]>=[],step=3.8,r=.80/scale;
 const originX=line.x-(metrics.actualBoundingBoxLeft+pad)/scale,originY=line.y-(metrics.actualBoundingBoxAscent+pad)/scale;
 const emit=(i:number)=>{const x=i%w,y=Math.floor(i/w);if(dots.some(([a,b])=>(a-x)**2+(b-y)**2<step*step*.65))return;dots.push([x,y]);const px=originX+x/scale,py=originY+y/scale;paths.push(`M${px-r},${py}a${r},${r} 0 1,0 ${2*r},0a${r},${r} 0 1,0 ${-2*r},0`);};
 const neighbors=(i:number)=>offsets.map(d=>i+d).filter(j=>j>=0&&j<mask.length&&mask[j]);
 const starts=Array.from(mask.keys()).filter(i=>mask[i]).sort((a,b)=>neighbors(a).length-neighbors(b).length);
 for(const start of starts){if(visited[start])continue;const stack:Array<[number,number]>=[[start,step]];
  while(stack.length){const [i,distance]=stack.pop()!;if(visited[i])continue;visited[i]=1;let nextDistance=distance;if(distance>=step){emit(i);nextDistance=0;}
   const next=neighbors(i).filter(j=>!visited[j]);if(!next.length&&distance>step*.65)emit(i);
   for(const j of next)stack.push([j,nextDistance+Math.hypot(j%w-i%w,Math.floor(j/w)-Math.floor(i/w))]);
  }
 }
 const result=paths.join('');dotCache.set(entry,result);return result;
}
export function LightTypography({entries,visible,layout,dotted=false}:{entries:TypeEntry[];visible:readonly string[];layout?:string;dotted?:boolean}){
 const host=useRef<HTMLSpanElement>(null);
 const [page,setPage]=useState<TypesetPage|null>(null);
 useEffect(()=>{
  const element=host.current;if(!element)return;
  let cancelled=false;
  const ready=Promise.all(entries.map(e=>document.fonts.load(`${e.weight} 100px "${e.family}"`,e.text)));
  const update=()=>{if(cancelled||!element.clientWidth||!element.clientHeight)return;const css=getComputedStyle(element);const columns=css.gridTemplateColumns.split(' ').map(parseFloat).filter(n=>n>0);const rows=css.gridTemplateRows.split(' ').map(parseFloat).filter(n=>n>0);setPage(typesetLight(entries,columns.length?Math.min(...columns):element.clientWidth,rows.length?Math.min(...rows)*5:element.clientHeight))};
  const observer=new ResizeObserver(()=>{void ready.then(update)});observer.observe(element);
  void ready.then(update).catch(update);
  return()=>{cancelled=true;observer.disconnect()};
 },[entries,layout]);
 return <span ref={host} className="light-type-grid">{page&&visible.map((locale,row)=>{
  const entry=page.entries[locale];if(!entry)return null;
  return <svg key={row} className="phrase" width="100%" height="100%" viewBox={`0 0 ${page.width} ${page.rowHeight}`} lang={locale} aria-label={entry.text} data-body-sample={entry.bodySample} data-body-height={entry.bodyHeight} data-optical-boost={entry.opticalBoost} data-font-family={entry.family} data-font-weight={entry.weight} data-font-size={entry.size} data-stroke={entry.stroke||0}>{dotted&&entry.family!=='Raleway Dots'?<path d={dottedPath(entry,page)} fill="currentColor"/>:entry.lines.map((line,i)=><text key={i} x={line.x} y={line.y} textAnchor="middle" direction={['ar','fa','ur','he'].includes(locale)?'rtl':'ltr'} style={{fontFamily:`"${entry.family}"`,fontSize:entry.size,fontWeight:entry.weight,fontSynthesis:'none',fill:'currentColor',stroke:entry.stroke?'currentColor':'none',strokeWidth:entry.size*(entry.stroke||0),strokeLinejoin:'round',paintOrder:'stroke fill'}}>{line.text}</text>)}</svg>;
 })}</span>;
}
