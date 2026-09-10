'use client';

import {useEffect,useLayoutEffect,useRef,useState,type CSSProperties,type RefObject} from 'react';
import {ResumeEntries} from '../resume-entries';
import {selectedProjects,type SelectedProject} from '../resume-selection';
import {anchoredScroll,createScrollGestureGate,projectExit} from './pilot-navigation';

function Preview({project,scrollRoot,onOpen}:{
  project:SelectedProject;scrollRoot:RefObject<HTMLDivElement|null>;
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
      if(visible&&!reduced.matches&&!document.hidden){
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
  },[project,scrollRoot]);
  return <button ref={button} className="pilot-preview" type="button" onClick={onOpen}
    aria-label={`Explore ${project.title}`}
    style={{'--pilot-preview-scale':Math.max(1,Number(project.media.scale)||1)} as CSSProperties}>
    <img className="pilot-poster" src={project.media.poster} alt="" aria-hidden="true" draggable={false}/>
    <video ref={video} className="pilot-preview-film" data-ready={ready} poster={project.media.poster}
      muted loop playsInline preload="none" aria-hidden="true" onError={()=>setReady(false)}/>
    <span className="pilot-title">{project.title.split(' — ').map((line,index)=><span key={index}>{line}</span>)}</span>
  </button>;
}

export function PilotProjects({suspended=false,homeRequest=0,onIntroChange,onFootageChange,onOpenChange,onPreviewChange}:{suspended?:boolean;homeRequest?:number;onIntroChange:(visible:boolean)=>void;onFootageChange:(visible:boolean)=>void;onOpenChange:(open:boolean)=>void;onPreviewChange:()=>void}) {
  const scrollRoot=useRef<HTMLDivElement>(null);
  const intro=useRef<HTMLElement>(null);
  const cards=useRef<(HTMLElement|null)[]>([]);
  const details=useRef<HTMLDivElement>(null);
  const end=useRef<HTMLElement>(null);
  const [expanded,setExpanded]=useState<number|null>(null);
  const expandedRef=useRef<number|null>(null);
  const currentPreview=useRef(-1);
  const pendingAnchor=useRef<{index:number;enter:boolean}|null>(null);
  const lastScroll=useRef(0);
  const frame=useRef(0);
  const gesture=useRef(createScrollGestureGate());
  const touch=useRef<{startY:number;consumed:boolean}|null>(null);
  const animation=useRef(0);
  const wheelAnimation=useRef(0);
  const wheelTarget=useRef<number|null>(null);
  const wheelTiming=useRef({last:0,response:55});
  const travel=useRef<'preview'|'project'|'home'|null>(null);
  const handledHomeRequest=useRef(homeRequest);
  const refresh=useRef(()=>{});
  const last=selectedProjects.length-1;

  function selectPreview(index:number){
    if(currentPreview.current!==index)onPreviewChange();
    currentPreview.current=index;
  }

  function cancelWheelScroll(){
    cancelAnimationFrame(wheelAnimation.current);
    wheelAnimation.current=0;wheelTarget.current=null;
  }

  function cancelScroll(){
    cancelAnimationFrame(animation.current);
    animation.current=0;travel.current=null;
    cancelWheelScroll();
  }

  function elementTop(element:HTMLElement){
    const scroller=scrollRoot.current!;
    return anchoredScroll(scroller.scrollTop,scroller.getBoundingClientRect().top,element.getBoundingClientRect().top);
  }

  function scrollToElement(element:HTMLElement,kind:'preview'|'project'|'home',smooth=true,complete?:()=>void){
    const scroller=scrollRoot.current;
    if(!scroller)return;
    cancelScroll();
    const start=scroller.scrollTop;
    const finish=()=>{
      animation.current=0;travel.current=null;
      complete?.();refresh.current();
    };
    if(!smooth||matchMedia('(prefers-reduced-motion: reduce)').matches){
      scroller.scrollTop=elementTop(element);finish();return;
    }
    travel.current=kind;
    const distance=Math.abs(elementTop(element)-start)/scroller.clientHeight;
    const duration=kind==='preview'?580:Math.min(kind==='home'?1400:1000,Math.max(520,680+Math.log2(Math.max(.25,distance))*120));
    const began=performance.now();
    const step=(now:number)=>{
      const progress=Math.min(1,(now-began)/duration);
      // Continuous velocity and acceleration avoid a kick at either end
      // and the old abrupt acceleration change halfway through entry.
      const eased=progress*progress*progress*(progress*(progress*6-15)+10);
      scroller.scrollTop=start+(elementTop(element)-start)*eased;
      if(progress<1)animation.current=requestAnimationFrame(step);
      else finish();
    };
    animation.current=requestAnimationFrame(step);
  }

  function scrollToPreview(index:number,wrap=false,smooth=true){
    const card=wrap?end.current:index===-1?intro.current:cards.current[index];
    if(!card)return;
    selectPreview(index);
    scrollToElement(card,'preview',smooth,()=>{
      // Complete the loop as one transition before accepting another gesture.
      // The duplicate intro and the real intro share the same fixed artwork.
      if(wrap&&intro.current&&scrollRoot.current){
        scrollRoot.current.scrollTop=elementTop(intro.current);
        lastScroll.current=scrollRoot.current.scrollTop;
      }
      gesture.current.hold(performance.now(),true);
      if(touch.current)touch.current.consumed=true;
    });
  }

  function enterDetails(){
    if(details.current)scrollToElement(details.current,'project',true,()=>{
      details.current?.focus({preventScroll:true});
    });
  }

  function advance(direction:number){
    const next=currentPreview.current+direction;
    gesture.current.hold(performance.now());
    if(next< -1)return;
    scrollToPreview(next>last?-1:next,next>last);
  }

  function resetToPreview(index:number){
    cancelScroll();
    gesture.current.hold(performance.now());
    if(touch.current)touch.current.consumed=true;
    selectPreview(index);
    onIntroChange(index===-1);onFootageChange(index!==-1);
    pendingAnchor.current={index,enter:false};
    expandedRef.current=null;
    setExpanded(null);
  }

  function returnToPreview(){
    const index=expandedRef.current;
    if(index===null)return;
    const card=cards.current[index];
    if(card)scrollToElement(card,'project',true,()=>resetToPreview(index));
  }

  function returnToIntro(){
    const tile=intro.current,scroller=scrollRoot.current;
    if(!tile||!scroller)return;
    cancelScroll();gesture.current.hold(performance.now());
    if(touch.current)touch.current.consumed=true;
    selectPreview(-1);
    const finish=()=>{
      if(expandedRef.current!==null)resetToPreview(-1);
      else{gesture.current.hold(performance.now());onIntroChange(true);onFootageChange(false);}
      scroller.focus({preventScroll:true});
    };
    if(Math.abs(scroller.scrollTop-elementTop(tile))<.5){finish();return;}
    // Keep an open project mounted during the journey; remove it only after
    // reaching the intro so the return never jumps when page height changes.
    scrollToElement(tile,'home',true,finish);
  }

  useLayoutEffect(()=>{
    onOpenChange(expanded!==null);
    expandedRef.current=expanded;
    const scroller=scrollRoot.current,anchor=pendingAnchor.current;
    if(!scroller)return;
    if(anchor){
      // Keep the persistent tile fixed when inserting or removing its details.
      // On the downward exit, this also compensates for content removed above.
      const card=anchor.index===-1?intro.current:cards.current[anchor.index];
      if(card)scroller.scrollTop=elementTop(card);
      pendingAnchor.current=null;
      if(anchor.enter)enterDetails();
      else if(document.activeElement===document.body)scroller.focus({preventScroll:true});
    }
    lastScroll.current=scroller.scrollTop;
  },[expanded,onOpenChange]);

  function open(index:number){
    cancelScroll();gesture.current.release();
    selectPreview(index);
    onIntroChange(false);onFootageChange(false);
    if(expandedRef.current===index){enterDetails();return;}
    pendingAnchor.current={index,enter:true};
    expandedRef.current=index;
    setExpanded(index);
  }

  function scrollProject(amount:number,response:number){
    const scroller=scrollRoot.current,index=expandedRef.current;
    if(!scroller||index===null)return;
    const card=cards.current[index];
    if(!card)return;
    const top=elementTop(card),bottom=top+card.offsetHeight;
    const current=scroller.scrollTop;
    const remaining=(wheelTarget.current??current)-current;
    // Reverse immediately when the user changes direction, without dragging
    // along the remaining movement from the previous gesture.
    const base=remaining*amount<0?current:wheelTarget.current??current;
    wheelTarget.current=Math.max(top,Math.min(bottom,base+amount));
    wheelTiming.current.response=response;
    const apply=(next:number,edgeTop:number,edgeBottom:number)=>{
      scroller.scrollTop=next;
      if(next>=edgeBottom){resetToPreview(index===last?-1:index+1);return true;}
      if(next<=edgeTop){resetToPreview(index);return true;}
      return false;
    };
    if(matchMedia('(prefers-reduced-motion: reduce)').matches){
      const target=wheelTarget.current;cancelWheelScroll();apply(target,top,bottom);return;
    }
    if(wheelAnimation.current)return;
    wheelTiming.current.last=performance.now();
    const step=(now:number)=>{
      if(expandedRef.current!==index||wheelTarget.current===null){cancelWheelScroll();return;}
      const edgeTop=elementTop(card),edgeBottom=edgeTop+card.offsetHeight;
      const target=Math.max(edgeTop,Math.min(edgeBottom,wheelTarget.current));
      const elapsed=Math.min(64,Math.max(1,now-wheelTiming.current.last));
      wheelTiming.current.last=now;
      const next=scroller.scrollTop+(target-scroller.scrollTop)*(1-Math.exp(-elapsed/wheelTiming.current.response));
      const settled=Math.abs(target-next)<.25;
      if(apply(settled?target:next,edgeTop,edgeBottom))return;
      if(settled){cancelWheelScroll();refresh.current();}
      else wheelAnimation.current=requestAnimationFrame(step);
    };
    wheelAnimation.current=requestAnimationFrame(step);
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
      const index=expandedRef.current;
      if(index!==null){
        onIntroChange(false);onFootageChange(false);
        const card=cards.current[index];
        if(!card||travel.current==='project'||travel.current==='home')return;
        const bounds=card.getBoundingClientRect();
        const top=bounds.top-scroller.getBoundingClientRect().top;
        const exit=projectExit(top,top+bounds.height,delta);
        if(exit==='next')resetToPreview(index===last?-1:index+1);
        else if(exit==='preview')resetToPreview(index);
        return;
      }
      const inIntro=Math.abs(y-(intro.current?.offsetTop||0))<height*.5||
        Math.abs(y-(end.current?.offsetTop||Infinity))<height*.5;
      onIntroChange(inIntro);onFootageChange(!inIntro);
      if(!animation.current){
        const preview=currentPreview.current===-1?intro.current:cards.current[currentPreview.current];
        if(preview&&Math.abs(y-elementTop(preview))>.5){
          // Catch residual touch momentum at the exact, full-screen tile.
          scroller.scrollTop=elementTop(preview);
          return;
        }
      }
    };
    refresh.current=inspect;
    const onScroll=()=>{if(!frame.current)frame.current=requestAnimationFrame(inspect);};
    const interruptProjectScroll=()=>{
      if(travel.current!=='project')return;
      cancelScroll();gesture.current.release();
    };
    const onWheel=(event:WheelEvent)=>{
      if(suspended||event.ctrlKey||!event.deltaY)return;
      interruptProjectScroll();
      const amount=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?scroller.clientHeight:1);
      if(travel.current==='home'||travel.current==='preview'){
        const now=performance.now();
        // Track the whole momentum curve through the transition. Re-holding on
        // every event erased its peak and made gentle subsequent swipes stall.
        gesture.current.wheel(now,amount,true);
        event.preventDefault();return;
      }
      if(gesture.current.wheel(performance.now(),amount)){event.preventDefault();return;}
      const index=expandedRef.current;
      if(index===null){event.preventDefault();advance(amount>0?1:-1);return;}
      event.preventDefault();
      scrollProject(amount,event.deltaMode===0?55:90);
    };
    const onTouchStart=(event:TouchEvent)=>{
      if(suspended||event.touches.length!==1)return;
      if(travel.current==='home'||travel.current==='preview')return;
      interruptProjectScroll();cancelWheelScroll();gesture.current.release();
      touch.current={startY:event.touches[0].clientY,consumed:false};
    };
    const onTouchMove=(event:TouchEvent)=>{
      if(!suspended&&(travel.current==='home'||travel.current==='preview')){event.preventDefault();return;}
      if(suspended||event.touches.length!==1||!touch.current||expandedRef.current!==null)return;
      event.preventDefault();
      const distance=touch.current.startY-event.touches[0].clientY;
      if(!touch.current.consumed&&Math.abs(distance)>36){
        touch.current.consumed=true;advance(distance>0?1:-1);
      }
    };
    const onTouchEnd=()=>{touch.current=null;};
    const onKeyDown=(event:KeyboardEvent)=>{
      if(suspended)return;
      const target=event.target as HTMLElement;
      if(target.closest('input,textarea,select,[contenteditable=true]'))return;
      if(event.key===' '&&target.closest('button,a'))return;
      const direction=['ArrowDown','PageDown'].includes(event.key)||(event.key===' '&&!event.shiftKey)?1:
        ['ArrowUp','PageUp'].includes(event.key)||(event.key===' '&&event.shiftKey)?-1:0;
      if(travel.current==='home'||travel.current==='preview'){
        if(direction||event.key==='Home'||event.key==='End')event.preventDefault();
        return;
      }
      if(expandedRef.current!==null){
        if(direction||event.key==='Home'||event.key==='End'){interruptProjectScroll();cancelWheelScroll();}
        return;
      }
      if(direction){event.preventDefault();if(!event.repeat)advance(direction);}
      else if(event.key==='Home'||event.key==='End'){
        event.preventDefault();if(!event.repeat)scrollToPreview(event.key==='Home'?-1:last);
      }
    };
    const resize=new ResizeObserver(()=>{
      if(!suspended&&expandedRef.current===null&&!pendingAnchor.current&&!animation.current){
        scrollToPreview(currentPreview.current,false,false);
      }
    });
    resize.observe(scroller);
    scroller.addEventListener('scroll',onScroll,{passive:true});
    window.addEventListener('wheel',onWheel,{passive:false});
    window.addEventListener('touchstart',onTouchStart,{passive:true});
    window.addEventListener('touchmove',onTouchMove,{passive:false});
    window.addEventListener('touchend',onTouchEnd);
    window.addEventListener('touchcancel',onTouchEnd);
    window.addEventListener('keydown',onKeyDown);
    return()=>{
      resize.disconnect();refresh.current=()=>{};
      scroller.removeEventListener('scroll',onScroll);
      window.removeEventListener('wheel',onWheel);
      window.removeEventListener('touchstart',onTouchStart);
      window.removeEventListener('touchmove',onTouchMove);
      window.removeEventListener('touchend',onTouchEnd);
      window.removeEventListener('touchcancel',onTouchEnd);
      window.removeEventListener('keydown',onKeyDown);
      cancelAnimationFrame(frame.current);frame.current=0;
      cancelScroll();
    };
  },[last,suspended,onIntroChange,onFootageChange,onPreviewChange]);

  useEffect(()=>{
    if(suspended||homeRequest===handledHomeRequest.current)return;
    handledHomeRequest.current=homeRequest;
    returnToIntro();
  },[homeRequest,suspended]);

  useEffect(()=>{
    if(!suspended)return;
    const playing=[...scrollRoot.current!.querySelectorAll<HTMLVideoElement>('.pilot-details video')].filter(video=>!video.paused);
    playing.forEach(video=>video.pause());
    return()=>{playing.filter(video=>video.isConnected).forEach(video=>video.play().catch(()=>{}));};
  },[suspended]);

  return <div ref={scrollRoot} className="pilot-scroll" aria-label="Selected projects" tabIndex={0}
    inert={suspended} data-suspended={suspended} data-open-project={expanded!==null} onKeyDown={event=>{
      if(event.key!=='Escape'||expanded===null)return;
      event.preventDefault();returnToPreview();
    }}>
    <section ref={intro} className="pilot-project pilot-intro" aria-label="Futuro"/>
    {selectedProjects.map((project,index)=><section key={project.route} ref={node=>{cards.current[index]=node;}}
      className="pilot-project" data-project-route={project.route} data-expanded={expanded===index}
      aria-label={project.title} onFocus={event=>{
        if(expandedRef.current===null&&(event.target as HTMLElement).matches(':focus-visible')){
          scrollToPreview(index,false,false);
        }
      }}>
      <Preview project={project} scrollRoot={scrollRoot} onOpen={()=>open(index)}/>
      {expanded===index&&<div ref={details} className="pilot-details" tabIndex={-1}>
        <ResumeEntries route={project.route}/>
      </div>}
    </section>)}
    <section ref={end} className="pilot-project pilot-intro pilot-loop-copy" aria-hidden="true"/>
  </div>;
}
