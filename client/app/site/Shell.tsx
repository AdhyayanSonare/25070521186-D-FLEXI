import {useState} from 'react';
import {Link,NavLink,Outlet,useLocation,useNavigate} from 'react-router-dom';
import {useAuth} from './auth';
import {useToast} from './toast';

export function Mark(){
 // A simple specimen-plate mark: a frame with a leader line and a point.
 return <svg className="mark" viewBox="0 0 28 28" aria-hidden="true"><rect x="1.5" y="1.5" width="25" height="25" rx="7" fill="none" stroke="currentColor" strokeWidth="1.5"/><path d="M8 19 L16 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="18" cy="9.5" r="2.6" fill="var(--teal)"/></svg>;
}

export function Shell(){
 const {user,status,logout}=useAuth(),nav=useNavigate(),toast=useToast(),loc=useLocation();
 const [busy,setBusy]=useState(false);
 const authPage=loc.pathname==='/login'||loc.pathname==='/register';
 const signOut=async()=>{setBusy(true);try{await logout();toast('Signed out.','info');nav('/');}finally{setBusy(false);}};
 const links=user?[['/app/atlas','Atlas'],['/app/systems','Systems'],['/app/study-space','Study Space'],['/about','About']]:[['/about','About']];
 return <div className="site">
  <a className="skip-link" href="#main">Skip to content</a>
  <header className="topbar">
   <Link to="/" className="brand" aria-label="Human Atlas Learning Studio, home"><Mark/><span>Human Atlas<small>Learning Studio</small></span></Link>
   <nav className="topnav" aria-label="Main">{links.map(([to,label])=><NavLink key={to} to={to}>{label}</NavLink>)}</nav>
   <div className="topbar-end">
    {status==='authed'&&user?<><span className="who" title={user.email}><span className="avatar" aria-hidden="true">{user.displayName.slice(0,1).toUpperCase()}</span><span className="who-name">{user.displayName}</span></span><button type="button" className="btn btn-quiet" onClick={signOut} disabled={busy}>Sign out</button></>
    :status==='anon'&&!authPage?<><Link to="/login" className="btn btn-quiet">Sign in</Link><Link to="/register" className="btn btn-dark">Create account</Link></>:null}
   </div>
  </header>
  <main id="main" className="page" key={loc.pathname}><Outlet/></main>
  <footer className="site-footer">
   <div><Mark/><p>Human Atlas Learning Studio. A college full-stack project built on the open-source Human Atlas viewer.</p></div>
   <p>Anatomy data: BodyParts3D, © The Database Center for Life Science, <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>. For education only, not for diagnosis or treatment.</p>
  </footer>
 </div>;
}
