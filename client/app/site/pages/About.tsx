import {useRef} from 'react';
import {Link} from 'react-router-dom';
import {useReveal} from '../useReveal';
const STACK=[
 ['Interface','React 19, TypeScript, Vite, React Router, Tailwind CSS'],
 ['3D viewer','Three.js, from the open-source Human Atlas project'],
 ['Server','Node.js with Express 5'],
 ['Database','MongoDB through Mongoose: users, savedStructures and studyNotes'],
 ['Sign-in','bcrypt password hashes and a signed token in an HttpOnly cookie'],
 ['Research','NCBI PubMed E-utilities, called from the server with caching and rate limits'],
];
export default function About(){
 const page=useRef<HTMLDivElement>(null);
 useReveal(page,'.about-grid section > *, .stack-card');
 return <div className="container prose-page" ref={page}>
  <header className="page-head single"><div><h1 className="display">About this project</h1>
   <p className="lede">Human Atlas Learning Studio turns an open-source 3D anatomy viewer into a place to study. You can sign in, save structures, keep notes and look up research.</p></div></header>
  <div className="about-grid">
   <section>
    <h2>What was reused</h2>
    <p>The 3D viewer, the anatomy model and its controls come from <a href="https://github.com/ashemag/human-atlas" target="_blank" rel="noreferrer">Human Atlas</a>, released under the MIT licence. That includes rotation, zoom, system toggles, search, isolation and the exploded view. They are kept as published, apart from small additions that connect them to the new pages.</p>
    <h2>What was built for this project</h2>
    <ul>
     <li>The landing page, sign-in and registration, the systems directory, Study Space and this page.</li>
     <li>An Express API with registration, login, logout and protected routes.</li>
     <li>MongoDB storage for saved structures and notes, private to each account.</li>
     <li>Save, note and research actions inside the atlas detail panel.</li>
     <li>A PubMed research search that runs on the server.</li>
    </ul>
    <h2>Anatomy data</h2>
    <p>BodyParts3D, © The Database Center for Life Science, licensed under <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC Attribution 4.0 International</a>. The model is a single adult male reference. It does not cover every structure or variation, and its geometry is simplified for the web. <a href="/ATTRIBUTION.md" target="_blank" rel="noreferrer">Full attribution</a>.</p>
    <h2>Not medical advice</h2>
    <p>This is an educational tool. Do not use it for diagnosis, treatment or surgical planning. Research results are links to published articles, not recommendations.</p>
   </section>
   <aside className="stack-card" aria-labelledby="stack-title">
    <h2 id="stack-title">Technology</h2>
    <dl>{STACK.map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>
    <Link to="/app/atlas" className="btn btn-dark btn-block">Open the atlas</Link>
   </aside>
  </div>
 </div>;
}
