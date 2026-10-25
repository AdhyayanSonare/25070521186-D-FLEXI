import {lazy,Suspense,useEffect} from 'react';
import {Route,Routes,useLocation} from 'react-router-dom';
import {AuthProvider,RequireAdmin,RequireAuth} from './auth';
import {ToastProvider} from './toast';
import {Shell} from './Shell';
import Landing from './pages/Landing';
import {LoginPage,RegisterPage} from './pages/AuthPages';
import About from './pages/About';
import NotFound from './pages/NotFound';

// Heavy routes are split so the landing and sign-in pages load without Three.js.
const AtlasRoute=lazy(()=>import('./pages/AtlasRoute'));
const Systems=lazy(()=>import('./pages/Systems'));
const StudySpace=lazy(()=>import('./pages/StudySpace'));
const Admin=lazy(()=>import('./pages/Admin'));
const Profile=lazy(()=>import('./pages/Profile'));

const TITLES:Record<string,string>={'/':'Human Atlas Learning Studio','/login':'Sign in','/register':'Create account','/about':'About','/app/atlas':'Atlas','/app/systems':'Systems','/app/study-space':'Study Space','/app/admin':'Admin','/app/profile':'Profile'};

function useDocumentTitle(){
 const {pathname}=useLocation();
 useEffect(()=>{const t=TITLES[pathname];document.title=t&&pathname!=='/'?`${t} | Human Atlas Learning Studio`:'Human Atlas Learning Studio';window.scrollTo(0,0);},[pathname]);
}

const Loading=()=><div className="route-loading" role="status"><span className="spinner"/>Loading…</div>;

export default function App(){
 useDocumentTitle();
 return <AuthProvider><ToastProvider><Suspense fallback={<Loading/>}><Routes>
  <Route path="/app/atlas" element={<RequireAuth><AtlasRoute/></RequireAuth>}/>
  <Route element={<Shell/>}>
   <Route index element={<Landing/>}/>
   <Route path="/login" element={<LoginPage/>}/>
   <Route path="/register" element={<RegisterPage/>}/>
   <Route path="/about" element={<About/>}/>
   <Route path="/app/systems" element={<RequireAuth><Systems/></RequireAuth>}/>
   <Route path="/app/study-space" element={<RequireAuth><StudySpace/></RequireAuth>}/>
   <Route path="/app/profile" element={<RequireAuth><Profile/></RequireAuth>}/>
   <Route path="/app/admin" element={<RequireAuth><RequireAdmin><Admin/></RequireAdmin></RequireAuth>}/>
   <Route path="*" element={<NotFound/>}/>
  </Route>
 </Routes></Suspense></ToastProvider></AuthProvider>;
}
