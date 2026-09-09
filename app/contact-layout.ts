// Shrink at most 28 percent; longer text wraps instead of becoming tiny.
export function contactFontSize(base:number,width:number,naturalWidth:number){
 const start=Math.max(18,base),minimum=Math.max(18,start*.72);
 return Math.max(minimum,Math.min(start,naturalWidth>0?start*width/naturalWidth:start));
}

// Grow in whole lines, then scroll within a bounded part of the visible screen.
export function contactHeight(contentHeight:number,lineHeight:number,padding:number,viewportHeight:number){
 const room=Math.min(360,viewportHeight*.45);
 const lines=Math.max(1,Math.min(6,Math.floor((room-padding)/lineHeight)));
 const limit=Math.ceil(lines*lineHeight+padding);
 const height=Math.min(limit,Math.max(Math.ceil(lineHeight+padding),contentHeight));
 return {height,scrolls:contentHeight>height+1};
}
