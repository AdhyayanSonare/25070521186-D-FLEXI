import {useEffect,useMemo,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import {RefreshCw,Search,ShieldCheck,Trash2} from 'lucide-react';
import {api,type AdminStats,type AdminUser} from '../api';
import {useAuth} from '../auth';
import {useToast} from '../toast';
import {systemOf,titleCase} from '../catalog';
import {gsap,useGSAP,MOTION_OK} from '../gsap';

const fmt=(iso:string)=>new Date(iso).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'});

export default function Admin(){
 const {user}=useAuth(),toast=useToast();
 const [stats,setStats]=useState<AdminStats|null>(null),[users,setUsers]=useState<AdminUser[]|null>(null),[error,setError]=useState('');
 const [query,setQuery]=useState(''),[confirm,setConfirm]=useState<string|null>(null),[busy,setBusy]=useState<string|null>(null),[leaving,setLeaving]=useState<string|null>(null);
 const page=useRef<HTMLDivElement>(null);
 const load=()=>{setError('');Promise.all([api.adminStats(),api.adminUsers()]).then(([s,u])=>{setStats(s);setUsers(u.items);}).catch(e=>setError(e.message));};
 useEffect(load,[]);

 // Tiles count up, bars grow and rows rise once the data arrives.
 useGSAP(()=>{
  if(!stats||!users)return;
  const mm=gsap.matchMedia();
  mm.add(MOTION_OK,()=>{
   gsap.utils.toArray<HTMLElement>('.tile-num').forEach(el=>{const t=Number(el.dataset.value),o={v:0};gsap.to(o,{v:t,duration:1.3,ease:'power2.out',onUpdate:()=>{el.textContent=Math.round(o.v).toLocaleString('en-US');}});});
   gsap.from('.tile',{y:24,autoAlpha:0,stagger:.07,duration:.8,ease:'expo.out'});
   gsap.from('.bar-fill',{scaleX:0,transformOrigin:'left center',stagger:.08,duration:1.1,ease:'expo.out',delay:.2});
   gsap.fromTo('.admin-row',{y:14,autoAlpha:0},{y:0,autoAlpha:1,stagger:.04,duration:.6,ease:'power3.out',delay:.25,clearProps:'all'});
  });
 },{scope:page,dependencies:[!!stats,!!users],revertOnUpdate:true});

 const shown=useMemo(()=>{const t=query.trim().toLowerCase();return (users??[]).filter(u=>!t||u.displayName.toLowerCase().includes(t)||u.email.includes(t));},[users,query]);
 const maxCount=Math.max(1,...(stats?.topStructures.map(t=>t.count)??[1]));

 const remove=async(u:AdminUser)=>{
  setBusy(u.id);
  try{
   const r=await api.adminDeleteUser(u.id);
   setLeaving(u.id);
   setTimeout(()=>{setUsers(list=>list?.filter(x=>x.id!==u.id)??list);setLeaving(null);api.adminStats().then(setStats).catch(()=>{});},240);
   toast(`Deleted ${u.displayName} with ${r.removedSaved} saved structures and ${r.removedNotes} notes.`,'info');
  }catch(e){toast(e instanceof Error?e.message:'Could not delete the user.','error');}
  finally{setBusy(null);setConfirm(null);}
 };

 if(error&&!stats)return <div className="container"><div className="empty tall"><h1 className="display">The admin data could not load.</h1><p>{error}</p><button className="btn btn-dark" onClick={load}>Try again</button></div></div>;

 const tiles=stats?[['Registered users',stats.users,`${stats.usersThisWeek} joined this week`],['Saved structures',stats.saved,'across every Study Space'],['Study notes',stats.notes,`${stats.notesThisWeek} written this week`],['Administrators',stats.admins,'accounts with admin access']] as const:null;
 return <div className="container admin" ref={page}>
  <header className="page-head">
   <div>
    <p className="admin-kicker"><ShieldCheck size={16} aria-hidden="true"/>Signed in as an administrator</p>
    <h1 className="display">Admin</h1>
    <p className="lede">Everyone using the studio, what they save most and how much they write. Figures come live from MongoDB.</p>
   </div>
   <button type="button" className="btn btn-line" onClick={load}><RefreshCw size={15} aria-hidden="true"/>Refresh</button>
  </header>

  <dl className="tiles" aria-label="Platform totals">
   {tiles?tiles.map(([k,v,sub])=><div className="tile" key={k}><dt>{k}</dt><dd><span className="tile-num display" data-value={v}>{v.toLocaleString('en-US')}</span></dd><span className="tile-sub">{sub}</span></div>)
   :[0,1,2,3].map(i=><div className="tile" key={i}><dt><span className="skeleton-text"/></dt><dd><span className="skeleton-text"/></dd></div>)}
  </dl>

  <div className="admin-grid">
   <section className="panel" aria-labelledby="top-title">
    <h2 id="top-title">Most saved structures</h2>
    {!stats?<p className="muted-line">Loading…</p>:stats.topStructures.length===0?<p className="muted-line">Nobody has saved a structure yet.</p>:
    <ol className="bars">{stats.topStructures.map(t=>{const sys=systemOf(t.system);return <li key={t.structureId}>
     <div className="bar-head"><Link to={`/app/atlas?structure=${encodeURIComponent(t.structureId)}`}>{titleCase(t.name)}</Link><span>{t.count} {t.count===1?'user':'users'}</span></div>
     <div className="bar"><i className="bar-fill" style={{width:`${(t.count/maxCount)*100}%`,background:sys?.color??'#2f6f6a'}}/></div>
    </li>;})}</ol>}
   </section>

   <section className="panel panel-wide" aria-labelledby="users-title">
    <div className="panel-head">
     <h2 id="users-title">Users <span className="count-chip">{users?.length??0}</span></h2>
     <label className="search-field small"><Search size={15} aria-hidden="true"/><span className="sr-only">Search users</span><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search name or email"/></label>
    </div>
    <div className="table-wrap">
     <table className="admin-table">
      <thead><tr><th scope="col">User</th><th scope="col">Role</th><th scope="col">Joined</th><th scope="col" className="num">Saved</th><th scope="col" className="num">Notes</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
      <tbody>{!users?<tr><td colSpan={6} className="muted-line">Loading users…</td></tr>:shown.length===0?<tr><td colSpan={6} className="muted-line">No users match “{query}”.</td></tr>:shown.map(u=><tr key={u.id} className={`admin-row ${leaving===u.id?'is-gone':''}`}>
       <td><div className="user-cell"><span className="avatar" aria-hidden="true">{u.displayName.slice(0,1).toUpperCase()}</span><span><b>{u.displayName}{u.id===user?.id&&<em> (you)</em>}</b><small>{u.email}</small></span></div></td>
       <td><span className={`role-pill ${u.role}`}>{u.role==='admin'?'Admin':'Student'}</span></td>
       <td>{fmt(u.createdAt)}</td>
       <td className="num">{u.saved}</td>
       <td className="num">{u.notes}</td>
       <td className="actions">{u.id===user?.id?null:confirm===u.id?<span className="confirm-row"><span>Delete this user and their data?</span><button type="button" className="study-link" onClick={()=>setConfirm(null)}>Cancel</button><button type="button" className="btn btn-danger btn-sm" disabled={busy===u.id} onClick={()=>remove(u)}>{busy===u.id?'Deleting…':'Delete'}</button></span>
        :<button type="button" className="icon-btn danger" onClick={()=>setConfirm(u.id)} aria-label={`Delete ${u.displayName}`} title="Delete user"><Trash2 size={16}/></button>}</td>
      </tr>)}</tbody>
     </table>
    </div>
   </section>
  </div>
 </div>;
}
