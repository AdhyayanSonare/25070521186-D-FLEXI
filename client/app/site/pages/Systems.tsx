import {useMemo,useState} from 'react';
import {Link} from 'react-router-dom';
import {Search} from 'lucide-react';
import {SYSTEMS,type Concept,type SystemId} from '../../anatomy';
import {systemCounts,titleCase,useCatalog} from '../catalog';

// Well-known structures offered as starting points. Each is matched to its system from the atlas data.
const STARTERS=['skull','femur','sternum','patella','heart','brain','spinal cord','liver','stomach','pancreas','spleen','left lung','trachea','kidney','urinary bladder','esophagus','thyroid gland','diaphragm','right pectoralis major','left sartorius','aorta','eyeball','skin'];

export default function Systems(){
 const {atlas,error}=useCatalog();
 const [query,setQuery]=useState('');
 const counts=useMemo(()=>atlas?systemCounts(atlas):null,[atlas]);
 const starters=useMemo(()=>{
  const map={} as Record<SystemId,Concept[]>;
  if(!atlas)return map;
  const partSystem=new Map(atlas.parts.map(p=>[p.id,p.system]));
  for(const name of STARTERS){
   const c=atlas.concepts.find(x=>x.name.toLowerCase()===name);
   // A concept can span systems; file it under the system most of its parts belong to.
   const votes=new Map<SystemId,number>();c?.elements.forEach(e=>{const s=partSystem.get(e);if(s)votes.set(s,(votes.get(s)??0)+1);});
   const sys=[...votes].sort((x,y)=>y[1]-x[1])[0]?.[0];
   if(c&&sys)(map[sys]??=[]).push(c);
  }
  return map;
 },[atlas]);
 const term=query.trim().toLowerCase();
 const shown=SYSTEMS.filter(s=>(!counts||counts[s.id]>0)&&(!term||s.name.toLowerCase().includes(term)||s.description.toLowerCase().includes(term)||(starters[s.id]??[]).some(c=>c.name.toLowerCase().includes(term))));
 return <div className="container">
  <header className="page-head">
   <div>
    <h1 className="display">Systems</h1>
    <p className="lede">Choose a system to open the atlas with only that system showing, or jump straight to a structure.</p>
   </div>
   <label className="search-field">
    <Search size={16} aria-hidden="true"/>
    <span className="sr-only">Filter systems</span>
    <input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Filter, for example “blood” or “liver”"/>
   </label>
  </header>
  {error&&<div className="form-alert" role="alert">{error} Part counts are unavailable, but the links still work.</div>}
  <p className="result-line" aria-live="polite">{term?`${shown.length} of 15 systems match “${query.trim()}”.`:`${counts?Object.values(counts).reduce((a,b)=>a+b,0).toLocaleString():'2,234'} modelled parts across 15 systems.`}</p>
  {shown.length===0?<div className="empty"><h2>No systems match “{query.trim()}”.</h2><p>Try a broader word, such as “bone”, “blood” or “organ”.</p><button type="button" className="btn btn-line" onClick={()=>setQuery('')}>Clear the filter</button></div>:
  <ul className="system-list-page">
   {shown.map(s=><li key={s.id} className="system-entry" style={{['--sys' as string]:s.color}}>
    <div className="system-entry-head">
     <span className="swatch lg" aria-hidden="true"/>
     <h2>{s.name}</h2>
     <span className="count">{counts?`${counts[s.id].toLocaleString()} parts`:<span className="skeleton-text"/>}</span>
    </div>
    <p>{s.description}</p>
    <div className="system-entry-foot">
     <Link to={`/app/atlas?system=${s.id}`} className="btn btn-line btn-sm">Show in atlas</Link>
     {(starters[s.id]??[]).slice(0,3).map(c=><Link key={c.id} to={`/app/atlas?structure=${c.id}`} className="chip">{titleCase(c.name)}</Link>)}
    </div>
   </li>)}
  </ul>}
 </div>;
}
