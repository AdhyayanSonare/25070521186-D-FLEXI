import {useEffect,useRef,useState,type FormEvent} from 'react';
import {Link} from 'react-router-dom';
import {Bookmark,KeyRound,NotebookPen,ShieldCheck,UserRound} from 'lucide-react';
import {api,ApiError} from '../api';
import {useAuth} from '../auth';
import {useToast} from '../toast';
import {useCountUp,useReveal} from '../useReveal';

const PW_RULE=(p:string)=>p.length>=8&&p.length<=72&&/[A-Za-z]/.test(p)&&/\d/.test(p);

export default function Profile(){
 const {user,setUser}=useAuth(),toast=useToast();
 const page=useRef<HTMLDivElement>(null);
 const [counts,setCounts]=useState<{saved:number;notes:number}|null>(null);
 const [name,setName]=useState(user?.displayName??''),[nameBusy,setNameBusy]=useState(false),[nameErr,setNameErr]=useState('');
 const [pw,setPw]=useState({current:'',next:'',confirm:''}),[pwBusy,setPwBusy]=useState(false),[pwErr,setPwErr]=useState<Record<string,string>>({});
 useEffect(()=>{Promise.all([api.saved(),api.notes()]).then(([s,n])=>setCounts({saved:s.items.length,notes:n.items.length})).catch(()=>setCounts({saved:0,notes:0}));},[]);
 useReveal(page,'.profile-card, .profile-panel');
 useCountUp(page,'.pstat-num',[counts?.saved,counts?.notes]);
 if(!user)return null;
 const isAdmin=user.role==='admin';
 const since=new Date(user.createdAt).toLocaleDateString(undefined,{day:'numeric',month:'long',year:'numeric'});

 const saveName=async(e:FormEvent)=>{
  e.preventDefault();setNameErr('');
  const v=name.trim();if(v.length<2||v.length>60){setNameErr('Use 2 to 60 characters.');return;}
  setNameBusy(true);
  try{const r=await api.updateProfile(v);setUser(r.user);toast('Name updated.');}
  catch(x){setNameErr(x instanceof Error?x.message:'Could not update your name.');}
  finally{setNameBusy(false);}
 };
 const savePw=async(e:FormEvent)=>{
  e.preventDefault();
  const v:Record<string,string>={};
  if(!pw.current)v.current='Enter your current password.';
  if(!PW_RULE(pw.next))v.next='Use 8 to 72 characters with at least one letter and one number.';
  if(pw.confirm!==pw.next)v.confirm='The new passwords do not match.';
  setPwErr(v);if(Object.keys(v).length)return;
  setPwBusy(true);
  try{await api.changePassword(pw.current,pw.next);setPw({current:'',next:'',confirm:''});toast('Password changed. Use the new one next time you sign in.');}
  catch(x){
   const d=x instanceof ApiError?x.details:undefined;
   if(d?.currentPassword)setPwErr({current:'That is not your current password.'});
   else if(d?.newPassword)setPwErr({next:String(d.newPassword)});
   else setPwErr({form:x instanceof Error?x.message:'Could not change the password.'});
  }finally{setPwBusy(false);}
 };

 return <div className="container profile" ref={page}>
  <header className="page-head single"><div><h1 className="display">Profile</h1><p className="lede">Your account, your activity and your sign-in details.</p></div></header>
  <div className="profile-grid">
   <section className={`profile-card ${isAdmin?'is-admin':''}`} aria-label="Account">
    <div className="profile-avatar" aria-hidden="true">{user.displayName.split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase()}</div>
    <h2>{user.displayName}</h2>
    <p className="profile-email">{user.email}</p>
    <span className={`role-pill ${user.role}`}>{isAdmin?<><ShieldCheck size={13} aria-hidden="true"/> Administrator</>:<><UserRound size={13} aria-hidden="true"/> Student</>}</span>
    <dl className="profile-stats">
     <div><dt><Bookmark size={14} aria-hidden="true"/>Saved</dt><dd>{counts?<span className="pstat-num" data-value={counts.saved}>{counts.saved}</span>:<span className="skeleton-text"/>}</dd></div>
     <div><dt><NotebookPen size={14} aria-hidden="true"/>Notes</dt><dd>{counts?<span className="pstat-num" data-value={counts.notes}>{counts.notes}</span>:<span className="skeleton-text"/>}</dd></div>
    </dl>
    <p className="profile-since">Member since {since}</p>
    <div className="profile-links">
     <Link to="/app/study-space" className="btn btn-dark btn-sm">Open Study Space</Link>
     {isAdmin&&<Link to="/app/admin" className="btn btn-line btn-sm">Admin dashboard</Link>}
    </div>
   </section>

   <div className="profile-forms">
    <section className="profile-panel" aria-labelledby="name-title">
     <h2 id="name-title"><UserRound size={17} aria-hidden="true"/>Display name</h2>
     <p className="panel-help">Shown in the navigation and on the admin dashboard.</p>
     <form onSubmit={saveName} className="inline-form" noValidate>
      <div className={`field ${nameErr?'has-error':''}`}><label htmlFor="profile-name" className="sr-only">Display name</label><input id="profile-name" value={name} onChange={e=>setName(e.target.value)} maxLength={60} autoComplete="name" aria-invalid={!!nameErr}/>{nameErr&&<p className="field-error">{nameErr}</p>}</div>
      <button type="submit" className="btn btn-dark" disabled={nameBusy||name.trim()===user.displayName}>{nameBusy?'Saving…':'Save name'}</button>
     </form>
    </section>

    <section className="profile-panel" aria-labelledby="pw-title">
     <h2 id="pw-title"><KeyRound size={17} aria-hidden="true"/>Change password</h2>
     <p className="panel-help">Passwords are stored only as bcrypt hashes. Changing yours signs this browser in again with a fresh session.</p>
     <form onSubmit={savePw} className="pw-form" noValidate>
      {pwErr.form&&<div className="form-alert" role="alert">{pwErr.form}</div>}
      {([['current','Current password','current-password'],['next','New password','new-password'],['confirm','Confirm new password','new-password']] as const).map(([k,label,ac])=>
       <div key={k} className={`field ${pwErr[k]?'has-error':''}`}>
        <label htmlFor={`pw-${k}`}>{label}</label>
        <input id={`pw-${k}`} type="password" autoComplete={ac} value={pw[k]} onChange={e=>setPw(s=>({...s,[k]:e.target.value}))} aria-invalid={!!pwErr[k]}/>
        {pwErr[k]&&<p className="field-error">{pwErr[k]}</p>}
       </div>)}
      <button type="submit" className="btn btn-dark" disabled={pwBusy}>{pwBusy?'Changing…':'Change password'}</button>
     </form>
    </section>
   </div>
  </div>
 </div>;
}
