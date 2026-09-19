'use client';

import {useEffect,useRef,useState} from 'react';

// The opening screen's video backgrounds: five second clips with their look baked in, made in the studio from
// the macro board's pool (studio/tiles/scripts/publish_backgrounds.py) and published apart from this site, so
// the site stays light and the clips can change without a deploy. index.json there lists them.
// On a development machine the same folder is served next door (the studio's launcher, port 3124), and the m key
// tells the studio's Video library (port 3123) that the clip in view is no good: it then makes that background
// again from another smooth stretch of the clip, or drops a clip that has none left.
const PUBLISHED='https://jdc4444.github.io/futuro-backgrounds/';
const local=()=>/^(localhost|127\.0\.0\.1)$/.test(location.hostname);
const base=()=>local()?`${location.protocol}//${location.hostname}:3124/`:PUBLISHED;

// A clip comes in three sizes: src (H.264, long side 1600: every browser, the slowest connections), mid and big
// (HEVC 10-bit, long side 1920 and 2560; next to the studio's own 2560 the big one is hard to tell apart). Which one
// is asked for follows the browser (does it play HEVC smoothly), the screen (is it wide enough to show the difference)
// and the connection: what the browser says of it at first, then how fast the clips before really arrived.
type Size='src'|'mid'|'big';
type Clip={id:string;src:string;mid?:string;big?:string;bytes?:number;mid_bytes?:number;big_bytes?:number};
type Listed={clips?:Clip[];big_codec?:string};
const WEIGHT:Record<Size,number>={src:0.9e6,mid:1.0e6,big:1.5e6};   // bytes, when the list does not say
const weightOf=(clip:Clip,size:Size)=>(size==='src'?clip.bytes:size==='mid'?clip.mid_bytes:clip.big_bytes)??WEIGHT[size];

async function playsHevc(codec:string|undefined){
  if(!codec)return false;
  try{
    const verdict=await navigator.mediaCapabilities?.decodingInfo({type:'file',video:{contentType:codec,width:2560,height:1440,bitrate:3_000_000,framerate:24}});
    if(verdict)return verdict.supported&&verdict.smooth;
  }catch{/* an older browser: ask the element instead */}
  return document.createElement('video').canPlayType(codec)==='probably';
}

function shuffled<T>(list:T[]){
  const out=[...list];
  for(let i=out.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}
  return out;
}

// Two players take turns. The one in view plays its clip while the other loads the next; just before the end the next
// one starts, and the moment it is moving it takes the first one's place: a plain cut, no poster, no gap, no frozen
// frame. `skip` (the logo was clicked) and the right arrow bring the next clip at once, the left arrow the one before;
// on a development machine m marks the clip in view no good and cmd-Z takes the last mark back.
export function Backdrop({active,skip=0,onShowing}:{active:boolean;skip?:number;onShowing:(showing:boolean)=>void}) {
  const first=useRef<HTMLVideoElement>(null),second=useRef<HTMLVideoElement>(null);
  const [front,setFront]=useState(0);
  const [leaving,setLeaving]=useState(-1);
  const [showing,setShowing]=useState(false);
  const [started,setStarted]=useState(false);
  const [note,setNote]=useState('');
  const state=useRef({clips:[] as Clip[],queue:[] as Clip[],seen:[] as Clip[],at:-1,marked:[] as Clip[],root:'',front:0,active:false,hevc:false,mbps:0,changing:false,advance:(now?:boolean):boolean=>Boolean(now)&&false,step:(_by:number)=>{},mark:()=>{},unmark:()=>{}});

  useEffect(()=>{state.current.active=active;},[active]);
  useEffect(()=>{onShowing(showing);},[showing,onShowing]);

  useEffect(()=>{
    const s=state.current;
    const connection=(navigator as Navigator&{connection?:{saveData?:boolean;downlink?:number}}).connection;
    if(matchMedia('(prefers-reduced-motion: reduce)').matches||connection?.saveData)return;
    let gone=false,frame=0;
    const player=(n:number)=>(n?second:first).current;
    const next=()=>{if(!s.queue.length)s.queue=shuffled(s.clips);return s.queue.pop()!;};
    // the largest size that arrives in two of a clip's five seconds, as far as the screen can show it
    const sizeFor=(clip:Clip):Size=>{
      const wide=Math.max(innerWidth,innerHeight*16/9)*devicePixelRatio;
      const fits=(size:Size)=>weightOf(clip,size)*8/1e6/2<=s.mbps;
      if(s.hevc&&clip.big&&wide>2100&&fits('big'))return 'big';
      if(s.hevc&&clip.mid&&wide>1700&&fits('mid'))return 'mid';
      return 'src';
    };
    const byId=(id:string|undefined)=>s.clips.find(clip=>clip.id===id);
    const load=(video:HTMLVideoElement,wanted?:Clip)=>{
      const clip=wanted??next(),size=sizeFor(clip),began=performance.now();
      video.dataset.id=clip.id;video.dataset.again=String(Boolean(wanted));video.dataset.size=size;video.dataset.small=s.root+clip.src;
      video.addEventListener('canplaythrough',()=>{   // how fast it really came: the next choice leans on it
        const seconds=(performance.now()-began)/1000;
        if(seconds>0.05){const seen=weightOf(clip,size)*8/1e6/seconds;s.mbps=s.mbps?s.mbps*0.6+seen*0.4:seen;}
      },{once:true});
      video.src=s.root+(clip[size]??clip.src);video.load();
    };
    const change=(now=false)=>{
      const current=player(s.front),waiting=player(1-s.front);
      if(gone||s.changing||!current||!waiting||waiting.readyState<3||!s.active)return false;
      s.changing=true;waiting.currentTime=0;
      waiting.play().then(()=>{
        if(gone)return;
        const was=s.front;s.front=1-was;setLeaving(was);setFront(s.front);   // it moves: it takes the other's place, a plain cut
        const shown=byId(waiting.dataset.id);
        if(shown&&waiting.dataset.again!=='true'){s.seen=s.seen.slice(0,s.at+1);s.seen.push(shown);if(s.seen.length>60)s.seen.shift();s.at=s.seen.length-1;}   // what was seen, for the left arrow
        setTimeout(()=>{if(gone)return;current.pause();setLeaving(-1);load(current);s.changing=false;},now?80:120);
      }).catch(()=>{s.changing=false;});
      return true;
    };
    s.advance=change;
    // the arrows: right is the next clip (or the one after the clip gone back to), left the one before
    s.step=(by:number)=>{
      const to=s.at+by,waiting=player(1-s.front);
      if(by>0&&to>=s.seen.length){change(true);return;}
      if(to<0||!waiting||s.changing)return;
      s.at=to;load(waiting,s.seen[to]);
      waiting.addEventListener('canplay',()=>{change(true);},{once:true});
    };
    const watch=()=>{   // a little before the clip in view ends, the next takes over
      const current=player(s.front);
      if(current&&s.active&&!current.paused&&current.duration&&current.currentTime>=current.duration-0.12)change();
      frame=requestAnimationFrame(watch);
    };
    // m, on a development machine: the clip in view is no good
    s.mark=()=>{
      const current=player(s.front),id=current?.dataset.id;
      if(!local()||!id)return;
      fetch(`${location.protocol}//${location.hostname}:3123/api/noplay`,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({tid:id,from:'site'})})
        .then(r=>r.ok?r.json() as Promise<{shaky?:boolean}>:Promise.reject(new Error(String(r.status))))
        .then(answer=>{
          const clip=byId(id);if(clip)s.marked.push(clip);
          s.clips=s.clips.filter(clip=>clip.id!==id);s.queue=s.queue.filter(clip=>clip.id!==id);s.seen=s.seen.filter(clip=>clip.id!==id);s.at=Math.min(s.at,s.seen.length-1);
          setNote(answer.shaky?'no good: nothing smooth is left of this clip, it is out':'no good: the studio is making this background again from another stretch');
          change(true);
        }).catch(()=>setNote('not marked: the studio\'s Video library did not answer'));
      setTimeout(()=>setNote(''),4200);
    };
    // cmd-Z, on a development machine: the last mark is taken back, and the clip returns to the shuffle
    s.unmark=()=>{
      if(!local())return;
      fetch(`${location.protocol}//${location.hostname}:3123/api/noplay`,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({undo:true,from:'site'})})
        .then(r=>r.ok?r.json() as Promise<{ok?:boolean}>:Promise.reject(new Error(String(r.status))))
        .then(answer=>{const clip=s.marked.pop();if(answer.ok&&clip){s.clips.push(clip);s.queue.push(clip);}setNote(answer.ok?'the last mark is taken back':'there is no mark to take back');})
        .catch(()=>setNote('not undone: the studio\'s Video library did not answer'));
      setTimeout(()=>setNote(''),4200);
    };
    const begin=async()=>{
      try{
        s.root=base();
        const listed=await fetch(s.root+'index.json',{cache:'no-cache'}).then(r=>r.ok?r.json() as Promise<Listed>:null);
        if(gone||!listed?.clips?.length)return;
        s.clips=listed.clips;s.hevc=await playsHevc(listed.big_codec);
        s.mbps=connection?.downlink??5;   // what the browser says of the connection (Chromium only, and never above 10); elsewhere a middling guess until clips have been timed
        const [a,b]=[player(0),player(1)];
        if(gone||!a||!b)return;
        for(const video of [a,b]){
          video.addEventListener('ended',()=>{if(video===player(s.front)&&!change()){video.currentTime=0;video.play().catch(()=>{});}});   // the next is not ready: once more
          video.addEventListener('error',()=>{
            if(video.dataset.size!=='src'&&video.dataset.small){s.hevc=false;video.dataset.size='src';video.src=video.dataset.small;video.load();if(video===player(s.front)&&s.active)video.play().catch(()=>{});return;}   // it would not play here after all: the small ones, from now on
            if(video!==player(s.front))load(video);
          });
        }
        a.addEventListener('playing',()=>{setShowing(true);const shown=byId(a.dataset.id);if(shown&&s.at<0){s.seen=[shown];s.at=0;}},{once:true});
        load(a);load(b);setStarted(true);   // playing is the next effect's business: only while the opening screen is in view
        frame=requestAnimationFrame(watch);
      }catch{/* no backgrounds: the opening screen stays as it is */}
    };
    // after the page has settled: the wordmark and the sculpture come first
    const idle=(window as Window&{requestIdleCallback?:(run:()=>void,options?:{timeout:number})=>number}).requestIdleCallback;
    const timer=idle?idle(()=>{void begin();},{timeout:2500}):window.setTimeout(()=>{void begin();},1200);
    const [a,b]=[player(0),player(1)];
    return()=>{gone=true;cancelAnimationFrame(frame);if(!idle)clearTimeout(timer);for(const video of [a,b]){if(video){video.pause();video.removeAttribute('src');video.load();}}};
  },[]);

  // out of view (a project, About, Contact, another tab): the clip waits where it is
  useEffect(()=>{
    const video=(front?second:first).current;
    if(!video||!started)return;
    const sync=()=>{if(active&&!document.hidden)video.play().catch(()=>{});else video.pause();};
    sync();document.addEventListener('visibilitychange',sync);
    return()=>document.removeEventListener('visibilitychange',sync);
  },[active,front,started]);

  // the logo was clicked: another clip, at once
  const skipped=useRef(skip);
  useEffect(()=>{if(skip===skipped.current)return;skipped.current=skip;state.current.advance(true);},[skip]);

  useEffect(()=>{
    const key=(event:KeyboardEvent)=>{
      if(!state.current.active||(event.target as HTMLElement|null)?.closest?.('input,textarea,select,[contenteditable=true]'))return;
      const name=event.key.toLowerCase(),command=event.metaKey||event.ctrlKey;
      if(command&&name==='z'&&!event.shiftKey){event.preventDefault();state.current.unmark();return;}
      if(command||event.altKey)return;
      if(name==='m')state.current.mark();
      else if(name==='arrowright'){event.preventDefault();state.current.step(1);}
      else if(name==='arrowleft'){event.preventDefault();state.current.step(-1);}
    };
    window.addEventListener('keydown',key);
    return()=>window.removeEventListener('keydown',key);
  },[]);

  return <div className="futuro-backdrop" data-showing={showing} aria-hidden="true">
    <video ref={first} data-on={front===0} data-leaving={leaving===0} muted playsInline preload="auto" disablePictureInPicture tabIndex={-1}/>
    <video ref={second} data-on={front===1} data-leaving={leaving===1} muted playsInline preload="auto" disablePictureInPicture tabIndex={-1}/>
    {note&&<p className="futuro-backdrop-note">{note}</p>}
  </div>;
}
