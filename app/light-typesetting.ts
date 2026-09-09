export type TypeEntry={locale:string;script:string;text:string;family:string;weight:number;stroke?:number};
export type TypesetLine={text:string;x:number;y:number;inkHeight:number;inkWidth:number};
export type TypesetEntry=TypeEntry&{size:number;bodySample:string;bodyHeight:number;opticalBoost:number;lines:TypesetLine[]};
export type TypesetPage={width:number;rowHeight:number;bodyHeight:number;entries:Record<string,TypesetEntry>};

export function typesetLight(entries:TypeEntry[],width:number,height:number,widthRatio=.085):TypesetPage{
 const ctx=document.createElement('canvas').getContext('2d')!;
 const rowHeight=height/5;
 const cache=new Map<string,TextMetrics>();
 const measure=(entry:TypeEntry,text:string)=>{
  const key=`${entry.family}|${entry.weight}|${entry.stroke||0}|${text}`;
  let result=cache.get(key);
  if(!result){ctx.font=`${entry.weight} 100px "${entry.family}"`;ctx.textAlign='center';ctx.direction=['ar','fa','ur','he'].includes(entry.locale)?'rtl':'ltr';result=ctx.measureText(text);const pad=(entry.stroke||0)*50;result={width:result.width+pad*2,actualBoundingBoxLeft:result.actualBoundingBoxLeft+pad,actualBoundingBoxRight:result.actualBoundingBoxRight+pad,actualBoundingBoxAscent:result.actualBoundingBoxAscent+pad,actualBoundingBoxDescent:result.actualBoundingBoxDescent+pad} as TextMetrics;cache.set(key,result)}
  return result;
 };
 const inkHeight=(m:TextMetrics)=>Math.max(1,m.actualBoundingBoxAscent+m.actualBoundingBoxDescent);
 const inkWidth=(m:TextMetrics)=>Math.max(m.width,m.actualBoundingBoxLeft+m.actualBoundingBoxRight);
 // Glossary typography: one shared em size and weight, with no script boosts.
 // Fit the full rotation together so language changes never change the type size.
 const metrics=entries.map(entry=>({entry,metric:measure(entry,entry.text)}));
 const maxWidth=Math.max(1,...metrics.map(({metric})=>inkWidth(metric)));
 const maxHeight=Math.max(1,...metrics.map(({metric})=>inkHeight(metric)));
 const size=Math.max(1,Math.min(80,width*widthRatio,(width-24)*100/maxWidth,(rowHeight-24)*100/maxHeight));
 const scale=size/100,result:Record<string,TypesetEntry>={};
 for(const {entry,metric:m} of metrics){
  result[entry.locale]={...entry,size,bodySample:entry.text,bodyHeight:size,opticalBoost:1,lines:[{
   text:entry.text,x:width/2+(m.actualBoundingBoxLeft-m.actualBoundingBoxRight)*scale/2,
   y:rowHeight/2+(m.actualBoundingBoxAscent-m.actualBoundingBoxDescent)*scale/2,
   inkHeight:inkHeight(m)*scale,inkWidth:inkWidth(m)*scale
  }]};
 }
 return {width,rowHeight,bodyHeight:size,entries:result};
}
