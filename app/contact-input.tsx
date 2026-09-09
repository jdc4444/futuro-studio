'use client';
import {useEffect,useRef,useState} from 'react';
export function ContactInput({value,onChange,disabled}:{value:string;onChange:(value:string)=>void;disabled:boolean}){
 const input=useRef<HTMLInputElement>(null);
 const [caret,setCaret]=useState<number|null>(null);
 function update(){
  const field=input.current;if(!field||document.activeElement!==field||field.selectionStart!==field.selectionEnd||disabled){setCaret(null);return}
  const context=document.createElement('canvas').getContext('2d')!;
  const css=getComputedStyle(field);context.font=`${css.fontWeight} ${css.fontSize} ${css.fontFamily}`;
  const full=context.measureText(field.value).width,prefix=context.measureText(field.value.slice(0,field.selectionStart??0)).width;
  setCaret(Math.max(2,Math.min(field.clientWidth-2,Math.max(0,(field.clientWidth-full)/2)+prefix-field.scrollLeft)));
 }
 useEffect(()=>{const field=input.current;if(!field)return;const observer=new ResizeObserver(update);observer.observe(field);void document.fonts.ready.then(update);update();return()=>observer.disconnect()},[value,disabled]);
 return <div className="futuro-input-wrap"><input ref={input} autoFocus aria-label="Your message" value={value} onChange={e=>onChange(e.target.value)} onSelect={update} onScroll={update} onFocus={update} onBlur={()=>setCaret(null)} required maxLength={5000} disabled={disabled} autoComplete="off" enterKeyHint="send"/>{caret!==null&&<span aria-hidden="true" className="futuro-dot-caret" style={{left:caret}}/>}</div>;
}
