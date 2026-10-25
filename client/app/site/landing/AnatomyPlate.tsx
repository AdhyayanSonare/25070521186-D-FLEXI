import {useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import {gsap,ScrollTrigger,useGSAP,MOTION_OK,REDUCED} from '../gsap';
import {LAYERS} from './layers';

// Points measured on the rendered plate (percent of the image). Each opens that structure in the Atlas.
const CALLOUTS=[
 {name:'Skull',id:'FMA46565',x:51,y:6.2,side:'left'},
 {name:'Sternum',id:'FMA7485',x:47.6,y:23,side:'right'},
 {name:'Pectoralis major',id:'FMA13373',x:38.5,y:25,side:'left'},
 {name:'Sartorius',id:'FMA22355',x:59,y:57,side:'right'},
 {name:'Patella',id:'FMA24486',x:42,y:70.3,side:'left'},
] as const;
const DWELL=3.8; // seconds each layer stays before the next scan
const LETTERS='abcde';

interface Props {href:(q:string)=>string;compact?:boolean;delay?:number}

/** The landing figure: anatomy layers that swap with a scan line, plus an X-ray lens under the cursor. */
export function AnatomyPlate({href,compact=false,delay=.35}:Props){
 const root=useRef<HTMLElement>(null),stage=useRef<HTMLDivElement>(null);
 const [active,setActive]=useState(0);
 const api=useRef<{goTo:(i:number)=>void}>({goTo:()=>{}});

 useGSAP((_ctx,contextSafe)=>{
  const layers=gsap.utils.toArray<HTMLElement>('.plate-layer',root.current);
  const scan=root.current!.querySelector<HTMLElement>('.scanline');
  const bars=gsap.utils.toArray<HTMLElement>('.chip-progress',root.current);
  const callouts=root.current!.querySelector('.plate-callouts');
  const hidden='inset(0% 0% 100% 0%)',shown='inset(0% 0% 0% 0%)';
  let current=0,busy=false,progress:gsap.core.Tween|null=null,swap:gsap.core.Timeline|null=null,inView=true,alive=true;
  const mm=gsap.matchMedia();
  const motion=()=>window.matchMedia(MOTION_OK).matches;

  gsap.set(layers,{clipPath:hidden,zIndex:0});
  gsap.set(layers[0],{clipPath:shown,zIndex:1});

  // Internal steps are plain functions; only real event handlers are contextSafe (nesting them recurses).
  const runProgress=()=>{
   if(!alive)return;
   progress?.kill();
   gsap.set(bars,{scaleX:0});
   if(!motion())return;
   const bar=bars[current];
   progress=gsap.to(bar??{p:0},{...(bar?{scaleX:1}:{p:1}),duration:DWELL,ease:'none',onComplete:()=>goTo((current+1)%layers.length)});
   if(!inView)progress.pause();
  };

  const goTo=(i:number)=>{
   if(!alive||busy||i===current)return;
   const prev=layers[current],next=layers[i];
   progress?.kill();bars.forEach(b=>gsap.set(b,{scaleX:0}));
   setActive(i);
   if(!motion()){gsap.set(prev,{clipPath:hidden,zIndex:0});gsap.set(next,{clipPath:shown,zIndex:1});gsap.set(callouts,{autoAlpha:i===0?1:0});current=i;return;}
   busy=true;
   gsap.set(prev,{zIndex:1});gsap.set(next,{zIndex:2,clipPath:hidden});
   const tl=swap=gsap.timeline({onComplete:()=>{gsap.set(prev,{clipPath:hidden,zIndex:0});gsap.set(next,{zIndex:1});current=i;busy=false;runProgress();}});
   if(callouts&&current===0)tl.to(callouts,{autoAlpha:0,duration:.25},0);
   tl.to(next,{clipPath:shown,duration:1.2,ease:'power2.inOut'},0)
     .fromTo(scan,{top:'0%',autoAlpha:1},{top:'100%',duration:1.2,ease:'power2.inOut'},0)
     .to(scan,{autoAlpha:0,duration:.25},'>-0.1');
   if(callouts&&i===0)tl.fromTo(callouts,{autoAlpha:0},{autoAlpha:1,duration:.4},'>-0.2');
  };
  api.current.goTo=contextSafe!((i:number)=>goTo(i));

  // Only animate while the figure is on screen.
  ScrollTrigger.create({trigger:root.current,start:'top bottom',end:'bottom top',onToggle:self=>{inView=self.isActive;if(progress)inView?progress.resume():progress.pause();}});

  mm.add(MOTION_OK,()=>{
   const tl=gsap.timeline({delay,onComplete:runProgress});
   tl.fromTo(stage.current,{clipPath:hidden},{clipPath:shown,duration:1.5,ease:'power2.inOut'})
     .fromTo(scan,{top:'0%',autoAlpha:1},{top:'100%',duration:1.5,ease:'power2.inOut'},0)
     .to(scan,{autoAlpha:0,duration:.3},'>-0.1')
     .from('.plate-mark',{scale:0,autoAlpha:0,duration:.5,stagger:.06,ease:'back.out(2)'},.2);
   if(callouts){
    gsap.set(callouts,{autoAlpha:1});
    tl.from('.plate-callouts .callout-dot',{scale:0,duration:.4,stagger:.1,ease:'back.out(3)'},.85)
      .from('.plate-callouts .callout-line',{scaleX:0,duration:.6,stagger:.1,ease:'power3.out'},.95)
      .from('.plate-callouts .callout-label',{autoAlpha:0,x:(i,el)=>el.closest('.callout-left')?8:-8,duration:.45,stagger:.08},1.2);
   }
   tl.from('.layer-chip',{y:12,autoAlpha:0,duration:.5,stagger:.06},1.3).from('.plate2 figcaption',{autoAlpha:0,duration:.6},1.6);
  });
  mm.add(REDUCED,()=>{gsap.set(stage.current,{clipPath:shown});if(callouts)gsap.set(callouts,{autoAlpha:1});});

  // X-ray lens: follows a mouse pointer and shows the skeleton (or muscles when the skeleton is showing).
  const el=stage.current!;
  const mx=gsap.quickTo(el,'--mx',{duration:.35,ease:'power3'}),my=gsap.quickTo(el,'--my',{duration:.35,ease:'power3'});
  const move=contextSafe!((e:PointerEvent)=>{if(e.pointerType!=='mouse')return;const r=el.getBoundingClientRect();mx(e.clientX-r.left);my(e.clientY-r.top);});
  const enter=contextSafe!((e:PointerEvent)=>{if(e.pointerType!=='mouse')return;const r=el.getBoundingClientRect();gsap.set(el,{'--mx':e.clientX-r.left,'--my':e.clientY-r.top});gsap.to(el,{'--lr':Math.min(92,r.width*.24),duration:.45,ease:'back.out(1.6)'});progress?.pause();});
  const leave=contextSafe!(()=>{gsap.to(el,{'--lr':0,duration:.3,ease:'power2.in'});if(inView)progress?.resume();});
  el.addEventListener('pointermove',move);el.addEventListener('pointerenter',enter);el.addEventListener('pointerleave',leave);
  return()=>{el.removeEventListener('pointermove',move);el.removeEventListener('pointerenter',enter);el.removeEventListener('pointerleave',leave);alive=false;progress?.kill();swap?.kill();api.current.goTo=()=>{};};
 },{scope:root});

 const lensSrc=active===1?LAYERS[0].src:LAYERS[1].src;
 return <figure className={`plate2 ${compact?'is-compact':''}`} ref={root}>
  <div className="plate-stage" ref={stage}>
   {['tl','tr','bl','br'].map(c=><span key={c} className={`plate-mark ${c}`} aria-hidden="true"/>)}
   {LAYERS.map((l,i)=><img key={l.id} className="plate-layer" src={l.src} width={500} height={1080} alt={i===active?`3D anatomy model, ${l.caption.toLowerCase()}.`:''} aria-hidden={i!==active} decoding="async" fetchPriority={i===0?'high':'low'}/>)}
   <div className="plate-lens" aria-hidden="true"><img src={lensSrc} alt="" width={500} height={1080}/></div>
   <span className="lens-ring" aria-hidden="true"/>
   <span className="scanline" aria-hidden="true"/>
   {!compact&&<div className="plate-callouts">{CALLOUTS.map((c,i)=><Link key={c.id} to={href(`?structure=${c.id}`)} tabIndex={active===0?0:-1} className={`callout callout-${c.side}`} style={{left:`${c.x}%`,top:`${c.y}%`,['--i' as string]:i,['--x' as string]:c.x}}>
    <span className="callout-dot" aria-hidden="true"/><span className="callout-line" aria-hidden="true"/><span className="callout-label">{c.name}</span>
   </Link>)}</div>}
  </div>
  {!compact&&<div className="layer-chips" role="group" aria-label="Show a layer">
   {LAYERS.map((l,i)=><button key={l.id} type="button" className="layer-chip" aria-pressed={i===active} onClick={()=>api.current.goTo(i)}>
    {l.name}<i className="chip-progress" aria-hidden="true"/>
   </button>)}
  </div>}
  <figcaption aria-live="polite"><span>Fig. 1{LETTERS[active]}</span> {LAYERS[active].caption}.{!compact&&active===0&&' Select a label to open it in the atlas.'}</figcaption>
 </figure>;
}
