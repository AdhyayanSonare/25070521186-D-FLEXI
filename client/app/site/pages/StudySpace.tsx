import {useEffect,useMemo,useRef,useState,type FormEvent} from 'react';
import {Link} from 'react-router-dom';
import {BookOpenText,Bookmark,NotebookPen,Trash2,X} from 'lucide-react';
import {api,type Note,type Saved} from '../api';
import {useAuth} from '../auth';
import {useToast} from '../toast';
import {loadAtlas,systemOf,titleCase} from '../catalog';
import {ResearchSheet} from '../ResearchSheet';
import {useCountUp} from '../useReveal';

const fmtDate=(iso:string)=>new Date(iso).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'});
function relative(iso:string){
 const s=(Date.now()-new Date(iso).getTime())/1000;
 if(s<60)return 'just now';if(s<3600)return `${Math.floor(s/60)} min ago`;if(s<86400)return `${Math.floor(s/3600)} h ago`;
 const d=Math.floor(s/86400);return d<7?`${d} day${d>1?'s':''} ago`:fmtDate(iso);
}

export default function StudySpace(){
 const {user}=useAuth(),toast=useToast();
 const [saved,setSaved]=useState<Saved[]|null>(null),[notes,setNotes]=useState<Note[]|null>(null),[error,setError]=useState('');
 const [filter,setFilter]=useState<string|null>(null),[leaving,setLeaving]=useState<Set<string>>(new Set()),[research,setResearch]=useState<string|null>(null);
 const composer=useRef<HTMLTextAreaElement>(null),page=useRef<HTMLDivElement>(null);
 const [draft,setDraft]=useState({structureId:'',structureName:'',content:''});

 const load=()=>{setError('');Promise.all([api.saved(),api.notes()]).then(([s,n])=>{setSaved(s.items);setNotes(n.items);}).catch(e=>setError(e.message));};
 useEffect(load,[]);
 useEffect(()=>{if(saved?.length&&!draft.structureId)setDraft(d=>({...d,structureId:saved[0].structureId,structureName:saved[0].name}));},[saved]);

 const stats=useMemo(()=>{
  if(!saved||!notes)return null;
  const systems=new Set(saved.map(s=>s.system).filter(Boolean));
  const times=[...saved.map(s=>s.createdAt),...notes.map(n=>n.updatedAt)].sort();
  return {saved:saved.length,notes:notes.length,systems:systems.size,last:times.at(-1)};
 },[saved,notes]);
 const noteCount=useMemo(()=>{const m=new Map<string,number>();notes?.forEach(n=>m.set(n.structureId,(m.get(n.structureId)??0)+1));return m;},[notes]);
 const shownNotes=notes?.filter(n=>!filter||n.structureId===filter)??[];

 const leave=(id:string,after:()=>void)=>{setLeaving(s=>new Set(s).add(id));setTimeout(()=>{after();setLeaving(s=>{const n=new Set(s);n.delete(id);return n;});},220);};
 const remove=async(item:Saved)=>{
  try{await api.unsave(item.id);leave(item.id,()=>setSaved(s=>s?.filter(x=>x.id!==item.id)??s));toast(`Removed ${titleCase(item.name)}.`,'info');if(filter===item.structureId)setFilter(null);}
  catch(e){toast(e instanceof Error?e.message:'Could not remove it.','error');}
 };
 const startNote=(item:Saved)=>{setDraft(d=>({...d,structureId:item.structureId,structureName:item.name}));composer.current?.focus();composer.current?.scrollIntoView({behavior:'smooth',block:'center'});};

 useCountUp(page,'.stat-num',[stats?.saved,stats?.notes,stats?.systems]);
 if(error&&!saved)return <div className="container"><div className="empty tall"><h1 className="display">Study Space could not load.</h1><p>{error}</p><button className="btn btn-dark" onClick={load}>Try again</button></div></div>;

 return <div className="container study" ref={page}>
  <header className="page-head single"><div>
   <h1 className="display">Study Space</h1>
   <p className="lede">{user?`${user.displayName}, here`:'Here'} is everything you have saved from the atlas, with your notes beside it.</p>
  </div></header>

  <dl className="stats" aria-label="Your progress">
   {[['Saved structures',stats?.saved],['Notes',stats?.notes],['Systems covered',stats?`${stats.systems} of 15`:undefined],['Last activity',stats?(stats.last?relative(stats.last):'None yet'):undefined]].map(([k,v])=>
    <div key={k as string}><dt>{k}</dt><dd>{v===undefined?<span className="skeleton-text"/>:typeof v==='number'?<span className="stat-num" data-value={v}>{v}</span>:v}</dd></div>)}
  </dl>

  <div className="study-grid">
   <section aria-labelledby="saved-title" className="study-col">
    <div className="col-head"><h2 id="saved-title">Saved structures</h2><Link to="/app/atlas" className="text-link">Add from the atlas</Link></div>
    {!saved?<ul className="saved-list">{[0,1,2].map(i=><li key={i} className="saved-item skeleton-item"><span/><span/></li>)}</ul>:
     saved.length===0?<div className="empty"><Bookmark size={22} aria-hidden="true"/><h3>Nothing saved yet</h3><p>Open the atlas, select a structure and choose Save. It will appear here.</p><Link to="/app/atlas" className="btn btn-dark btn-sm">Open the atlas</Link></div>:
     <ul className="saved-list">{saved.map(item=>{const sys=systemOf(item.system),n=noteCount.get(item.structureId)??0;return <li key={item.id} className={`saved-item ${leaving.has(item.id)?'is-leaving':''} ${filter===item.structureId?'is-active':''}`}>
      <span className="swatch" style={{background:sys?.color??'#9aa5ae'}} aria-hidden="true"/>
      <div className="saved-main">
       <Link to={`/app/atlas?structure=${encodeURIComponent(item.structureId)}`} className="saved-name">{titleCase(item.name)}</Link>
       <span className="saved-meta">{sys?.name??'Anatomy'}, {item.pieces} {item.pieces===1?'part':'parts'}. Saved {fmtDate(item.createdAt)}</span>
      </div>
      <div className="saved-actions">
       {n>0&&<button type="button" className="pill" aria-pressed={filter===item.structureId} onClick={()=>setFilter(f=>f===item.structureId?null:item.structureId)}>{n} {n===1?'note':'notes'}</button>}
       <button type="button" className="icon-btn" onClick={()=>startNote(item)} aria-label={`Write a note about ${item.name}`} title="Write a note"><NotebookPen size={16}/></button>
       <button type="button" className="icon-btn" onClick={()=>setResearch(item.name)} aria-label={`Related research for ${item.name}`} title="Related research"><BookOpenText size={16}/></button>
       <button type="button" className="icon-btn danger" onClick={()=>remove(item)} aria-label={`Remove ${item.name}`} title="Remove"><Trash2 size={16}/></button>
      </div>
     </li>;})}</ul>}
   </section>

   <section aria-labelledby="notes-title" className="study-col">
    <div className="col-head"><h2 id="notes-title">Notes</h2>{filter&&<button type="button" className="pill is-on" onClick={()=>setFilter(null)}>{titleCase(notes?.find(n=>n.structureId===filter)?.structureName??'Filtered')}<X size={13} aria-label="Show all notes"/></button>}</div>
    <NoteComposer draft={draft} setDraft={setDraft} saved={saved??[]} loaded={saved!==null} textarea={composer} onCreated={n=>setNotes(ns=>[n,...(ns??[])])}/>
    {!notes?<ul className="note-list">{[0,1].map(i=><li key={i} className="note skeleton-item"><span/><span/><span/></li>)}</ul>:
     shownNotes.length===0?<p className="muted-line">{notes.length===0?'No notes yet. Your first note will appear here.':'No notes for this structure.'}</p>:
     <ul className="note-list">{shownNotes.map(n=><NoteItem key={n.id} note={n} leaving={leaving.has(n.id)}
      onSaved={u=>setNotes(ns=>ns?.map(x=>x.id===u.id?u:x)??ns)}
      onDeleted={()=>leave(n.id,()=>setNotes(ns=>ns?.filter(x=>x.id!==n.id)??ns))}/>)}</ul>}
   </section>
  </div>
  <ResearchSheet term={research} onClose={()=>setResearch(null)}/>
 </div>;
}

interface Draft {structureId:string;structureName:string;content:string}
function NoteComposer({draft,setDraft,saved,loaded,textarea,onCreated}:{draft:Draft;setDraft:React.Dispatch<React.SetStateAction<Draft>>;saved:Saved[];loaded:boolean;textarea:React.RefObject<HTMLTextAreaElement|null>;onCreated:(n:Note)=>void}){
 const toast=useToast();
 const [other,setOther]=useState(false),[names,setNames]=useState<{id:string;name:string}[]>([]),[busy,setBusy]=useState(false),[err,setErr]=useState('');
 useEffect(()=>{if(loaded)setOther(saved.length===0);},[loaded,saved.length===0]);
 useEffect(()=>{if(other&&!names.length)loadAtlas().then(a=>setNames(a.concepts.map(c=>({id:c.id,name:c.name})))).catch(()=>{});},[other]);
 const pickOther=(value:string)=>{const m=names.find(c=>c.name.toLowerCase()===value.trim().toLowerCase());setDraft(d=>({...d,structureName:value,structureId:m?.id??''}));};
 const submit=async(e:FormEvent)=>{
  e.preventDefault();setErr('');
  if(!draft.structureId){setErr(other?'Choose a structure name from the suggestions.':'Choose a structure.');return;}
  if(!draft.content.trim()){setErr('Write something before saving.');return;}
  setBusy(true);
  try{const r=await api.addNote({structureId:draft.structureId,structureName:draft.structureName,content:draft.content});onCreated(r.item);setDraft(d=>({...d,content:''}));toast('Note saved.');}
  catch(x){setErr(x instanceof Error?x.message:'Could not save the note.');}
  finally{setBusy(false);}
 };
 return <form className="composer" onSubmit={submit}>
  <div className="composer-row">
   <label htmlFor="note-structure">About</label>
   {!other?<select id="note-structure" value={draft.structureId} onChange={e=>{if(e.target.value==='__other'){setOther(true);setDraft(d=>({...d,structureId:'',structureName:''}));return;}const s=saved.find(x=>x.structureId===e.target.value);setDraft(d=>({...d,structureId:e.target.value,structureName:s?.name??''}));}}>
    {saved.map(s=><option key={s.id} value={s.structureId}>{titleCase(s.name)}</option>)}
    <option value="__other">Another structure…</option>
   </select>:<>
    <input id="note-structure" list="structure-names" value={draft.structureName} onChange={e=>pickOther(e.target.value)} placeholder={names.length?'Type a structure, such as heart':'Loading names…'} autoComplete="off"/>
    <datalist id="structure-names">{names.filter(c=>draft.structureName.length>1&&c.name.toLowerCase().includes(draft.structureName.toLowerCase())).slice(0,30).map(c=><option key={c.id} value={c.name}/>)}</datalist>
    {saved.length>0&&<button type="button" className="study-link" onClick={()=>{setOther(false);setDraft(d=>({...d,structureId:saved[0].structureId,structureName:saved[0].name}));}}>Use a saved one</button>}
   </>}
  </div>
  <label htmlFor="note-content" className="sr-only">Note</label>
  <textarea id="note-content" ref={textarea} rows={3} maxLength={5000} value={draft.content} onChange={e=>setDraft(d=>({...d,content:e.target.value}))} placeholder="Write a note: a definition, a mnemonic, a question for class…"/>
  {err&&<p className="field-error" role="alert">{err}</p>}
  <div className="composer-foot"><span className="char-count">{draft.content.length}/5000</span><button type="submit" className="btn btn-dark btn-sm" disabled={busy}>{busy?'Saving…':'Save note'}</button></div>
 </form>;
}

function NoteItem({note,leaving,onSaved,onDeleted}:{note:Note;leaving:boolean;onSaved:(n:Note)=>void;onDeleted:()=>void}){
 const toast=useToast();
 const [editing,setEditing]=useState(false),[text,setText]=useState(note.content),[confirm,setConfirm]=useState(false),[busy,setBusy]=useState(false),[err,setErr]=useState('');
 const save=async(e:FormEvent)=>{e.preventDefault();if(!text.trim()){setErr('A note cannot be empty. Delete it instead.');return;}setBusy(true);setErr('');try{const r=await api.editNote(note.id,text);onSaved(r.item);setEditing(false);toast('Note updated.');}catch(x){setErr(x instanceof Error?x.message:'Could not update.');}finally{setBusy(false);}};
 const del=async()=>{setBusy(true);try{await api.deleteNote(note.id);onDeleted();toast('Note deleted.','info');}catch(x){toast(x instanceof Error?x.message:'Could not delete.','error');setBusy(false);setConfirm(false);}};
 const edited=note.updatedAt!==note.createdAt;
 return <li className={`note ${leaving?'is-leaving':''}`}>
  <div className="note-head"><Link to={`/app/atlas?structure=${encodeURIComponent(note.structureId)}`} className="note-structure">{titleCase(note.structureName)}</Link><time dateTime={note.updatedAt}>{edited?'Edited ':''}{relative(note.updatedAt)}</time></div>
  {editing?<form onSubmit={save} className="note-edit">
   <label htmlFor={`edit-${note.id}`} className="sr-only">Edit note</label>
   <textarea id={`edit-${note.id}`} autoFocus rows={4} maxLength={5000} value={text} onChange={e=>setText(e.target.value)}/>
   {err&&<p className="field-error" role="alert">{err}</p>}
   <div className="note-actions"><button type="button" className="study-link" onClick={()=>{setEditing(false);setText(note.content);setErr('');}}>Cancel</button><button type="submit" className="btn btn-dark btn-sm" disabled={busy}>{busy?'Saving…':'Save changes'}</button></div>
  </form>:<>
   <p className="note-body">{note.content}</p>
   <div className="note-actions">{confirm?<><span className="confirm-text">Delete this note?</span><button type="button" className="study-link" onClick={()=>setConfirm(false)} disabled={busy}>Keep it</button><button type="button" className="btn btn-danger btn-sm" onClick={del} disabled={busy}>{busy?'Deleting…':'Delete'}</button></>:<><button type="button" className="study-link" onClick={()=>setEditing(true)}>Edit</button><button type="button" className="study-link danger" onClick={()=>setConfirm(true)}>Delete</button></>}</div>
  </>}
 </li>;
}
