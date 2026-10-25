import {useCallback,useEffect,useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {LayoutGrid,NotebookTabs} from 'lucide-react';
import Home from '../../page';
import type {SystemId} from '../../anatomy';
import {api,type Saved} from '../api';
import {StudyActions} from '../StudyActions';
import {ResearchSheet} from '../ResearchSheet';

export default function AtlasRoute(){
 const [params]=useSearchParams();
 const [saved,setSaved]=useState<Saved[]|null>(null),[research,setResearch]=useState<string|null>(null);
 // The Atlas is a full-screen canvas: lock page scrolling only while it is mounted.
 useEffect(()=>{document.documentElement.classList.add('atlas-mode');return()=>document.documentElement.classList.remove('atlas-mode');},[]);
 const refresh=useCallback(()=>api.saved().then(r=>setSaved(r.items)).catch(()=>setSaved([])),[]);
 useEffect(()=>{refresh();},[refresh]);
 const nav=<><Link to="/app/systems" className="atlas-link" aria-label="Systems directory"><LayoutGrid size={17}/><span>Systems</span></Link><Link to="/app/study-space" className="atlas-link" aria-label="Study Space"><NotebookTabs size={17}/><span>Study Space</span>{saved&&saved.length>0&&<b className="atlas-count">{saved.length}</b>}</Link></>;
 return <>
  <Home initialSystem={params.get('system') as SystemId|null} initialStructure={params.get('structure')} nav={nav}
   studyActions={t=><StudyActions key={t.id} target={t} saved={saved} onSavedChange={setSaved} onResearch={setResearch}/>}/>
  <ResearchSheet term={research} onClose={()=>setResearch(null)}/>
 </>;
}
