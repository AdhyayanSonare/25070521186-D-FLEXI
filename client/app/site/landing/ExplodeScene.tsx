import {useRef,useState} from 'react';
import {gsap,useGSAP,MOTION_OK,REDUCED} from '../gsap';
import {EXPLODE_FRAMES} from './layers';

const STAGES=[
 {at:0,title:'Assembled',text:'Every structure in place, the way the atlas opens.'},
 {at:.3,title:'Separating',text:'Pieces move apart along their own paths, so nothing hides behind anything else.'},
 {at:.75,title:'Every piece, laid out',text:'All 2,234 parts spread into an inventory you can scan, select and search.'},
];

/** Pinned, scroll-scrubbed sequence of real Atlas renders at increasing explode values. */
export function ExplodeScene(){
 const root=useRef<HTMLElement>(null),readout=useRef<HTMLSpanElement>(null),bar=useRef<HTMLElement>(null);
 const [stage,setStage]=useState(0);
 useGSAP(()=>{
  const frames=gsap.utils.toArray<HTMLElement>('.explode-frame',root.current);
  const n=frames.length;
  const render=(p:number)=>{
   const idx=p*(n-1);
   frames.forEach((f,i)=>{f.style.opacity=String(gsap.utils.clamp(0,1,1-Math.abs(idx-i)));});
   if(readout.current)readout.current.textContent=String(Math.round(p*100));
   if(bar.current)bar.current.style.transform=`scaleX(${p})`;
   let s=0;STAGES.forEach((st,i)=>{if(p>=st.at)s=i;});setStage(s);
  };
  const mm=gsap.matchMedia();
  mm.add(MOTION_OK,()=>{
   render(0);
   gsap.timeline({scrollTrigger:{trigger:root.current,start:'top top',end:'+=230%',pin:true,scrub:.7,anticipatePin:1,onUpdate:self=>render(self.progress)}})
    .fromTo('.explode-stage',{scale:.92},{scale:1,ease:'none'},0)
    .to({},{duration:1});
   gsap.from('.explode-copy > *',{y:30,autoAlpha:0,stagger:.08,scrollTrigger:{trigger:root.current,start:'top 75%'}});
  });
  mm.add(REDUCED,()=>render(1));
 },{scope:root});
 return <section className="explode" ref={root} aria-labelledby="explode-title">
  <div className="explode-inner">
   <div className="explode-copy">
    <h2 id="explode-title" className="display">Take it apart.</h2>
    <p className="explode-lede">Scroll to separate the body, the same way the explode control works in the atlas.</p>
    <ol className="explode-stages">{STAGES.map((s,i)=><li key={s.title} className={i===stage?'is-active':i<stage?'is-past':''}><h3>{s.title}</h3><p>{s.text}</p></li>)}</ol>
    <div className="explode-readout" aria-hidden="true"><span>Explode</span><b><span ref={readout}>0</span>%</b><i><em ref={bar}/></i></div>
   </div>
   <div className="explode-stage">
    {EXPLODE_FRAMES.map((src,i)=><img key={src} className="explode-frame" src={src} alt={i===0?'The anatomy model separating into its individual parts as you scroll.':''} aria-hidden={i!==0} loading="lazy" decoding="async"/>)}
   </div>
  </div>
 </section>;
}
