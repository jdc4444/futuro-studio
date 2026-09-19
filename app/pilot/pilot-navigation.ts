// Pure geometry decisions keep the scroll loop and temporary project pages predictable.
export function projectExit(top:number,bottom:number,delta:number) {
  if (bottom <= 1) return 'next';
  if ((delta < 0 && top >= -2) || top > 2) return 'preview';
  return null;
}

export function loopDestination(scroll:number,first:number,end:number) {
  if (scroll >= end - 1) return first;
  return null;
}

// One trackpad gesture includes its inertia. Consume that whole stream before
// allowing another project transition; a fresh gesture releases the stop.
//
// The stream is read as pace (distance over time across the last few events),
// not as raw deltas one by one. The system hands out whole pixels, so an inertia
// tail flickers 1,1,2,1; a busy page receives two events as one with their
// deltas added, or a whole stretch late as one lump. Each looks like a renewed
// push when neighbouring deltas are compared, and one swipe then moved two
// projects. Distance over time is indifferent to all of them.
type Step={size:number;took:number};
function pace(steps:Step[],span:number) {
  let distance=0,time=0;
  for(let i=steps.length-1;i>=0&&time<span;i--){
    // Stop short of a step that reaches far beyond the span (the silence
    // before a gesture), once enough of the span is covered without it.
    if(time>=span*.6&&time+steps[i].took>span*1.5)break;
    distance+=steps[i].size;time+=steps[i].took;
  }
  return time?distance/time:0;
}

export function createScrollGestureGate() {
  let held=false,lastWheel=-Infinity,heldAt=-Infinity;
  let previous=0,peak=0,decayed=false,running=false;
  let trough=Infinity,rise=0,riseTravel=0,riseBegan=0,travel=0,lows=0,cliff=0;
  let steps:Step[]=[];
  const forget=()=>{peak=pace(steps,100);decayed=false;trough=Infinity;rise=0;riseTravel=0;lows=0;};
  return {
    get held(){return held;},
    // Whether the current gesture is really under way: a little distance at a
    // hand's pace, or a lot slowly. A lone stray pixel (a resting finger) or the
    // last stragglers of a tail after a silence are not a gesture.
    get underway(){return travel>=3&&(pace(steps,40)>=.1||travel>=30);},
    hold(now=lastWheel,preserveMomentum=false){
      held=true;heldAt=now;
      if(!preserveMomentum)forget();
    },
    release(){held=false;},
    wheel(now:number,delta=0,inTransit=false){
      const size=Math.abs(delta),gap=now-lastWheel,before=pace(steps,100);
      const silent=gap>160;
      // A silence is not always the hand's: a busy page receives the stream's
      // events late and as one. What arrives then is about the distance the
      // stream would have covered meanwhile; a new gesture starts small instead.
      const carried=silent&&running&&gap<=450&&size>=6&&size<=before*gap*1.5&&size>=before*gap*.25;
      const paused=silent&&!carried;
      const reversed=size>=2&&previous!==0&&Math.sign(delta)!==Math.sign(previous);
      // After a silence the distance took at least the silence to arrive.
      const took=paused?160:Math.min(450,Math.max(4,gap));
      // Fingers back on the pad stop inertia at once: the stream falls off a
      // cliff instead of fading. Twice running, so one odd event is not it.
      const pair=steps.length?(size+steps[steps.length-1].size)/(took+steps[steps.length-1].took):size/took;
      if(!silent&&(lows?pair<cliff*.25:decayed&&before>=.2&&size/took<before*.25)){if(!lows)cliff=before;lows++;}
      else lows=0;
      const cancelled=lows>=2;
      if(paused||reversed||cancelled){travel=0;steps=[];forget();}
      travel+=size;
      steps.push({size,took});if(steps.length>24)steps.shift();
      const level=pace(steps,100),recent=pace(steps,40);
      peak=Math.max(peak,level);
      if(!decayed&&level<peak*.55){decayed=true;trough=level;}
      // A second swipe often starts before the previous swipe's inertia has
      // stopped emitting events. Inertia only ever slows down, so a renewed push
      // is a rise above the slowest point so far that lasts: three events or
      // more, over at least 30ms, covering six pixels or more. It can be gentle
      // (Safari's pixel deltas are small even for a deliberate swipe); it cannot
      // be a single odd event.
      let renewed=false;
      if(decayed){
        if(recent>trough*1.8){
          if(!rise)riseBegan=now;
          rise++;riseTravel+=size;
        }else{rise=0;riseTravel=0;}
        trough=Math.min(trough,level);
        renewed=rise>=3&&riseTravel>=6&&now-riseBegan>=30&&now-heldAt>120;
      }
      const freshGesture=paused||reversed||cancelled||renewed;
      running=!paused;
      lastWheel=now;
      if(held&&freshGesture&&!inTransit)held=false;
      previous=delta;
      return held;
    },
  };
}

export function anchoredScroll(scroll:number,before:number,after:number) {
  return scroll + after - before;
}
