"use client";
import {useState,useMemo,useEffect} from 'react';
import {Dialog,DialogTrigger,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
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
 const entries=useMemo(()=>languages.map(([locale,,script])=>{const text=futuroTranslations[locale][0].toLocaleLowerCase(locale),native=Array.from(text.normalize('NFC')).every(c=>coverage['Raleway Dots'].includes(c.codePointAt(0)!));return {locale,script,text,family:native?'Raleway Dots':script==='Latin'?'Raleway':weightFonts[script as keyof typeof weightFonts],weight:native?400:300};}),[]);
 const resting=useMemo(()=>entries.map(e=>e.locale==='en'?{...e,text:'futuro'}:e),[entries]);
 useEffect(()=>{if(!hover)return;const timer=setInterval(()=>setIndex(i=>(i+1)%languages.length),1000/15);return()=>clearInterval(timer)},[hover]);
 return <><main className="experience with-motion light-layout-center futuro-surface"><button className="phrases single-phrase" type="button" aria-label="futuro — hover for translations, click for another animation" onPointerEnter={e=>{if(e.pointerType==='mouse')setHover(true)}} onPointerLeave={()=>setHover(false)} onFocus={e=>{if(e.currentTarget.matches(':focus-visible'))setHover(true)}} onBlur={()=>setHover(false)} onClick={()=>setCycle(c=>c+1)}><LightTypography dotted entries={hover?entries:resting} visible={[hover?languages[(index+1)%languages.length][0]:'en']} layout="center"/></button><LightMotion cycle={cycle} enabled onEnabled={()=>{}} layout="center" onLayout={()=>{}}/></main>
 <Dialog><DialogTrigger className="futuro-information">Information</DialogTrigger><DialogContent className="futuro-dialog"><DialogTitle>futuro</DialogTitle><DialogDescription>Futuro is an independent creative studio based in Brooklyn, New York. We work across film, music, fashion, documentary and visual identity.</DialogDescription><p>Our work begins with the real and follows it somewhere unexpected: a familiar place behaving differently, a portrait that opens onto a larger story, an imagined future made tangible.</p><p>We develop and direct moving images for artists, brands and cultural institutions, bringing together live action, animation and emerging tools. Our speculative projects explore folklore, architecture, technology and the people who move between them.</p></DialogContent></Dialog>
 <a className="futuro-contact" href="mailto:jos@futuro.studio">Contact</a>
 <footer className="futuro-footer">Futuro LLC © Brooklyn NY</footer><span className="futuro-year">MMXXVI</span></>;
}
