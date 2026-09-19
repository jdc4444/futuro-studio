'use client';

import {useEffect,useRef,useState} from 'react';

// The opening screen's video backgrounds: five second clips with their look baked in, made in the studio from
// the macro board's pool (studio/tiles/scripts/publish_backgrounds.py) and published apart from this site, so
// the site stays light and the clips can change without a deploy. index.json there lists them.
// On a development machine the same folder is served next door (the studio's launcher, port 3124).
const PUBLISHED='https://jdc4444.github.io/futuro-backgrounds/';
const base=()=>/^(localhost|127\.0\.0\.1)$/.test(location.hostname)?`${location.protocol}//${location.hostname}:3124/`:PUBLISHED;

// A clip comes in two sizes: src (H.264, long side 1600: every browser, small screens) and big (HEVC 10-bit, long side
// 2560: next to the studio's own 2560 it is hard to tell apart). The big one is for a screen wide enough to show the
// difference, in a browser that says it plays it smoothly; if one still fails to play, this visit stays with the small.
type Clip={id:string;src:string;big?:string};
type Listed={clips?:Clip[];big_codec?:string};

async function wantsBig(codec:string|undefined){
  if(!codec||Math.max(innerWidth,innerHeight)*devicePixelRatio<1750)return false;
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

// Two players take turns: the one in view plays its clip while the other loads the next, and they change places
// only when the next has a frame to show, so there is never a poster, a gap or a clip in another shape.
export function Backdrop({active,onShowing}:{active:boolean;onShowing:(showing:boolean)=>void}) {
  const first=useRef<HTMLVideoElement>(null),second=useRef<HTMLVideoElement>(null);
  const [front,setFront]=useState(0);
  const [showing,setShowing]=useState(false);
  const [started,setStarted]=useState(false);
  const state=useRef({clips:[] as Clip[],queue:[] as Clip[],root:'',front:0,active:false,big:false});
  useEffect(()=>{state.current.active=active;},[active]);
  useEffect(()=>{onShowing(showing);},[showing,onShowing]);

  useEffect(()=>{
    const s=state.current;
    const connection=(navigator as Navigator&{connection?:{saveData?:boolean}}).connection;
    if(matchMedia('(prefers-reduced-motion: reduce)').matches||connection?.saveData)return;
    let gone=false;
    const player=(n:number)=>(n?second:first).current;
    const next=()=>{if(!s.queue.length)s.queue=shuffled(s.clips);return s.queue.pop()!;};
    const load=(video:HTMLVideoElement)=>{const clip=next(),file=s.big&&clip.big?clip.big:clip.src;video.dataset.big=String(file===clip.big);video.dataset.small=s.root+clip.src;video.src=s.root+file;video.load();};
    const swap=()=>{
      const showingNow=player(s.front),waiting=player(1-s.front);
      if(gone||!showingNow||!waiting)return;
      if(waiting.readyState<3){showingNow.currentTime=0;showingNow.play().catch(()=>{});return;}   // the next is not ready: once more
      s.front=1-s.front;setFront(s.front);
      if(s.active)waiting.play().catch(()=>{});
      setTimeout(()=>{if(!gone)load(showingNow);},400);   // after the cross-fade, the one that left loads the clip after
    };
    const begin=async()=>{
      try{
        s.root=base();
        const listed=await fetch(s.root+'index.json').then(r=>r.ok?r.json() as Promise<Listed>:null);
        if(gone||!listed?.clips?.length)return;
        s.clips=listed.clips;s.big=await wantsBig(listed.big_codec);
        if(gone)return;
        const [a,b]=[player(0),player(1)];
        if(!a||!b)return;
        for(const video of [a,b]){video.addEventListener('ended',()=>{if(video===player(s.front))swap();});video.addEventListener('error',()=>{
          if(video.dataset.big==='true'&&video.dataset.small){s.big=false;video.dataset.big='false';video.src=video.dataset.small;video.load();if(video===player(s.front)&&s.active)video.play().catch(()=>{});return;}   // the big one would not play here after all: the small one, from now on
          if(video!==player(s.front))load(video);else swap();
        });}
        a.addEventListener('playing',()=>setShowing(true),{once:true});
        load(a);load(b);setStarted(true);   // playing is the next effect's business: only while the opening screen is in view
      }catch{/* no backgrounds: the opening screen stays as it is */}
    };
    // after the page has settled: the wordmark and the sculpture come first
    const idle=(window as Window&{requestIdleCallback?:(run:()=>void,options?:{timeout:number})=>number}).requestIdleCallback;
    const timer=idle?idle(()=>{void begin();},{timeout:2500}):window.setTimeout(()=>{void begin();},1200);
    const [a,b]=[player(0),player(1)];
    return()=>{gone=true;if(!idle)clearTimeout(timer);for(const video of [a,b]){if(video){video.pause();video.removeAttribute('src');video.load();}}};
  },[]);

  // out of view (a project, About, Contact, another tab): the clip waits where it is
  useEffect(()=>{
    const video=(front?second:first).current;
    if(!video||!started)return;
    const sync=()=>{if(active&&!document.hidden)video.play().catch(()=>{});else video.pause();};
    sync();document.addEventListener('visibilitychange',sync);
    return()=>document.removeEventListener('visibilitychange',sync);
  },[active,front,started]);

  return <div className="futuro-backdrop" data-showing={showing} aria-hidden="true">
    <video ref={first} data-on={front===0} muted playsInline preload="auto" disablePictureInPicture tabIndex={-1}/>
    <video ref={second} data-on={front===1} muted playsInline preload="auto" disablePictureInPicture tabIndex={-1}/>
  </div>;
}
