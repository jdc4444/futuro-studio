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
export function createScrollGestureGate() {
  let held=false,lastWheel=-Infinity,heldAt=-Infinity;
  let previous=0,peak=0,decayed=false;
  return {
    get held(){return held;},
    hold(now=lastWheel){
      held=true;heldAt=now;lastWheel=now;peak=Math.abs(previous);decayed=false;
    },
    release(){held=false;},
    wheel(now:number,delta=0){
      const magnitude=Math.abs(delta);
      const reversed=magnitude>=4&&previous!==0&&Math.sign(delta)!==Math.sign(previous);
      // A second swipe often starts before the previous swipe's inertia has
      // stopped emitting events. Its renewed impulse is another gesture.
      const newImpulse=decayed&&now-heldAt>300&&magnitude>=8&&magnitude>Math.abs(previous)*1.6;
      const freshGesture=now-lastWheel>160||reversed||newImpulse;
      lastWheel=now;
      if(held&&freshGesture)held=false;
      peak=Math.max(peak,magnitude);
      if(peak>=8&&magnitude<peak*.55)decayed=true;
      previous=delta;
      return held;
    },
  };
}

export function anchoredScroll(scroll:number,before:number,after:number) {
  return scroll + after - before;
}
