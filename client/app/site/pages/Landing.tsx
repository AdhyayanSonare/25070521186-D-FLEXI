import {useRef} from 'react';
import {Link} from 'react-router-dom';
import {SYSTEMS} from '../../anatomy';
import {useAuth} from '../auth';
import {gsap,ScrollTrigger,SplitText,useGSAP,MOTION_OK,REDUCED} from '../gsap';
import {AnatomyPlate} from '../landing/AnatomyPlate';
import {ExplodeScene} from '../landing/ExplodeScene';
import '../landing/landing.css';

// Part counts per system from the atlas manifest (client/public/models/atlas.json).
const COUNTS:Record<string,number>={skeletal:296,muscular:402,cardiac:23,sensory:45,arterial:639,venous:404,nervous:139,respiratory:119,digestive:97,urinary:6,lymphatic:3,endocrine:4,reproductive:12,integumentary:5,connective:40};
const FACTS=[
 {value:2234,label:'individually selectable parts'},
 {value:3432,label:'named structures to search'},
 {value:15,label:'body systems to switch on and off'},
 {value:2288268,label:'triangles drawn in your browser'},
];
const STEPS=[
 {title:'Find a structure',text:'Search 3,432 named structures, or tap any part of the model to identify it.'},
 {title:'Save it',text:'Keep the structures you are learning in your Study Space, one click from the model.'},
 {title:'Write notes',text:'Record what you need to remember beside each structure, and edit it as you learn more.'},
 {title:'Read further',text:'Pull up the most relevant PubMed articles for a structure when you want to go deeper.'},
];

export default function Landing(){
 const {status}=useAuth();
 const authed=status==='authed';
 const root=useRef<HTMLDivElement>(null);
 const atlasHref=(q='')=>authed?`/app/atlas${q}`:`/login?next=${encodeURIComponent(`/app/atlas${q}`)}`;

 useGSAP((_ctx,contextSafe)=>{
  const mm=gsap.matchMedia();
  mm.add(MOTION_OK,()=>{
   // Hero: the headline rises line by line through masks, then the rest follows.
   const split=SplitText.create('.hero2 h1',{type:'lines,words',mask:'lines',linesClass:'split-line'});
   gsap.timeline({defaults:{ease:'expo.out'}})
    .from(split.words,{yPercent:110,duration:1.15,stagger:.045})
    .from('.hero2 .lede',{y:24,autoAlpha:0,duration:1},'-=.75')
    .from('.hero2 .hero-actions > *',{y:18,autoAlpha:0,duration:.8,stagger:.08},'-=.7')
    .from('.hero2 .hero-foot',{autoAlpha:0,duration:.8},'-=.5');

   // Hero background: a soft glow follows the pointer.
   const hero=root.current!.querySelector<HTMLElement>('.hero2')!;
   const gx=gsap.quickTo(hero,'--gx',{duration:.9,ease:'power3'}),gy=gsap.quickTo(hero,'--gy',{duration:.9,ease:'power3'});
   const onMove=contextSafe!((e:PointerEvent)=>{const r=hero.getBoundingClientRect();gx(e.clientX-r.left);gy(e.clientY-r.top);});
   hero.addEventListener('pointermove',onMove);

   // Magnetic primary buttons.
   const offs=gsap.utils.toArray<HTMLElement>('.magnetic').map(m=>{
    const xTo=gsap.quickTo(m,'x',{duration:.6,ease:'elastic.out(1,0.4)'}),yTo=gsap.quickTo(m,'y',{duration:.6,ease:'elastic.out(1,0.4)'});
    const mv=contextSafe!((e:PointerEvent)=>{const r=m.getBoundingClientRect();xTo((e.clientX-r.left-r.width/2)*.28);yTo((e.clientY-r.top-r.height/2)*.4);});
    const lv=contextSafe!(()=>{xTo(0);yTo(0);});
    m.addEventListener('pointermove',mv);m.addEventListener('pointerleave',lv);
    return()=>{m.removeEventListener('pointermove',mv);m.removeEventListener('pointerleave',lv);};
   });

   // The hero copy drifts up and fades slightly as you scroll away from it.
   gsap.to('.hero-copy',{yPercent:-14,autoAlpha:.3,ease:'none',scrollTrigger:{trigger:'.hero2',start:'top top',end:'bottom top',scrub:true}});

   // Facts count up when they come into view.
   gsap.utils.toArray<HTMLElement>('.fact-value').forEach(el=>{
    const target=Number(el.dataset.value),o={v:0};
    el.textContent='0';
    gsap.to(o,{v:target,duration:2.2,ease:'power2.out',scrollTrigger:{trigger:el,start:'top 88%',once:true},onUpdate:()=>{el.textContent=Math.round(o.v).toLocaleString('en-US');}});
   });
   gsap.from('.fact',{y:40,autoAlpha:0,stagger:.1,duration:1,scrollTrigger:{trigger:'.facts',start:'top 85%'}});
   gsap.from('.fact-rule',{scaleX:0,transformOrigin:'left center',duration:1.4,ease:'expo.out',stagger:.1,scrollTrigger:{trigger:'.facts',start:'top 85%'}});

   // Section headings rise in through line masks; supporting text follows.
   gsap.utils.toArray<HTMLElement>('.reveal-heading').forEach(h=>{
    const s=SplitText.create(h,{type:'lines',mask:'lines'});
    gsap.from(s.lines,{yPercent:105,duration:1.1,ease:'expo.out',stagger:.08,scrollTrigger:{trigger:h,start:'top 86%'}});
   });
   gsap.utils.toArray<HTMLElement>('.reveal-up').forEach(el=>gsap.from(el,{y:28,autoAlpha:0,duration:1,scrollTrigger:{trigger:el,start:'top 90%'}}));

   // Two marquees of systems drift in opposite directions; scrolling speeds them up briefly.
   const loops=gsap.utils.toArray<HTMLElement>('.marquee-track').map((r,i)=>gsap.fromTo(r,{xPercent:i%2?-50:0},{xPercent:i%2?0:-50,duration:50,ease:'none',repeat:-1}));
   let boost=1;
   ScrollTrigger.create({trigger:'.systems2',start:'top bottom',end:'bottom top',onUpdate:self=>{
    boost=Math.min(5,1+Math.abs(self.getVelocity())/500);
    loops.forEach(l=>gsap.to(l,{timeScale:boost,duration:.25,overwrite:true,onComplete:()=>{gsap.to(l,{timeScale:1,duration:1.4});}}));
   }});
   const marquee=root.current!.querySelector<HTMLElement>('.marquee')!;
   const slow=contextSafe!(()=>loops.forEach(l=>gsap.to(l,{timeScale:.12,duration:.6,overwrite:true})));
   const fast=contextSafe!(()=>loops.forEach(l=>gsap.to(l,{timeScale:1,duration:.6,overwrite:true})));
   marquee.addEventListener('pointerenter',slow);marquee.addEventListener('pointerleave',fast);
   gsap.from('.marquee-row',{xPercent:(i)=>i%2?8:-8,autoAlpha:0,duration:1.4,ease:'expo.out',stagger:.12,scrollTrigger:{trigger:'.marquee',start:'top 88%'}});

   // The study timeline draws itself and lights each step as you scroll.
   const steps=gsap.utils.toArray<HTMLElement>('.step');
   const stl=gsap.timeline({scrollTrigger:{trigger:'.steps-list',start:'top 80%',end:'bottom 60%',scrub:.6}});
   stl.fromTo('.steps-progress',{scaleX:0},{scaleX:1,ease:'none',duration:steps.length},0);
   steps.forEach((s,i)=>{
    stl.fromTo(s,{autoAlpha:.2,y:26},{autoAlpha:1,y:0,duration:.6,ease:'power2.out'},i)
       .fromTo(s.querySelector('.step-dot'),{backgroundColor:'#f2f3f3',color:'#263b48',borderColor:'#1825362b'},{backgroundColor:'#2f6f6a',color:'#ffffff',borderColor:'#2f6f6a',duration:.25},i+.15);
   });

   // Closing statement: each word lights up as it passes through the viewport.
   const words=SplitText.create('.closing-statement',{type:'words'});
   gsap.fromTo(words.words,{opacity:.14},{opacity:1,stagger:.1,ease:'none',scrollTrigger:{trigger:'.closing-statement',start:'top 82%',end:'bottom 50%',scrub:true}});
   gsap.from('.closing2-actions > *',{y:20,autoAlpha:0,stagger:.1,scrollTrigger:{trigger:'.closing2-actions',start:'top 92%'}});

   return()=>{hero.removeEventListener('pointermove',onMove);offs.forEach(f=>f());marquee.removeEventListener('pointerenter',slow);marquee.removeEventListener('pointerleave',fast);};
  });
  mm.add(REDUCED,()=>{});
 },{scope:root,dependencies:[authed],revertOnUpdate:true});

 const Row=({list}:{list:typeof SYSTEMS})=><>{[0,1].map(copy=><ul key={copy} className="marquee-set" aria-hidden={copy===1}>{list.map(s=><li key={s.id}>
  <Link to={atlasHref(`?system=${s.id}`)} tabIndex={copy===1?-1:0} className="sys-pill" style={{['--sys' as string]:s.color}}><span className="sys-dot" aria-hidden="true"/>{s.name}<small>{COUNTS[s.id]} parts</small></Link>
 </li>)}</ul>)}</>;

 return <div className="landing2" ref={root}>
  <section className="hero2" aria-labelledby="hero-title">
   <div className="hero-grid" aria-hidden="true"/>
   <div className="hero-copy">
    <h1 id="hero-title" className="display">Study the body one structure at a time.</h1>
    <p className="lede">Turn, take apart and search a 3D model of 2,234 anatomical parts. Save the ones you are learning, keep notes beside them and find research when you want to go deeper.</p>
    <div className="hero-actions">
     <Link to={atlasHref()} className="btn btn-dark btn-lg magnetic">Open the atlas</Link>
     {authed?<Link to="/app/study-space" className="btn btn-line btn-lg">Go to Study Space</Link>:<Link to="/register" className="btn btn-line btn-lg">Create a free account</Link>}
    </div>
    <p className="hero-foot"><span className="hint-mouse">Hover over the figure to see the skeleton underneath. </span><span className="hint-touch">Tap a layer below the figure to switch views. </span>The full model downloads once, about 33 MB.</p>
   </div>
   <AnatomyPlate href={atlasHref}/>
  </section>

  <section className="facts" aria-label="The model in numbers">
   {FACTS.map(f=><div className="fact" key={f.label}><i className="fact-rule" aria-hidden="true"/><span className="fact-value display" data-value={f.value}>{f.value.toLocaleString('en-US')}</span><span className="fact-label">{f.label}</span></div>)}
  </section>

  <ExplodeScene/>

  <section className="systems2" aria-labelledby="systems-title">
   <div className="section-head">
    <h2 id="systems-title" className="display reveal-heading">Fifteen systems, from bone to skin.</h2>
    <p className="reveal-up">Show one system on its own, compare a few together or switch them all on. Every part keeps its source name, so what you study matches what your textbook calls it.</p>
   </div>
   <div className="marquee" aria-label="Body systems">
    <div className="marquee-row"><div className="marquee-track"><Row list={SYSTEMS.slice(0,8)}/></div></div>
    <div className="marquee-row"><div className="marquee-track"><Row list={SYSTEMS.slice(8)}/></div></div>
   </div>
   <div className="section-foot reveal-up"><Link to={authed?'/app/systems':'/login?next=%2Fapp%2Fsystems'} className="text-link">Browse all systems</Link></div>
  </section>

  <section className="steps2" aria-labelledby="steps-title">
   <div className="section-head">
    <h2 id="steps-title" className="display reveal-heading">How a study session works</h2>
   </div>
   <ol className="steps-list">
    <li className="steps-rail" aria-hidden="true"><i className="steps-progress"/></li>
    {STEPS.map((s,i)=><li key={s.title} className="step"><span className="step-dot" aria-hidden="true">{i+1}</span><h3>{s.title}</h3><p>{s.text}</p></li>)}
   </ol>
  </section>

  <section className="closing2" aria-labelledby="closing-title">
   <h2 id="closing-title" className="sr-only">Built on open anatomy</h2>
   <p className="closing-statement display">Built on open anatomy: the Human Atlas viewer under the MIT licence, BodyParts3D models shared under CC BY 4.0, and research from PubMed.</p>
   <div className="closing2-actions">
    <Link to={atlasHref()} className="btn btn-light btn-lg magnetic">Open the atlas</Link>
    <Link to="/about" className="text-link on-dark">Read the credits</Link>
   </div>
  </section>
 </div>;
}
