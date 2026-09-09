'use client';
import {useEffect,useRef} from 'react';
import {mountResume} from './resume-runtime';
import projects from './resume-projects.json';

export const firstResumePreviewAspect=Number(projects[0].media.aspect)||16/9;

export function ResumeEntries(){
 const root=useRef<HTMLElement>(null);
 useEffect(()=>{
  if(!root.current)return;
  return mountResume(root.current);
 },[]);
 return <section ref={root} className="futuro-resume" aria-label="Selected work, credits and recognition">
  <div className="shell"><div className="resume-main"><div id="projectList"/></div></div>
 </section>;
}
