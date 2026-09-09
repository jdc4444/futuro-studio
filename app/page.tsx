"use client";
import {useState,useMemo,useEffect,useRef,useCallback,type FormEvent} from 'react';
import {ContactInput} from './contact-input';
import {LightMotion} from './book-motion';
import {LightTypography} from './light-typography';
import {ResumeEntries} from './resume-entries';
import {PilotProjects} from './pilot/pilot-projects';
import './pilot/pilot.css';
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
export default function Home({pilot=true}:{pilot?:boolean}={}){
 const [hover,setHover]=useState(false),[index,setIndex]=useState(0),[cycle,setCycle]=useState(0);
 const [view,setView]=useState<'home'|'information'|'contact'>('home');
 const [message,setMessage]=useState(''),[status,setStatus]=useState<'idle'|'sending'|'sent'|'error'>('idle'),[logoSize,setLogoSize]=useState(80);
 const [error,setError]=useState('');
 const [theme,setTheme]=useState<'dark'|'light'>('dark');
 const [heroVisible,setHeroVisible]=useState(true);
 const [pilotIntro,setPilotIntro]=useState(true);
 const [pilotFootage,setPilotFootage]=useState(false);
 const [pilotOpen,setPilotOpen]=useState(false);
 const [pilotCameraStep,setPilotCameraStep]=useState(0);
 const [homeRequest,setHomeRequest]=useState(0);
 const projectIsOpen=pilot&&pilotOpen&&view==='home';
 const surfaceTheme=projectIsOpen?'light':theme;
 const shiftPilotCamera=useCallback(()=>setPilotCameraStep(step=>step+1),[]);
 const hero=useRef<HTMLDivElement>(null);
 function openView(next:'information'|'contact'){
  setHover(false);setView(v=>v===next?'home':next);
  if(!pilot)hero.current?.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
 }
 function returnHome(){
  setHover(false);setView('home');
  if(pilot)setHomeRequest(request=>request+1);
  else hero.current?.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
 }
 useEffect(()=>{const observer=new IntersectionObserver(([entry])=>setHeroVisible(entry.isIntersecting));if(hero.current)observer.observe(hero.current);return()=>observer.disconnect()},[]);
 useEffect(()=>{const escape=(e:KeyboardEvent)=>{if(e.key==='Escape'&&status!=='sending')setView('home')};window.addEventListener('keydown',escape);return()=>window.removeEventListener('keydown',escape)},[status]);
 useEffect(()=>{if(status!=='sent')return;const timer=setTimeout(()=>{setView('home');setStatus('idle');setMessage('')},1800);return()=>clearTimeout(timer)},[status]);
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(!message.trim()||status==='sending'||status==='sent')return;
  setStatus('sending');setError('');
  try{
   const response=await fetch('https://formsubmit.co/ajax/jos@futuro.studio',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({message:message.trim(),_subject:'Futuro website message',_template:'basic',_url:'https://www.futuro.studio/'}),signal:AbortSignal.timeout(20000)});
   const result=await response.json() as {success?:boolean|string;message?:string};
   if(!response.ok||(result.success!==true&&result.success!=='true')||/activat|confirm/i.test(result.message||''))throw new Error('Could not send yet. Please try again or email jos@futuro.studio.');
   setStatus('sent');
  }catch{setError('Could not send. Your message is still here.');setStatus('error')}
 }
 const entries=useMemo(()=>languages.map(([locale,,script])=>{const text=futuroTranslations[locale][0].toLocaleLowerCase(locale),native=Array.from(text.normalize('NFC')).every(c=>coverage['Raleway Dots'].includes(c.codePointAt(0)!));return {locale,script,text,family:native?'Raleway Dots':script==='Latin'?'Raleway':weightFonts[script as keyof typeof weightFonts],weight:native?400:300};}),[]);
 const resting=useMemo(()=>entries.map(e=>e.locale==='en'?{...e,text:'futuro'}:e),[entries]);
 useEffect(()=>{if(!hover)return;const timer=setInterval(()=>setIndex(i=>(i+1)%languages.length),1000/11.25);return()=>clearInterval(timer)},[hover]);
 return <div className={`futuro-site${pilot?' futuro-pilot':''}`} data-theme={theme} data-view={view} data-pilot-intro={pilotIntro} data-pilot-footage={pilotFootage} data-pilot-open={pilotOpen}><div className="futuro-hero" ref={hero}><div className="experience with-motion light-layout-center futuro-surface">
 <button className="phrases single-phrase" style={{visibility:view==='home'&&(!pilot||pilotIntro)?'visible':'hidden'}} tabIndex={view==='home'&&(!pilot||pilotIntro)?0:-1} aria-hidden={view!=='home'||(pilot&&!pilotIntro)} type="button" aria-label="futuro — hover for translations, click for another animation" onPointerEnter={e=>{if(e.pointerType==='mouse')setHover(true)}} onPointerLeave={()=>setHover(false)} onFocus={e=>{if(e.currentTarget.matches(':focus-visible'))setHover(true)}} onBlur={()=>setHover(false)} onClick={()=>setCycle(c=>c+1)}><LightTypography dotted onSize={setLogoSize} entries={hover?entries:resting} visible={[hover?languages[(index+1)%languages.length][0]:'en']} layout="center"/></button>
 <LightMotion cycle={cycle} cameraStep={pilotCameraStep} dragOnParent={pilot&&pilotIntro&&view==='home'} outerOnly={(pilot&&!pilotIntro)||view!=='home'} active={pilot?(!pilotOpen||view!=='home'):heroVisible} enabled onEnabled={()=>{}} layout="center" onLayout={()=>{}}/>
 {view==='information'&&<section className="futuro-info-copy" aria-label="About Futuro">
 <p>Futuro is an independent creative studio based in Brooklyn, New York. We work across film, music, fashion, documentary and visual identity.</p>
 <p>Our work begins with the real and follows it somewhere unexpected: a familiar place behaving differently, a portrait that opens onto a larger story, an imagined future made tangible.</p>
 <p>We develop and direct moving images for artists, brands and cultural institutions, bringing together live action, animation and emerging tools. Our speculative projects explore folklore, architecture, technology and the people who move between them.</p>
 </section>}
 {view==='contact'&&<form className="futuro-contact-form" onSubmit={submit} style={{fontSize:logoSize}} aria-label="Send a message">
 <ContactInput value={message} onChange={setMessage} disabled={status==='sending'||status==='sent'} fontSize={logoSize}/>
 <div className="futuro-form-note" aria-live="polite">{status==='sending'?'Sending…':status==='sent'?'Sent.':error}{status==='error'&&<> <a href={`mailto:jos@futuro.studio?subject=${encodeURIComponent('Futuro website message')}&body=${encodeURIComponent(message)}`}>Email this message</a></>}</div>
 </form>}
 </div></div>
 <button className="futuro-information" aria-pressed={view==='information'} onClick={()=>openView('information')} disabled={status==='sending'}>Information</button>
 <button className="futuro-contact" aria-pressed={view==='contact'} onClick={()=>openView('contact')} disabled={status==='sending'}>Contact</button>
 <footer className="futuro-footer"><button className="futuro-home-link" type="button" aria-label="Back to Futuro" onClick={returnHome}>Futuro LLC © Brooklyn, NY</button></footer><button className="futuro-year" type="button" disabled={projectIsOpen} aria-label={projectIsOpen?'Project pages use light mode':`Switch to ${theme==='dark'?'light':'dark'} mode`} aria-pressed={surfaceTheme==='light'} onClick={()=>setTheme(t=>t==='dark'?'light':'dark')}>MMXXVI</button><main>{pilot?<PilotProjects homeRequest={homeRequest} suspended={view!=='home'} onIntroChange={setPilotIntro} onFootageChange={setPilotFootage} onOpenChange={setPilotOpen} onPreviewChange={shiftPilotCamera}/>:<ResumeEntries/>}</main></div>;
}
