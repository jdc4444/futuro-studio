'use client';
import Image from 'next/image';
import { useLayoutEffect, useRef, useState } from 'react';
import { BookMotion } from './book-motion';
import portfolioConfigs from './portfolio-configs.json';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const invitationNames=['Major Mono · lowercase','Raleway Dots · capitals','Raleway Thin · sentence case','Raleway Thin · spaced capitals'];
const pairings=['Original layouts','Major + Raleway','Dots + Raleway','Raleway + Major'];
const spreadNames=['Opening spread','Numbered index','Project narrative'];
function Preview({src,label,portrait=false}:{src:string;label:string;portrait?:boolean}) {
 return <figure className={portrait?'study portrait':'study'}><a href={src} target="_blank" rel="noreferrer" aria-label={`Open full-size ${label}`}><Image unoptimized src={src} alt={label} loading="lazy" width={portrait?637:1600} height={portrait?1000:1105}/></a><figcaption>{label}</figcaption></figure>
}
export function Invitations(){return <section className="study-page"><div className="study-heading"><h1>Invitations <span>04</span></h1><a href="/downloads/infinite-light-invitations.pdf" target="_blank" rel="noreferrer">Download PDF ↗</a></div><p className="study-note">Infinite Light · Fictional event, typography studies</p><div className="invitation-grid">{invitationNames.map((name,i)=><Preview key={name} portrait src={`/studies/invitation-${i+1}.webp`} label={`${String(i+1).padStart(2,'0')} / ${name}`}/>)}</div></section>}
function EarlierBooks(){return <section className="study-page"><div className="study-heading"><h1>Book layouts <span>12</span></h1><a href="/downloads/infinite-light-type-combinations.pdf" target="_blank" rel="noreferrer">All type combinations PDF ↗</a></div><p className="study-note">Generated text · Layout studies after <a href="https://www.emreparlak.com/work/9016" target="_blank" rel="noreferrer">9016 by Emre Parlak ↗</a></p><Tabs defaultValue="0" className="book-tabs"><TabsList variant="line" className="pairing-list" aria-label="Book type combinations">{pairings.map((name,i)=><TabsTrigger key={name} value={String(i)}>{name}</TabsTrigger>)}</TabsList>{pairings.map((name,i)=><TabsContent key={name} value={String(i)}><div className="spread-grid">{spreadNames.map((spread,j)=><Preview key={spread} src={i===0?`/studies/book-${j+1}.webp`:`/studies/combo-${(i===3?3:i-1)*3+j+1}.webp`} label={`${name} / ${spread}`}/>)}</div>{i===0&&<a className="original-download" href="/downloads/infinite-light-book-layouts.pdf" target="_blank" rel="noreferrer">Download original layouts PDF ↗</a>}</TabsContent>)}</Tabs></section>}

export function Books(){return <Tabs defaultValue="portfolio" className="book-collections"><TabsList variant="line" className="collection-switch" aria-label="Book collections"><TabsTrigger value="portfolio">Portfolio studies · 95</TabsTrigger><TabsTrigger value="earlier">Earlier layouts · 12</TabsTrigger></TabsList><TabsContent value="portfolio"><PortfolioStudies/></TabsContent><TabsContent value="earlier"><EarlierBooks/></TabsContent></Tabs>}
function PortfolioStudies(){
 const [selected,setSelected]=useState('1');
 const sectionRef=useRef<HTMLElement>(null);
 const position=useRef<{index:number;top:number;y:number}|null>(null);
 const config=portfolioConfigs.find(item=>String(item.id)===selected)!;
 function changeLayout(value:unknown){
  const section=sectionRef.current;
  const figures=Array.from(section?.querySelectorAll<HTMLElement>('.study')??[]);
  const barBottom=section?.querySelector('.portfolio-options')?.getBoundingClientRect().bottom??0;
  const index=figures.findIndex(figure=>figure.getBoundingClientRect().bottom>barBottom);
  position.current={index,top:index>=0?figures[index].getBoundingClientRect().top:0,y:window.scrollY};
  setSelected(String(value));
 }
 useLayoutEffect(()=>{
  const saved=position.current;
  if(!saved)return;
  const figure=sectionRef.current?.querySelectorAll('.study')[saved.index];
  window.scrollTo({top:figure?window.scrollY+figure.getBoundingClientRect().top-saved.top:saved.y,behavior:'instant'});
  position.current=null;
 },[selected]);
 return <section ref={sectionRef} className="study-page portfolio-page"><div className="study-heading"><h1>Portfolio type studies <span>95</span></h1><a href="/downloads/portfolio-type-studies.pdf" target="_blank" rel="noreferrer">Download 95 print spreads ↗</a></div><p className="study-note">Your biography, selected work, project credits and selected press quotes. Major Mono is always lowercase. Sentence case preserves names. Dots use a slightly heavier stroke for screen legibility.</p><Tabs value={selected} onValueChange={changeLayout}><TabsList variant="line" className="portfolio-options" aria-label="Type and case variations">{portfolioConfigs.map(config=><TabsTrigger key={config.id} value={String(config.id)} title={`${config.label} / ${config.detail}`}>{String(config.id).padStart(2,'0')}</TabsTrigger>)}</TabsList>{[config].map(config=><TabsContent keepMounted key="portfolio-preview" value={String(config.id)}><div className="pairing-description"><h2>{config.label.replace('Dots','Raleway Dots')}</h2><p>{config.detail.replace('Dots','Raleway Dots')}</p><p>Heading: {config.heading.replace('Dots','Raleway Dots')} · Text: {config.body.replace('Dots','Raleway Dots')}</p></div><div className="spread-grid">{['Biography','Selected work','Project credits','Full credits block','Quotes'].map((name,j)=><Preview key={name} src={j===4?`/studies/quotes-${config.id}.webp`:j===3?`/studies/credits-block-${config.id}.webp`:`/studies/portfolio-${(config.id-1)*3+j+1}.webp`} label={`${String(config.id).padStart(2,'0')} / ${name}`}/>)}<BookMotion config={config}/></div></TabsContent>)}</Tabs><p className="study-note">Copy from <a href="https://jdc4444.github.io/jdc_resume/" target="_blank" rel="noreferrer">your portfolio ↗</a> · Layout proportions after <a href="https://www.emreparlak.com/work/9016" target="_blank" rel="noreferrer">Emre Parlak’s 9016 ↗</a></p></section>}
