// Pure geometry decisions keep the scroll loop and temporary project pages predictable.
export function projectExit(top:number,bottom:number,delta:number,visitedDetails:boolean) {
  if (bottom <= 1) return 'next';
  if (visitedDetails && delta < 0 && top >= -2) return 'preview';
  if (top > 2) return 'previous';
  return null;
}

export function loopDestination(scroll:number,first:number,end:number) {
  if (scroll >= end - 1) return first;
  return null;
}

// One trackpad gesture includes its inertia. Consume that whole stream before
// allowing another project transition; a fresh gesture releases the stop.
export function createScrollGestureGate() {
  let held=false,lastWheel=-Infinity;
  return {
    get held(){return held;},
    hold(){held=true;},
    release(){held=false;},
    wheel(now:number){
      const freshGesture=now-lastWheel>180;
      lastWheel=now;
      if(held&&freshGesture)held=false;
      return held;
    },
  };
}

export function anchoredScroll(scroll:number,before:number,after:number) {
  return scroll + after - before;
}
