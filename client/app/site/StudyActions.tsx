import {useState} from 'react';
import {Bookmark,BookmarkCheck,BookOpenText,NotebookPen} from 'lucide-react';
import type {StudyTarget} from '../page';
import {api,ApiError,type Saved} from './api';
import {useToast} from './toast';

interface Props {target:StudyTarget;saved:Saved[]|null;onSavedChange:(s:Saved[])=>void;onResearch:(term:string)=>void}

/** Save, note and research actions for the structure selected in the Atlas detail panel. */
export function StudyActions({target,saved,onSavedChange,onResearch}:Props){
 const toast=useToast();
 const record=saved?.find(s=>s.structureId===target.id);
 const [busy,setBusy]=useState(false),[noteOpen,setNoteOpen]=useState(false),[note,setNote]=useState(''),[noteBusy,setNoteBusy]=useState(false),[noteError,setNoteError]=useState('');
 const toggleSave=async()=>{
  if(!saved)return;
  setBusy(true);
  try{
   if(record){await api.unsave(record.id);onSavedChange(saved.filter(s=>s.id!==record.id));toast(`Removed ${target.name} from Study Space.`,'info');}
   else{const r=await api.save({structureId:target.id,name:target.name,system:target.system,pieces:target.pieces});onSavedChange([r.item,...saved]);toast(`Saved ${target.name} to Study Space.`);}
  }catch(e){
   const item=e instanceof ApiError?(e.details as {item?:Saved}|undefined)?.item:undefined;
   if(item){onSavedChange([item,...saved.filter(s=>s.id!==item.id)]);toast(`${target.name} is already in Study Space.`,'info');}
   else toast(e instanceof Error?e.message:'Could not save.','error');
  }finally{setBusy(false);}
 };
 const saveNote=async(e:React.FormEvent)=>{
  e.preventDefault();
  if(!note.trim()){setNoteError('Write something before saving.');return;}
  setNoteBusy(true);setNoteError('');
  try{await api.addNote({structureId:target.id,structureName:target.name,content:note});setNote('');setNoteOpen(false);toast('Note saved to Study Space.');}
  catch(err){setNoteError(err instanceof Error?err.message:'Could not save the note.');}
  finally{setNoteBusy(false);}
 };
 return <div className="study-actions">
  <div className="study-row">
   <button type="button" className={`study-btn ${record?'is-on':''}`} onClick={toggleSave} disabled={busy||!saved} aria-pressed={!!record} title={record?'Remove from Study Space':'Save to Study Space'}>
    {record?<BookmarkCheck size={16}/>:<Bookmark size={16}/>}<span>{busy?'Saving…':record?'Saved':'Save'}</span>
   </button>
   <button type="button" className={`study-btn ${noteOpen?'is-on':''}`} onClick={()=>{setNoteOpen(o=>!o);setNoteError('');}} aria-expanded={noteOpen}><NotebookPen size={16}/><span>Note</span></button>
   <button type="button" className="study-btn" onClick={()=>onResearch(target.name)}><BookOpenText size={16}/><span>Research</span></button>
  </div>
  {noteOpen&&<form className="study-note" onSubmit={saveNote}>
   <label htmlFor="atlas-note" className="sr-only">Note about {target.name}</label>
   <textarea id="atlas-note" autoFocus rows={3} maxLength={5000} value={note} onChange={e=>setNote(e.target.value)} placeholder={`What do you want to remember about the ${target.name}?`}/>
   {noteError&&<p className="field-error" role="alert">{noteError}</p>}
   <div className="study-note-actions"><button type="button" className="study-link" onClick={()=>setNoteOpen(false)}>Cancel</button><button type="submit" className="study-submit" disabled={noteBusy}>{noteBusy?'Saving…':'Save note'}</button></div>
  </form>}
 </div>;
}
