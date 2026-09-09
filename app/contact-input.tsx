'use client';
import {useCallback,useEffect,useId,useLayoutEffect,useRef,useState} from 'react';
import {contactFontSize,contactHeight} from './contact-layout';

type Caret={left:number;top:number;height:number};

export function ContactInput({value,onChange,disabled,fontSize}:{value:string;onChange:(value:string)=>void;disabled:boolean;fontSize:number}){
 const input=useRef<HTMLTextAreaElement>(null);
 const mirror=useRef<HTMLDivElement>(null);
 const canvas=useRef<HTMLCanvasElement|null>(null);
 const [caret,setCaret]=useState<Caret|null>(null);
 const helpId=useId();

 const updateCaret=useCallback((reveal=false)=>{
  const field=input.current,copy=mirror.current;
  if(!field||!copy||document.activeElement!==field||field.selectionStart!==field.selectionEnd||field.readOnly){setCaret(null);return}
  const css=getComputedStyle(field);
  copy.style.width=`${field.clientWidth}px`;
  copy.style.fontSize=css.fontSize;
  copy.style.direction=css.direction;
  // Full text layout keeps centering, wrapping and mixed scripts aligned.
  // A zero-width tail gives a trailing newline its own caret position.
  copy.textContent=field.value+'\u200b';
  const text=copy.firstChild;
  if(!text){setCaret(null);return}
  const range=document.createRange();
  range.setStart(text,field.selectionStart);range.collapse(true);
  let rect=range.getClientRects()[0];
  if(!rect||!rect.height){
   const marker=document.createElement('span');
   marker.textContent=field.value.slice(field.selectionStart)||'\u200b';
   copy.replaceChildren(document.createTextNode(field.value.slice(0,field.selectionStart)),marker);
   rect=marker.getClientRects()[0];
  }
  if(!rect){setCaret(null);return}
  const box=copy.getBoundingClientRect(),lineTop=rect.top-box.top;
  const padTop=parseFloat(css.paddingTop)||0,padBottom=parseFloat(css.paddingBottom)||0;
  if(reveal){
   if(lineTop<field.scrollTop+padTop)field.scrollTop=Math.max(0,lineTop-padTop);
   else if(lineTop+rect.height>field.scrollTop+field.clientHeight-padBottom)field.scrollTop=lineTop+rect.height-field.clientHeight+padBottom;
  }
  const height=Math.min(rect.height,parseFloat(css.fontSize)*.85);
  const top=lineTop+(rect.height-height)/2-field.scrollTop;
  const left=rect.left-box.left-field.scrollLeft;
  if(top+height<=0||top>=field.clientHeight||left<0||left>field.clientWidth){setCaret(null);return}
  setCaret({left,top,height});
 },[]);

 const fit=useCallback((reveal=false)=>{
  const field=input.current;if(!field||!field.clientWidth)return;
  canvas.current??=document.createElement('canvas');
  const context=canvas.current.getContext('2d');
  const css=getComputedStyle(field),base=Math.max(18,fontSize);
  const horizontalPadding=(parseFloat(css.paddingLeft)||0)+(parseFloat(css.paddingRight)||0);
  const verticalPadding=(parseFloat(css.paddingTop)||0)+(parseFloat(css.paddingBottom)||0);
  const available=Math.max(1,field.clientWidth-horizontalPadding);
  let naturalWidth=0;
  if(context){
   context.font=`${css.fontStyle} ${css.fontWeight} ${base}px ${css.fontFamily}`;
   for(const line of field.value.split('\n'))naturalWidth=Math.max(naturalWidth,context.measureText(line).width);
  }
  const size=contactFontSize(base,available,naturalWidth);
  const previousScroll=field.scrollTop;
  field.style.fontSize=`${size}px`;
  field.style.height='0px';
  const lineHeight=parseFloat(getComputedStyle(field).lineHeight)||size*1.35;
  const viewportHeight=window.visualViewport?.height||window.innerHeight;
  const layout=contactHeight(field.scrollHeight,lineHeight,verticalPadding,viewportHeight);
  field.style.height=`${layout.height}px`;
  field.style.overflowY=layout.scrolls?'auto':'hidden';
  field.scrollTop=previousScroll;
  field.scrollLeft=0;
  updateCaret(reveal);
 },[fontSize,updateCaret]);

 useLayoutEffect(()=>{fit(true)},[value,disabled,fit]);
 useEffect(()=>{
  const field=input.current;if(!field)return;
  let frame=0,cancelled=false;
  const update=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>fit(document.activeElement===field))};
  const observer=new ResizeObserver(update);observer.observe(field);
  window.addEventListener('resize',update);
  window.visualViewport?.addEventListener('resize',update);
  document.fonts.addEventListener('loadingdone',update);
  void document.fonts.ready.then(()=>{if(!cancelled)update()});
  return()=>{
   cancelled=true;cancelAnimationFrame(frame);observer.disconnect();
   window.removeEventListener('resize',update);
   window.visualViewport?.removeEventListener('resize',update);
   document.fonts.removeEventListener('loadingdone',update);
  };
 },[fit]);

 return <div className="futuro-input-wrap">
  <div className="futuro-input-viewport">
   <textarea ref={input} className="futuro-message-field" autoFocus aria-label="Your message" aria-describedby={helpId} value={value} onChange={e=>onChange(e.target.value)} onSelect={()=>updateCaret()} onScroll={()=>updateCaret()} onFocus={()=>updateCaret(true)} onBlur={()=>setCaret(null)} onKeyDown={e=>{
    if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing&&e.nativeEvent.keyCode!==229){e.preventDefault();if(!disabled)e.currentTarget.form?.requestSubmit()}
   }} rows={1} wrap="soft" required readOnly={disabled} aria-busy={disabled} autoComplete="off" enterKeyHint="send"/>
   <div ref={mirror} className="futuro-input-mirror" aria-hidden="true"/>
   {caret!==null&&<span aria-hidden="true" className="futuro-dot-caret" style={caret}/>}
  </div>
  <span id={helpId} className="sr-only">Enter to send. Shift and Enter for a new line.</span>
 </div>;
}
