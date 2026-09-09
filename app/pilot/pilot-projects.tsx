'use client';

import {useEffect,useLayoutEffect,useRef,useState,type CSSProperties,type RefObject} from 'react';
import {ResumeEntries} from '../resume-entries';
import {selectedProjects,type SelectedProject} from '../resume-selection';
import {anchoredScroll,loopDestination,projectExit} from './pilot-navigation';

function Preview({project,scrollRoot,suspended,onOpen,duplicate=false}:{
  project:SelectedProject;scrollRoot:RefObject<HTMLDivElement|null>;suspended:boolean;
  onOpen:()=>void;duplicate?:boolean;
}) {
  const video=useRef<HTMLVideoElement>(null);
  const button=useRef<HTMLButtonElement>(null);
  const [ready,setReady]=useState(false);
  useEffect(()=>{
    const film=video.current,stage=button.current;
    if(!film||!stage)return;
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    let visible=false,near=false,disposed=false;
    const sync=()=>{
      if(near&&!reduced.matches&&!film.getAttribute('src')){
        film.src=project.media.src;film.load();
      }
      if(visible&&!suspended&&!reduced.matches&&!document.hidden){
        film.muted=true;film.play().catch(()=>{});
      }else film.pause();
    };
    const preload=new IntersectionObserver(([entry])=>{
      near=entry.isIntersecting;
      if(!near){film.pause();film.removeAttribute('src');film.load();setReady(false);}
      else sync();
    },{root:scrollRoot.current,rootMargin:'100% 0px'});
    const playback=new IntersectionObserver(([entry])=>{
      visible=entry.isIntersecting;sync();
    },{root:scrollRoot.current,threshold:.05});
    const reveal=()=>{
      if('requestVideoFrameCallback' in film){
        film.requestVideoFrameCallback(()=>{if(!disposed)setReady(true);});
      }else setReady(true);
    };
    film.addEventListener('loadeddata',reveal);
    reduced.addEventListener('change',sync);
    document.addEventListener('visibilitychange',sync);
    preload.observe(stage);playback.observe(stage);
    return()=>{
      disposed=true;preload.disconnect();playback.disconnect();film.pause();
      film.removeEventListener('loadeddata',reveal);
      reduced.removeEventListener('change',sync);
      document.removeEventListener('visibilitychange',sync);
      film.removeAttribute('src');film.load();
    };
  },[project,scrollRoot,suspended]);
  return <button ref={button} className="pilot-preview" type="button" onClick={onOpen}
    aria-label={`Explore ${project.title}`} tabIndex={duplicate?-1:0}
    style={{'--pilot-preview-scale':Math.max(1,Number(project.media.scale)||1)} as CSSProperties}>
    <img className="pilot-poster" src={project.media.poster} alt="" aria-hidden="true" draggable={false}/>
    <video ref={video} className="pilot-preview-film" data-ready={ready} poster={project.media.poster}
      muted loop playsInline preload="none" aria-hidden="true" onError={()=>setReady(false)}/>
    <span className="pilot-title">{project.title.split(' — ').map((line,index)=><span key={index}>{line}</span>)}</span>
  </button>;
}

export function PilotProjects({suspended=false,onIntroChange}:{suspended?:boolean;onIntroChange:(visible:boolean)=>void}) {
  const scrollRoot=useRef<HTMLDivElement>(null);
  const intro=useRef<HTMLElement>(null);
  const cards=useRef<(HTMLElement|null)[]>([]);
  const end=useRef<HTMLElement>(null);
  const [expanded,setExpanded]=useState<number|null>(null);
  const expandedRef=useRef<number|null>(null);
  const pendingAnchor=useRef<{index:number;top:number}|null>(null);
  const visitedDetails=useRef(false);
  const lastScroll=useRef(0);
  const frame=useRef(0);
  const initialized=useRef(false);
  const last=selectedProjects.length-1;

  useLayoutEffect(()=>{
    const scroller=scrollRoot.current;
    if(!scroller)return;
    const anchor=pendingAnchor.current;
    if(anchor){
      const card=anchor.index===-1?intro.current:cards.current[anchor.index];
      if(card)scroller.scrollTop=anchoredScroll(scroller.scrollTop,anchor.top,card.getBoundingClientRect().top);
      pendingAnchor.current=null;
      if(document.activeElement===document.body)scroller.focus({preventScroll:true});
    }else if(!initialized.current){
      scroller.scrollTop=intro.current?.offsetTop||0;
      initialized.current=true;
    }
    expandedRef.current=expanded;
    lastScroll.current=scroller.scrollTop;
  },[expanded]);

  function open(index:number){
    onIntroChange(false);
    pendingAnchor.current={index,top:scrollRoot.current?.getBoundingClientRect().top||0};
    visitedDetails.current=false;
    // Only this project expands; all surrounding previews retain their order.
    setExpanded(index);
  }

  useEffect(()=>{
    const scroller=scrollRoot.current;
    if(!scroller)return;
    const collapse=(anchorIndex:number,top:number)=>{
      pendingAnchor.current={index:anchorIndex,top};
      expandedRef.current=null;setExpanded(null);
    };
    const inspect=()=>{
      frame.current=0;
      if(suspended)return;
      const y=scroller.scrollTop,delta=y-lastScroll.current;
      lastScroll.current=y;
      const height=scroller.clientHeight;
      onIntroChange(expandedRef.current===null&&(
        Math.abs(y-(intro.current?.offsetTop||0))<height*.5||
        Math.abs(y-(end.current?.offsetTop||Infinity))<height*.5
      ));
      const index=expandedRef.current;
      if(index!==null){
        const card=cards.current[index];
        if(!card)return;
        const bounds=card.getBoundingClientRect();
        const top=bounds.top-scroller.getBoundingClientRect().top;
        const bottom=top+bounds.height;
        if(top < -scroller.clientHeight*.3)visitedDetails.current=true;
        const exit=projectExit(top,bottom,delta,visitedDetails.current);
        if(exit==='next'){
          const next=cards.current[index+1];
          if(next)collapse(index+1,next.getBoundingClientRect().top);
          else{pendingAnchor.current={index:-1,top:scroller.getBoundingClientRect().top+bottom};expandedRef.current=null;setExpanded(null);}
        }else if(exit){
          collapse(index,bounds.top);
        }
        return;
      }
      const first=intro.current,final=cards.current[last];
      if(!first||!final||!end.current)return;
      const destination=loopDestination(y,first.offsetTop,final.offsetTop,end.current.offsetTop);
      if(destination!==null){scroller.scrollTop=destination;lastScroll.current=destination;}
    };
    const onScroll=()=>{if(!frame.current)frame.current=requestAnimationFrame(inspect);};
    scroller.addEventListener('scroll',onScroll,{passive:true});
    return()=>{scroller.removeEventListener('scroll',onScroll);cancelAnimationFrame(frame.current);frame.current=0;};
  },[last,suspended,onIntroChange]);

  useEffect(()=>{
    if(!suspended)return;
    const playing=[...scrollRoot.current!.querySelectorAll('video')].filter(video=>!video.paused);
    playing.forEach(video=>video.pause());
    return()=>{playing.filter(video=>video.isConnected).forEach(video=>video.play().catch(()=>{}));};
  },[suspended]);

  return <div ref={scrollRoot} className="pilot-scroll" aria-label="Selected projects" tabIndex={0}
    inert={suspended} data-suspended={suspended} onKeyDown={event=>{
      if(event.key!=='Escape'||expanded===null)return;
      event.preventDefault();
      pendingAnchor.current={index:expanded,top:scrollRoot.current?.getBoundingClientRect().top||0};
      setExpanded(null);
    }}>
    <section className="pilot-project pilot-loop-copy" aria-hidden="true">
      <Preview project={selectedProjects[last]} scrollRoot={scrollRoot} suspended={suspended} duplicate onOpen={()=>open(last)}/>
    </section>
    <section ref={intro} className="pilot-project pilot-intro" aria-label="Futuro"/>
    {selectedProjects.map((project,index)=><section key={project.route} ref={node=>{cards.current[index]=node;}}
      className="pilot-project" data-project-route={project.route} data-expanded={expanded===index}
      aria-label={project.title}>
      {expanded===index
        ? <div className="pilot-details"><ResumeEntries route={project.route} startMainMuted/></div>
        : <Preview project={project} scrollRoot={scrollRoot} suspended={suspended} onOpen={()=>open(index)}/>}
    </section>)}
    <section ref={end} className="pilot-project pilot-intro pilot-loop-copy" aria-hidden="true"/>
  </div>;
}
