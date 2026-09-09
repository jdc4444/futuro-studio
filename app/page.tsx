"use client";
import {useState,useMemo,useEffect,type FormEvent} from 'react';
import {ContactInput} from './contact-input';
import {LightMotion} from './book-motion';
import {LightTypography} from './light-typography';
import {futuroTranslations} from './futuro-translations';
import weightFonts from './weight-fonts.json';
import coverage from './latin-font-coverage.json';
const languages = [
['en','English','Latin','infinite light'],
['ja','Japanese','Japanese','無限の光'],
['ar','Arabic','Arabic','نور لا نهائي'],
['hi','Hindi','Devanagari','अनंत प्रकाश'],
['zh-Hans','Chinese · simplified','Han','无限之光'],
['es','Spanish','Latin','luz infinita'],
['ko','Korean','Hangul','무한한 빛'],
['he','Hebrew','Hebrew','אור אינסופי'],
['fr','French','Latin','lumière infinie'],
['bn','Bengali','Bengali','অসীম আলো'],
['th','Thai','Thai','แสงอนันต์'],
['el','Greek','Greek','άπειρο φως'],
['fa','Persian','Arabic','نور بی‌نهایت'],
['de','German','Latin','unendliches Licht'],
['pt','Portuguese','Latin','luz infinita'],
['ur','Urdu','Arabic','لامحدود روشنی'],
['it','Italian','Latin','luce infinita'],
['pa','Punjabi','Gurmukhi','ਅਨੰਤ ਰੌਸ਼ਨੀ'],
['zh-Hant','Chinese · traditional','Han','無限之光'],
['uk','Ukrainian','Cyrillic','нескінченне світло'],
['ne','Nepali','Devanagari','अनन्त प्रकाश'],
['ro','Romanian','Latin','lumină infinită'],
['yo','Yoruba','Latin','ìmọ́lẹ̀ àìlópin'],
['kk','Kazakh','Cyrillic','шексіз жарық'],
['mn','Mongolian','Cyrillic','хязгааргүй гэрэл'],
['da','Danish','Latin','uendeligt lys'],
] as const;
export default function Home(){
 const [hover,setHover]=useState(false),[index,setIndex]=useState(0),[cycle,setCycle]=useState(0);
 const [view,setView]=useState<'home'|'information'|'contact'>('home');
 const [message,setMessage]=useState(''),[status,setStatus]=useState<'idle'|'sending'|'sent'|'error'>('idle'),[logoSize,setLogoSize]=useState(80);
 const [error,setError]=useState('');
 useEffect(()=>{const escape=(e:KeyboardEvent)=>{if(e.key==='Escape'&&status!=='sending')setView('home')};window.addEventListener('keydown',escape);return()=>window.removeEventListener('keydown',escape)},[status]);
 useEffect(()=>{if(status!=='sent')return;const timer=setTimeout(()=>{setView('home');setStatus('idle');setMessage('')},1800);return()=>clearTimeout(timer)},[status]);
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(!message.trim()||status==='sending'||status==='sent')return;
  setStatus('sending');setError('');
  try{
   const response=await fetch('https://formsubmit.co/ajax/jos@futuro.studio',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({message:message.trim(),_subject:'Futuro website message',_template:'basic',_url:window.location.origin}),signal:AbortSignal.timeout(20000)});
   const result=await response.json() as {success?:boolean|string;message?:string};
   if(!response.ok||(result.success!==true&&result.success!=='true')||/activat|confirm/i.test(result.message||''))throw new Error('Could not send yet. Please try again or email jos@futuro.studio.');
   setStatus('sent');
  }catch{setError('Could not send. Your message is saved here—try again, or email jos@futuro.studio.');setStatus('error')}
 }
 const entries=useMemo(()=>languages.map(([locale,,script])=>{const text=futuroTranslations[locale][0].toLocaleLowerCase(locale),native=Array.from(text.normalize('NFC')).every(c=>coverage['Raleway Dots'].includes(c.codePointAt(0)!));return {locale,script,text,family:native?'Raleway Dots':script==='Latin'?'Raleway':weightFonts[script as keyof typeof weightFonts],weight:native?400:300};}),[]);
 const resting=useMemo(()=>entries.map(e=>e.locale==='en'?{...e,text:'futuro'}:e),[entries]);
 useEffect(()=>{if(!hover)return;const timer=setInterval(()=>setIndex(i=>(i+1)%languages.length),1000/11.25);return()=>clearInterval(timer)},[hover]);
 return <><main className="experience with-motion light-layout-center futuro-surface">
 <button className="phrases single-phrase" style={{visibility:view==='home'?'visible':'hidden'}} tabIndex={view==='home'?0:-1} aria-hidden={view!=='home'} type="button" aria-label="futuro — hover for translations, click for another animation" onPointerEnter={e=>{if(e.pointerType==='mouse')setHover(true)}} onPointerLeave={()=>setHover(false)} onFocus={e=>{if(e.currentTarget.matches(':focus-visible'))setHover(true)}} onBlur={()=>setHover(false)} onClick={()=>setCycle(c=>c+1)}><LightTypography dotted onSize={setLogoSize} entries={hover?entries:resting} visible={[hover?languages[(index+1)%languages.length][0]:'en']} layout="center"/></button>
 <LightMotion cycle={cycle} outerOnly={view!=='home'} enabled onEnabled={()=>{}} layout="center" onLayout={()=>{}}/>
 {view==='information'&&<section className="futuro-info-copy" aria-label="About Futuro">
 <p>Futuro is an independent creative studio based in Brooklyn, New York. We work across film, music, fashion, documentary and visual identity.</p>
 <p>Our work begins with the real and follows it somewhere unexpected: a familiar place behaving differently, a portrait that opens onto a larger story, an imagined future made tangible.</p>
 <p>We develop and direct moving images for artists, brands and cultural institutions, bringing together live action, animation and emerging tools. Our speculative projects explore folklore, architecture, technology and the people who move between them.</p>
 </section>}
 {view==='contact'&&<form className="futuro-contact-form" onSubmit={submit} style={{fontSize:logoSize}} aria-label="Send a message">
 <ContactInput value={message} onChange={setMessage} disabled={status==='sending'||status==='sent'}/>
 <div className="futuro-form-note" aria-live="polite">{status==='sending'||status==='sent'?'Sending…':error}</div>
 </form>}
 </main>
 <button className="futuro-information" aria-pressed={view==='information'} onClick={()=>{setHover(false);setView(v=>v==='information'?'home':'information')}} disabled={status==='sending'}>Information</button>
 <button className="futuro-contact" aria-pressed={view==='contact'} onClick={()=>{setHover(false);setView(v=>v==='contact'?'home':'contact')}} disabled={status==='sending'}>Contact</button>
 <footer className="futuro-footer">Futuro LLC © Brooklyn, NY</footer><span className="futuro-year">MMXXVI</span></>;
}
