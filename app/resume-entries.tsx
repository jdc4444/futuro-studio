'use client';
import {useEffect,useRef} from 'react';
import {mountResume} from './resume-runtime';

export function ResumeEntries({route,startMainMuted=false}:{route?:string;startMainMuted?:boolean}={}){
 const root=useRef<HTMLElement>(null);
 useEffect(()=>{
  if(!root.current)return;
  return mountResume(root.current,{routes:route?[route]:undefined,startMainMuted});
 },[route,startMainMuted]);
 return <section ref={root} className="futuro-resume" aria-label="Selected work, credits and recognition">
  <div className="shell"><div className="resume-main"><div data-project-list=""/></div></div>
 </section>;
}
