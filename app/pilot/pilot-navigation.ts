// Pure geometry decisions keep the scroll loop and temporary project pages predictable.
export function projectExit(top:number,bottom:number,delta:number,visitedDetails:boolean) {
  if (bottom <= 1) return 'next';
  if (top > 2) return 'previous';
  if (visitedDetails && delta < 0 && top >= -2) return 'preview';
  return null;
}

export function loopDestination(scroll:number,first:number,last:number,end:number) {
  if (scroll >= end - 1) return first + Math.max(0,scroll - end);
  if (scroll <= 1) return last + scroll;
  return null;
}

export function anchoredScroll(scroll:number,before:number,after:number) {
  return scroll + after - before;
}
