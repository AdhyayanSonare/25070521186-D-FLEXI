import {Link} from 'react-router-dom';
import {SYSTEMS} from '../../anatomy';
import {useAuth} from '../auth';

// Callout points measured on the rendered plate (percent of image width/height). Each opens that structure in the Atlas.
const CALLOUTS=[
 {name:'Skull',id:'FMA46565',x:51,y:6.2,side:'left'},
 {name:'Sternum',id:'FMA7485',x:47.6,y:23,side:'right'},
 {name:'Pectoralis major',id:'FMA13373',x:38.5,y:25,side:'left'},
 {name:'Sartorius',id:'FMA22355',x:59,y:57,side:'right'},
 {name:'Patella',id:'FMA24486',x:42,y:70.3,side:'left'},
] as const;

const STEPS=[
 {title:'Find a structure',text:'Search 3,432 named structures, or tap any part of the model to identify it.'},
 {title:'Save it',text:'Keep the structures you are learning in your Study Space, one click from the model.'},
 {title:'Write notes',text:'Record what you need to remember beside each structure, and edit it as you learn more.'},
 {title:'Read further',text:'Pull up the most relevant PubMed articles for a structure when you want to go deeper.'},
];

export default function Landing(){
 const {status}=useAuth();
 const authed=status==='authed';
 const atlasHref=(q='')=>authed?`/app/atlas${q}`:`/login?next=${encodeURIComponent(`/app/atlas${q}`)}`;
 return <div className="landing">
  <section className="hero" aria-labelledby="hero-title">
   <div className="hero-copy">
    <h1 id="hero-title" className="display">Study the body one structure at a time.</h1>
    <p className="lede">Turn, take apart and search a 3D model of 2,234 anatomical parts. Save the ones you are learning, keep notes beside them and find research when you want to go deeper.</p>
    <div className="hero-actions">
     <Link to={atlasHref()} className="btn btn-dark btn-lg">Open the atlas</Link>
     {authed?<Link to="/app/study-space" className="btn btn-line btn-lg">Go to Study Space</Link>:<Link to="/register" className="btn btn-line btn-lg">Create a free account</Link>}
    </div>
    <p className="hero-foot">Works in the browser on laptops and phones. The model downloads once, about 33 MB.</p>
   </div>
   <figure className="plate">
    <div className="plate-art">
     <img src="/studio/plate-body.webp" width={500} height={1080} alt="The 3D adult male model in the atlas, showing muscles, blood vessels and parts of the skeleton." fetchPriority="high"/>
     {CALLOUTS.map((c,i)=><Link key={c.id} to={atlasHref(`?structure=${c.id}`)} className={`callout callout-${c.side}`} style={{left:`${c.x}%`,top:`${c.y}%`,['--i' as string]:i,['--x' as string]:c.x}}>
      <span className="callout-dot" aria-hidden="true"/><span className="callout-line" aria-hidden="true"/><span className="callout-label">{c.name}</span>
     </Link>)}
    </div>
    <ul className="callout-chips" aria-label="Structures in this figure">{CALLOUTS.map(c=><li key={c.id}><Link to={atlasHref(`?structure=${c.id}`)} className="chip">{c.name}</Link></li>)}</ul>
    <figcaption><span>Fig. 1</span> Adult male reference anatomy, BodyParts3D. Select a label to open it in the atlas.</figcaption>
   </figure>
  </section>

  <section className="band systems-band" aria-labelledby="systems-title">
   <div className="band-head">
    <h2 id="systems-title" className="display">Fifteen systems, from bone to skin.</h2>
    <p>Show one system on its own, compare a few together or switch them all on. Every part keeps its source name, so what you study matches what your textbook calls it.</p>
    <Link to={authed?'/app/systems':'/login?next=%2Fapp%2Fsystems'} className="text-link">Browse the systems</Link>
   </div>
   <ul className="system-index">
    {SYSTEMS.map(s=><li key={s.id}><span className="swatch" style={{background:s.color}} aria-hidden="true"/>{s.name}</li>)}
   </ul>
  </section>

  <section className="band" aria-labelledby="steps-title">
   <div className="band-head narrow">
    <h2 id="steps-title" className="display">How a study session works</h2>
   </div>
   <ol className="steps">
    {STEPS.map((s,i)=><li key={s.title}><span className="step-no" aria-hidden="true">{i+1}</span><h3>{s.title}</h3><p>{s.text}</p></li>)}
   </ol>
  </section>

  <section className="closing" aria-labelledby="closing-title">
   <div>
    <h2 id="closing-title" className="display">Built on open anatomy.</h2>
    <p>The 3D viewer is the open-source Human Atlas project, released under the MIT licence. The anatomy comes from BodyParts3D by the Database Center for Life Science, shared under CC BY 4.0. Research links come from PubMed.</p>
   </div>
   <div className="closing-actions">
    <Link to={atlasHref()} className="btn btn-light btn-lg">Open the atlas</Link>
    <Link to="/about" className="text-link on-dark">Read the credits</Link>
   </div>
  </section>
 </div>;
}
