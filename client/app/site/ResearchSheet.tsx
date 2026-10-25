import {useEffect,useState} from 'react';
import {ArrowUpRight,RotateCcw} from 'lucide-react';
import {Sheet,SheetContent,SheetDescription,SheetTitle} from '@/components/ui/sheet';
import {api,type Research} from './api';

/** Related PubMed articles, fetched through our API only when the user asks. */
export function ResearchSheet({term,onClose}:{term:string|null;onClose:()=>void}){
 const [data,setData]=useState<Research|null>(null),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
 useEffect(()=>{
  if(!term)return;
  let live=true;setData(null);setError('');
  api.research(term).then(r=>live&&setData(r)).catch(e=>live&&setError(e.message));
  return()=>{live=false;};
 },[term,attempt]);
 return <Sheet open={!!term} onOpenChange={o=>{if(!o)onClose();}}>
  <SheetContent className="about-sheet glass research-sheet">
   <div className="eyebrow">RELATED RESEARCH</div>
   <SheetTitle className="structure-title">{term}</SheetTitle>
   <SheetDescription>Recent and relevant articles from PubMed, the U.S. National Library of Medicine index.</SheetDescription>
   <div className="research-body" aria-busy={!data&&!error}>
    {!data&&!error&&<ul className="research-list" aria-label="Loading articles">{[0,1,2].map(i=><li key={i} className="skeleton-item"><span/><span/><span/></li>)}</ul>}
    {error&&<div className="research-error" role="alert"><p>{error}</p><p>The rest of the atlas keeps working.</p><button type="button" onClick={()=>setAttempt(a=>a+1)}><RotateCcw size={14}/>Try again</button></div>}
    {data&&data.articles.length===0&&<p className="research-empty">PubMed has no anatomy articles that mention “{data.term}” in their title or abstract. Try a broader structure, such as the organ it belongs to.</p>}
    {data&&data.articles.length>0&&<>
     <p className="research-count">{data.total.toLocaleString()} matching articles. Showing the {data.articles.length} most relevant.</p>
     <ol className="research-list">{data.articles.map(a=><li key={a.pmid}>
      <a href={a.url} target="_blank" rel="noreferrer">{a.title}<ArrowUpRight size={14} aria-hidden="true"/></a>
      <span className="research-meta">{a.journal}{a.published&&<>, {a.published}</>}</span>
      {a.authors.length>0&&<span className="research-authors">{a.authors.join(', ')}{a.moreAuthors>0&&` and ${a.moreAuthors} more`}</span>}
     </li>)}</ol>
    </>}
   </div>
   <p className="research-note">Article links open on pubmed.ncbi.nlm.nih.gov. They support study and are not medical advice.</p>
  </SheetContent>
 </Sheet>;
}
