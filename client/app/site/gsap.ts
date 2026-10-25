// One place to register GSAP plugins for the whole app.
import gsap from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';
import {SplitText} from 'gsap/SplitText';
import {useGSAP} from '@gsap/react';
gsap.registerPlugin(useGSAP,ScrollTrigger,SplitText);
gsap.defaults({ease:'power3.out',duration:.8});
export const REDUCED='(prefers-reduced-motion: reduce)';
export const MOTION_OK='(prefers-reduced-motion: no-preference)';
export {gsap,ScrollTrigger,SplitText,useGSAP};
