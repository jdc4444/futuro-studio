'use client';

import {useEffect,useRef,useState} from 'react';

// The opening screen's video backgrounds: five second clips with their look baked in, made in the studio from
// the macro board's pool (studio/tiles/scripts/publish_backgrounds.py) and published apart from this site, so
// the site stays light and the clips can change without a deploy. index.json there lists them.
// On a development machine the same folder is served next door (the studio's launcher, port 3124), and the m key
// tells the studio's Video library (port 3123) that the clip in view is no good: it then makes that background
// again from another smooth stretch of the clip, or drops a clip that has none left. cmd-Z takes the last mark
// back: the studio puts the background back as it was, and the clip returns to the screen. Beside m, n and , are the
// smaller remedy: the clip is good but its ending (n), or its beginning (,), is messy, so its five seconds are taken a
// second earlier, or later; the clip stays in view and plays from its new start as soon as the studio has made it.
const PUBLISHED='https://jdc4444.github.io/futuro-backgrounds/';
const local=()=>/^(localhost|127\.0\.0\.1)$/.test(location.hostname);
const base=()=>local()?`${location.protocol}//${location.hostname}:3124/`:PUBLISHED;

// A clip comes in three sizes: src (H.264, long side 1600: every browser, the slowest connections), mid and big
// (HEVC 10-bit, long side 1920 and 2560; next to the studio's own 2560 the big one is hard to tell apart). Which one
// is asked for follows the browser (does it play HEVC smoothly), the screen (is it wide enough to show the difference)
// and the connection: what the browser says of it at first, then how fast the clips before really arrived.
type Size='src'|'mid'|'big';
type Clip={id:string;src:string;mid?:string;big?:string;bytes?:number;mid_bytes?:number;big_bytes?:number;at?:number};   // at: where in its clip the snippet starts
type Answer={ok?:boolean;error?:string;shaky?:boolean;tid?:string;at?:number|null;shown?:number};   // the studio, to a mark, a nudge, or a mark taken back
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
// on a development machine m marks the clip in view no good and cmd-Z takes the last mark back, which brings its clip
// back into view as soon as the studio has its background in place again.
export function Backdrop({active,skip=0,onShowing}:{active:boolean;skip?:number;onShowing:(showing:boolean)=>void}) {
  const first=useRef<HTMLVideoElement>(null),second=useRef<HTMLVideoElement>(null);
  const [front,setFront]=useState(0);
  const [leaving,setLeaving]=useState(-1);
  const [showing,setShowing]=useState(false);
  const [started,setStarted]=useState(false);
  const [note,setNote]=useState('');
  const state=useRef({clips:[] as Clip[],queue:[] as Clip[],seen:[] as Clip[],at:-1,aim:null as number|null,asked:0,waits:{} as Record<string,number>,hold:null as string|null,root:'',front:0,active:false,hevc:false,mbps:0,changing:false,advance:(now?:boolean):boolean=>Boolean(now)&&false,step:(_by:number)=>{},mark:()=>{},nudge:(_by:number)=>{},unmark:()=>{}});

  useEffect(()=>{state.current.active=active;},[active]);
  useEffect(()=>{onShowing(showing);},[showing,onShowing]);

  useEffect(()=>{
    const s=state.current;
    const connection=(navigator as Navigator&{connection?:{saveData?:boolean;downlink?:number}}).connection;
    if(matchMedia('(prefers-reduced-motion: reduce)').matches||connection?.saveData)return;
    // a fresh start, every time this mounts: a hot reload during development keeps the object of the version before it,
    // which may lack what this one counts with, or be left in the middle of a change that will never finish
    Object.assign(s,{queue:[],seen:[],at:-1,aim:null,asked:0,waits:{},hold:null,changing:false});
    let gone=false,frame=0,noted=0;
    const off=new AbortController();   // what this mount listens to on the two players stops with it (they outlive a hot reload)
    const say=(text:string,ms=4200)=>{window.clearTimeout(noted);setNote(text);if(text&&ms)noted=window.setTimeout(()=>setNote(''),ms);};
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
    // `to`: the clip is one already seen, asked for with an arrow, and this its place among them
    const load=(video:HTMLVideoElement,wanted?:Clip,to?:number)=>{
      const clip=wanted??next(),size=sizeFor(clip),began=performance.now();
      const stamp=clip.at===undefined?'':`?at=${clip.at}`;   // a snippet made again keeps its name: its start in the address keeps every cache honest
      video.dataset.id=clip.id;video.dataset.to=to===undefined?'':String(to);video.dataset.size=size;video.dataset.small=s.root+clip.src+stamp;
      video.addEventListener('canplaythrough',()=>{   // how fast it really came: the next choice leans on it
        const seconds=(performance.now()-began)/1000;
        if(seconds>0.05){const seen=weightOf(clip,size)*8/1e6/seconds;s.mbps=s.mbps?s.mbps*0.6+seen*0.4:seen;}
      },{once:true,signal:off.signal});
      video.src=s.root+(clip[size]??clip.src)+stamp;video.load();
    };
    const change=(now=false)=>{
      const current=player(s.front),waiting=player(1-s.front);
      if(gone||s.changing||!current||!waiting||waiting.readyState<3||!s.active||(s.hold&&!now))return false;   // held: the clip in view waits, going round, for itself made again
      s.changing=true;waiting.currentTime=0;
      waiting.play().then(()=>{
        if(gone){s.changing=false;return;}
        const was=s.front;s.front=1-was;setLeaving(was);setFront(s.front);   // it moves: it takes the other's place, a plain cut
        const shown=byId(waiting.dataset.id);s.aim=null;
        if(waiting.dataset.to)s.at=Number(waiting.dataset.to);   // an arrow through what was seen: only the place among them moves
        else if(shown){s.seen=s.seen.slice(0,s.at+1);s.seen.push(shown);if(s.seen.length>60)s.seen.shift();s.at=s.seen.length-1;}   // what was seen, for the left arrow
        setTimeout(()=>{s.changing=false;if(gone)return;current.pause();setLeaving(-1);load(current);},now?80:120);
      }).catch(()=>{   // the next clip would not start (a browser saving power, a file gone): the one in view carries on, never a frozen frame
        s.changing=false;
        if(gone||!s.active||document.hidden||!current.paused)return;
        if(now)current.currentTime=0;
        current.play().catch(()=>{});
      });
      return true;
    };
    s.advance=(now?:boolean)=>{s.hold=null;return change(now);};
    // this clip, now: it loads in the player that waits and takes over the moment it can play. A later request wins over
    // an earlier one still loading, and one that arrives in the middle of a change waits for the change to end.
    const bring=(clip:Clip,to?:number,mine=++s.asked)=>{
      if(gone||mine!==s.asked)return;
      if(s.changing){window.setTimeout(()=>bring(clip,to,mine),150);return;}
      const waiting=player(1-s.front);
      if(!waiting)return;
      let tries=0;
      const go=()=>{
        if(gone||mine!==s.asked||waiting.dataset.id!==clip.id)return;   // something else was asked for since, or the clip would not load and another took the player
        if(!change(true)&&++tries<20)window.setTimeout(go,120);
      };
      load(waiting,clip,to);waiting.addEventListener('canplay',go,{once:true,signal:off.signal});
    };
    // the arrows: right is the next clip (or the one after the clip gone back to), left the one before; pressed twice
    // before the first has landed, they count from where the first is heading
    s.step=(by:number)=>{
      s.hold=null;
      const to=(s.aim??s.at)+by;
      if(by>0&&to>=s.seen.length){s.aim=null;s.asked++;change(true);return;}
      if(to<0)return;
      s.aim=to;bring(s.seen[to],to);
    };
    // the studio answers a mark, or a mark taken back, by making the clip's background again or putting it back: the list
    // says so when the clip is on it with its snippet starting where the studio said it would
    // → the clip as listed; null when a minute passed without it; undefined when a later request about the same clip took
    // over (a second nudge before the first was made): what happens next is that one's business
    const listed=async(id:string,at:number)=>{
      const mine=s.waits[id]=(s.waits[id]??0)+1;
      for(let n=0;n<90;n++){   // a background set aside is back in a second; one that has to be made again takes most of a minute
        const list=await fetch(s.root+'index.json',{cache:'no-store'}).then(r=>r.ok?r.json() as Promise<Listed>:null).catch(()=>null);
        if(gone||s.waits[id]!==mine)return undefined;
        const clip=list?.clips?.find(entry=>entry.id===id);
        if(clip&&Math.abs((clip.at??-1)-at)<0.002)return clip;
        await new Promise(done=>window.setTimeout(done,700));
        if(gone||s.waits[id]!==mine)return undefined;
      }
      return null;
    };
    const shuffleIn=(clip:Clip)=>{s.clips=[...s.clips.filter(entry=>entry.id!==clip.id),clip];s.queue=s.queue.filter(entry=>entry.id!==clip.id);};
    // the clip, as the studio has it now, into view: in the place it holds when it is the one in view already (a nudge, a nudge taken back)
    const again=(clip:Clip)=>{
      shuffleIn(clip);s.seen=s.seen.map(entry=>entry.id===clip.id?clip:entry);
      bring(clip,player(s.front)?.dataset.id===clip.id&&s.at>=0?s.at:undefined);
    };
    const span=(seconds:number)=>Math.abs(seconds-1)<0.05?'a second':`${seconds.toFixed(1)} s`;
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
        .then(r=>r.ok?r.json() as Promise<Answer>:Promise.reject(new Error(String(r.status))))
        .then(answer=>{
          s.clips=s.clips.filter(clip=>clip.id!==id);s.queue=s.queue.filter(clip=>clip.id!==id);s.seen=s.seen.filter(clip=>clip.id!==id);s.at=Math.min(s.at,s.seen.length-1);s.aim=null;
          say(answer.shaky?'no good: nothing smooth is left of this clip, it is out · cmd-Z takes it back':'no good: the studio is making this background again from another stretch · cmd-Z takes it back');
          s.asked++;s.hold=null;change(true);
          if(!answer.shaky&&answer.at!=null)void listed(id,answer.at).then(clip=>{if(clip){shuffleIn(clip);s.queue.unshift(clip);}});   // made again: it returns to the shuffle, from its other stretch
        }).catch(()=>say('not marked: the studio\'s Video library did not answer'));
    };
    // n and , on a development machine: the clip in view is good but for its ending (n: a second earlier) or its beginning
    // (, : a second later). It stays in view, going round, until the studio has made it again, then plays from its new start.
    s.nudge=(by:number)=>{
      const current=player(s.front),id=current?.dataset.id,way=by<0?'earlier':'later';
      if(!local()||!id)return;
      fetch(`${location.protocol}//${location.hostname}:3123/api/noplay`,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({tid:id,nudge:by,from:'site'})})
        .then(r=>r.ok?r.json() as Promise<Answer>:Promise.reject(new Error(String(r.status))))
        .then(async answer=>{
          if(!answer.ok||answer.at==null){say(answer.error==='no room'?`no room to take it ${way}: its clip ends there, or a stretch marked no good is in the way · m marks it no good`:'not nudged');return;}
          const moved=span(Math.abs(answer.shown??1));
          say(`${moved} ${way}: the studio is making it again`,0);s.hold=id;
          const clip=await listed(id,answer.at);
          if(clip===undefined)return;
          if(!clip){if(s.hold===id)s.hold=null;say(`${moved} ${way} · still being made: it shows after a reload`);return;}
          say(`${moved} ${way} · cmd-Z takes it back`);
          if(s.hold===id){s.hold=null;again(clip);}else shuffleIn(clip);   // moved on meanwhile: it is in the shuffle as it is now
        }).catch(()=>say('not nudged: the studio\'s Video library did not answer'));
    };
    // cmd-Z, on a development machine: the last mark is taken back, and the clip returns to the shuffle
    s.unmark=()=>{
      if(!local())return;
      fetch(`${location.protocol}//${location.hostname}:3123/api/noplay`,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({undo:true,from:'site'})})
        .then(r=>r.ok?r.json() as Promise<Answer>:Promise.reject(new Error(String(r.status))))
        .then(async answer=>{
          if(!answer.ok){say('there is no mark to take back');return;}
          if(!answer.tid||answer.at==null){say('the last mark is taken back · another mark still keeps its clip out');return;}
          say('the last mark is taken back: its clip is coming back',0);
          if(player(s.front)?.dataset.id===answer.tid)s.hold=answer.tid;   // a nudge taken back: the clip in view waits for itself as it was
          const clip=await listed(answer.tid,answer.at);   // the studio puts the background back as it was (or makes it again)
          if(clip===undefined)return;
          if(s.hold===answer.tid)s.hold=null;
          if(!clip){say('the last mark is taken back · its background is still being made: the clip is in the shuffle after a reload');return;}
          say('the last mark is taken back');again(clip);   // back in view: the arrows go on from it
        }).catch(()=>say('not undone: the studio\'s Video library did not answer'));
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
          video.addEventListener('ended',()=>{if(video===player(s.front)&&!change()){video.currentTime=0;video.play().catch(()=>{});}},{signal:off.signal});   // the next is not ready: once more
          video.addEventListener('error',()=>{
            const small=video.dataset.small,failed=video.currentSrc||video.src;
            if(video.dataset.size!=='src'&&small){
              // the larger file would not play. Is it this browser (then the small ones, from now on), or is the file away for a moment (the studio is making it again)?
              video.dataset.size='src';
              void fetch(failed,{method:'HEAD',cache:'no-store'}).then(r=>r.ok,()=>false).then(there=>{
                if(gone)return;
                if(there)s.hevc=false;
                video.src=small;video.load();if(video===player(s.front)&&s.active)video.play().catch(()=>{});
              });
              return;
            }
            if(video!==player(s.front))load(video);
          },{signal:off.signal});
        }
        for(const video of [a,b])video.addEventListener('playing',()=>{   // the first clip to show opens the list of what was seen
          setShowing(true);
          if(s.at<0&&video===player(s.front)){const shown=byId(video.dataset.id);if(shown){s.seen=[shown];s.at=0;}}
        },{signal:off.signal});
        load(a);load(b);setStarted(true);   // playing is the next effect's business: only while the opening screen is in view
        frame=requestAnimationFrame(watch);
      }catch{/* no backgrounds: the opening screen stays as it is */}
    };
    // after the page has settled: the wordmark and the sculpture come first
    const idle=(window as Window&{requestIdleCallback?:(run:()=>void,options?:{timeout:number})=>number}).requestIdleCallback;
    const timer=idle?idle(()=>{void begin();},{timeout:2500}):window.setTimeout(()=>{void begin();},1200);
    const [a,b]=[player(0),player(1)];
    return()=>{gone=true;off.abort();cancelAnimationFrame(frame);window.clearTimeout(noted);if(!idle)clearTimeout(timer);for(const video of [a,b]){if(video){video.pause();video.removeAttribute('src');video.load();}}};
  },[]);

  // out of view (a project, About, Contact, another tab): the clip waits where it is. Back home from a project, About or
  // Contact it is not the tail of that clip that greets you but a fresh one, from its start (the next one is loaded
  // and waiting; should it not be ready, the clip left behind starts over)
  const away=useRef(false);
  useEffect(()=>{
    const video=(front?second:first).current;
    if(!video||!started)return;
    const sync=()=>{
      if(!active)away.current=true;
      if(!active||document.hidden){video.pause();return;}
      if(away.current){
        away.current=false;
        if(state.current.advance(true))return;   // the fresh clip plays itself in
        video.currentTime=0;
      }
      video.play().catch(()=>{});
    };
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
      if(command&&name==='z'&&!event.shiftKey){if(local()){event.preventDefault();state.current.unmark();}return;}   // the published site leaves cmd-Z to the browser
      if(command||event.altKey)return;
      if(name==='m')state.current.mark();
      else if(name==='n')state.current.nudge(-1);
      else if(name===',')state.current.nudge(1);
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
