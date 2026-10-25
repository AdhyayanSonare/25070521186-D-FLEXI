import type {RefObject} from 'react';
import {gsap,ScrollTrigger,useGSAP,MOTION_OK} from './gsap';

/** Staggered rise-in for repeated items as they scroll into view. Skipped when reduced motion is on. */
export function useReveal(scope:RefObject<HTMLElement|null>,selector:string,deps:unknown[]=[]){
 useGSAP(()=>{
  const mm=gsap.matchMedia();
  mm.add(MOTION_OK,()=>{
   const items=gsap.utils.toArray<HTMLElement>(selector,scope.current);
   if(!items.length)return;
   gsap.set(items,{autoAlpha:0,y:28});
   ScrollTrigger.batch(items,{start:'top 92%',once:true,onEnter:batch=>gsap.to(batch,{autoAlpha:1,y:0,duration:.8,ease:'expo.out',stagger:.07,overwrite:true})});
  });
  return()=>mm.revert();
 },{scope,dependencies:deps,revertOnUpdate:true});
}

/** Counts a number up from zero once it is visible. */
export function useCountUp(scope:RefObject<HTMLElement|null>,selector:string,deps:unknown[]=[]){
 useGSAP(()=>{
  const mm=gsap.matchMedia();
  mm.add(MOTION_OK,()=>{
   gsap.utils.toArray<HTMLElement>(selector,scope.current).forEach(el=>{
    const target=Number(el.dataset.value);if(!Number.isFinite(target)||target===0)return;
    const o={v:0};el.textContent='0';
    gsap.to(o,{v:target,duration:1.4,ease:'power2.out',onUpdate:()=>{el.textContent=Math.round(o.v).toLocaleString('en-US');},scrollTrigger:{trigger:el,start:'top 95%',once:true}});
   });
  });
  return()=>mm.revert();
 },{scope,dependencies:deps,revertOnUpdate:true});
}
