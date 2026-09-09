'use client';

import {useEffect,useLayoutEffect,useRef,useState,type CSSProperties,type RefObject} from 'react';
import {ResumeEntries} from '../resume-entries';
import {selectedProjects,type SelectedProject} from '../resume-selection';
import {createScrollGestureGate,loopDestination,projectExit} from './pilot-navigation';

function Preview({project,scrollRoot,suspended,onOpen}:{
  project:SelectedProject;scrollRoot:RefObject<HTMLDivElement|null>;suspended:boolean;
  onOpen:()=>void;
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
    aria-label={`Explore ${project.title}`}
    style={{'--pilot-preview-scale':Math.max(1,Number(project.media.scale)||1)} as CSSProperties}>
    <img className="pilot-poster" src={project.media.poster} alt="" aria-hidden="true" draggable={false}/>
    <video ref={video} className="pilot-preview-film" data-ready={ready} poster={project.media.poster}
      muted loop playsInline preload="none" aria-hidden="true" onError={()=>setReady(false)}/>
    <span className="pilot-title">{project.title.split(' — ').map((line,index)=><span key={index}>{line}</span>)}</span>
  </button>;
}

export function PilotProjects({suspended=false,onIntroChange,onFootageChange,onOpenChange,onPreviewChange}:{suspended?:boolean;onIntroChange:(visible:boolean)=>void;onFootageChange:(visible:boolean)=>void;onOpenChange:(open:boolean)=>void;onPreviewChange:()=>void}) {
  const scrollRoot=useRef<HTMLDivElement>(null);
  const intro=useRef<HTMLElement>(null);
  const cards=useRef<(HTMLElement|null)[]>([]);
  const end=useRef<HTMLElement>(null);
  const [expanded,setExpanded]=useState<number|null>(null);
  const expandedRef=useRef<number|null>(null);
  const currentPreview=useRef(-1);
  const pendingAnchor=useRef<{index:number}|null>(null);
  const visitedDetails=useRef(false);
  const lastScroll=useRef(0);
  const frame=useRef(0);
  const gesture=useRef(createScrollGestureGate());
  const touch=useRef<{startY:number;consumed:boolean}|null>(null);
  const destination=useRef<number|null>(null);
  const animation=useRef(0);
  const last=selectedProjects.length-1;

  function selectPreview(index:number){
    if(currentPreview.current!==index)onPreviewChange();
    currentPreview.current=index;
  }

  function scrollToPreview(index:number,wrap=false,smooth=true){
    const scroller=scrollRoot.current;
    const card=wrap?end.current:index===-1?intro.current:cards.current[index];
    if(!scroller||!card)return;
    cancelAnimationFrame(animation.current);
    selectPreview(index);
    const target=card.offsetTop,start=scroller.scrollTop;
    destination.current=target;
    if(!smooth||matchMedia('(prefers-reduced-motion: reduce)').matches){
      scroller.scrollTop=target;return;
    }
    // Own the transition from start to finish; native smooth scrolling and
    // scroll snapping can otherwise fight a subsequent gesture.
    const began=performance.now();
    const step=(now:number)=>{
      const progress=Math.min(1,(now-began)/420);
      scroller.scrollTop=start+(target-start)*(1-Math.pow(1-progress,3));
      animation.current=progress<1?requestAnimationFrame(step):0;
    };
    animation.current=requestAnimationFrame(step);
  }

  function advance(direction:number){
    const next=currentPreview.current+direction;
    gesture.current.hold();
    if(next< -1)return;
    scrollToPreview(next>last?-1:next,next>last);
  }

  function stopAtPreview(index:number){
    gesture.current.hold();
    if(touch.current)touch.current.consumed=true;
    selectPreview(index);
    pendingAnchor.current={index};
    expandedRef.current=null;
    setExpanded(null);
  }

  useLayoutEffect(()=>{
    onOpenChange(expanded!==null);
    const scroller=scrollRoot.current;
    if(!scroller)return;
    const anchor=pendingAnchor.current;
    if(anchor){
      // Collapsing content above this preview must not carry any momentum or
      // overshoot into another project.
      scrollToPreview(anchor.index,false,false);
      pendingAnchor.current=null;
      if(document.activeElement===document.body)scroller.focus({preventScroll:true});
    }
    expandedRef.current=expanded;
    lastScroll.current=scroller.scrollTop;
  },[expanded,onOpenChange]);

  function open(index:number){
    gesture.current.release();
    destination.current=null;
    currentPreview.current=index;
    onIntroChange(false);onFootageChange(true);
    pendingAnchor.current={index};
    visitedDetails.current=false;
    setExpanded(index);
  }

  useEffect(()=>{
    const scroller=scrollRoot.current;
    if(!scroller)return;
    const inspect=()=>{
      frame.current=0;
      if(suspended||pendingAnchor.current)return;
      const y=scroller.scrollTop,delta=y-lastScroll.current;
      lastScroll.current=y;
      const height=scroller.clientHeight;
      const inIntro=expandedRef.current===null&&(
        Math.abs(y-(intro.current?.offsetTop||0))<height*.5||
        Math.abs(y-(end.current?.offsetTop||Infinity))<height*.5
      );
      onIntroChange(inIntro);
      const index=expandedRef.current;
      if(index!==null){
        const card=cards.current[index];
        if(!card)return;
        const bounds=card.getBoundingClientRect();
        const top=bounds.top-scroller.getBoundingClientRect().top;
        onFootageChange(top>-height*.5);
        if(top < -height*.3)visitedDetails.current=true;
        const exit=projectExit(top,top+bounds.height,delta,visitedDetails.current);
        if(exit==='next')stopAtPreview(index===last?-1:index+1);
        else if(exit==='previous')stopAtPreview(index-1);
        else if(exit==='preview')stopAtPreview(index);
        return;
      }
      onFootageChange(!inIntro);
      if(intro.current&&end.current&&loopDestination(y,intro.current.offsetTop,end.current.offsetTop)!==null){
        scrollToPreview(-1,false,false);
        gesture.current.hold();
        onIntroChange(true);onFootageChange(false);
      }else if(destination.current!==null){
        if(Math.abs(y-destination.current)<2)destination.current=null;
      }else{
        currentPreview.current=Math.max(-1,Math.min(last,Math.round(y/height)-1));
      }
    };
    const onScroll=()=>{if(!frame.current)frame.current=requestAnimationFrame(inspect);};
    const onWheel=(event:WheelEvent)=>{
      if(suspended||event.ctrlKey||!event.deltaY)return;
      const unit=event.deltaMode===1?16:event.deltaMode===2?scroller.clientHeight:1;
      const amount=event.deltaY*unit;
      if(gesture.current.wheel(performance.now(),amount)){event.preventDefault();return;}
      const index=expandedRef.current;
      if(index===null){
        event.preventDefault();advance(event.deltaY>0?1:-1);return;
      }
      const card=cards.current[index];
      if(!card)return;
      const nextY=scroller.scrollTop+amount;
      if(nextY>=card.offsetTop+card.offsetHeight){
        event.preventDefault();stopAtPreview(index===last?-1:index+1);
      }else if(amount<0&&nextY<=card.offsetTop){
        event.preventDefault();stopAtPreview(visitedDetails.current?index:index-1);
      }else if(!scroller.contains(event.target as Node)){
        event.preventDefault();scroller.scrollTop=nextY;
      }
    };
    const onTouchStart=(event:TouchEvent)=>{
      if(suspended||event.touches.length!==1)return;
      gesture.current.release();
      touch.current={startY:event.touches[0].clientY,consumed:false};
    };
    const onTouchMove=(event:TouchEvent)=>{
      if(suspended||event.touches.length!==1||!touch.current||expandedRef.current!==null)return;
      event.preventDefault();
      const distance=touch.current.startY-event.touches[0].clientY;
      if(!touch.current.consumed&&Math.abs(distance)>36){
        touch.current.consumed=true;advance(distance>0?1:-1);
      }
    };
    const onTouchEnd=()=>{touch.current=null;};
    const onKeyDown=(event:KeyboardEvent)=>{
      if(suspended||expandedRef.current!==null)return;
      const target=event.target as HTMLElement;
      if(target.closest('input,textarea,select,[contenteditable=true]'))return;
      if(event.key===' '&&target.closest('button,a'))return;
      const direction=['ArrowDown','PageDown'].includes(event.key)||(event.key===' '&&!event.shiftKey)?1:
        ['ArrowUp','PageUp'].includes(event.key)||(event.key===' '&&event.shiftKey)?-1:0;
      if(direction){event.preventDefault();if(!event.repeat)advance(direction);}
      else if(event.key==='Home'||event.key==='End'){
        event.preventDefault();if(!event.repeat)scrollToPreview(event.key==='Home'?-1:last);
      }
    };
    scroller.addEventListener('scroll',onScroll,{passive:true});
    window.addEventListener('wheel',onWheel,{passive:false});
    window.addEventListener('touchstart',onTouchStart,{passive:true});
    window.addEventListener('touchmove',onTouchMove,{passive:false});
    window.addEventListener('touchend',onTouchEnd);
    window.addEventListener('touchcancel',onTouchEnd);
    window.addEventListener('keydown',onKeyDown);
    return()=>{
      scroller.removeEventListener('scroll',onScroll);
      window.removeEventListener('wheel',onWheel);
      window.removeEventListener('touchstart',onTouchStart);
      window.removeEventListener('touchmove',onTouchMove);
      window.removeEventListener('touchend',onTouchEnd);
      window.removeEventListener('touchcancel',onTouchEnd);
      window.removeEventListener('keydown',onKeyDown);
      cancelAnimationFrame(frame.current);frame.current=0;
      cancelAnimationFrame(animation.current);animation.current=0;
    };
  },[last,suspended,onIntroChange,onFootageChange,onPreviewChange]);

  useEffect(()=>{
    if(!suspended)return;
    const playing=[...scrollRoot.current!.querySelectorAll('video')].filter(video=>!video.paused);
    playing.forEach(video=>video.pause());
    return()=>{playing.filter(video=>video.isConnected).forEach(video=>video.play().catch(()=>{}));};
  },[suspended]);

  return <div ref={scrollRoot} className="pilot-scroll" aria-label="Selected projects" tabIndex={0}
    inert={suspended} data-suspended={suspended} data-open-project={expanded!==null} onKeyDown={event=>{
      if(event.key!=='Escape'||expanded===null)return;
      event.preventDefault();stopAtPreview(expanded);
    }}>
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
