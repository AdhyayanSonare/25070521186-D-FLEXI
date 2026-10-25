import {createContext,useCallback,useContext,useEffect,useMemo,useState,type ReactNode} from 'react';
import {Navigate,useLocation} from 'react-router-dom';
import {api,ApiError,type User} from './api';

type Status='loading'|'authed'|'anon';
interface AuthValue {user:User|null;status:Status;login:(e:string,p:string)=>Promise<void>;register:(n:string,e:string,p:string)=>Promise<void>;logout:()=>Promise<void>}
const AuthContext=createContext<AuthValue|null>(null);

export function AuthProvider({children}:{children:ReactNode}){
 const [user,setUser]=useState<User|null>(null),[status,setStatus]=useState<Status>('loading');
 useEffect(()=>{api.me().then(r=>{setUser(r.user);setStatus('authed');}).catch(()=>{setUser(null);setStatus('anon');});},[]);
 const login=useCallback(async(e:string,p:string)=>{const r=await api.login(e,p);setUser(r.user);setStatus('authed');},[]);
 const register=useCallback(async(n:string,e:string,p:string)=>{const r=await api.register(n,e,p);setUser(r.user);setStatus('authed');},[]);
 const logout=useCallback(async()=>{try{await api.logout();}finally{setUser(null);setStatus('anon');}},[]);
 const value=useMemo(()=>({user,status,login,register,logout}),[user,status,login,register,logout]);
 return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(){const v=useContext(AuthContext);if(!v)throw new Error('useAuth outside AuthProvider');return v;}

/** Only a path inside this app may be used as a post-login destination. */
export function safeNext(next:string|null){return next&&next.startsWith('/')&&!next.startsWith('//')?next:'/app/atlas';}

export function RequireAuth({children}:{children:ReactNode}){
 const {status}=useAuth(),loc=useLocation();
 if(status==='loading')return <div className="route-loading" role="status"><span className="spinner"/>Checking your session…</div>;
 if(status==='anon')return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname+loc.search)}`} replace/>;
 return <>{children}</>;
}

export function isAuthError(e:unknown){return e instanceof ApiError&&e.status===401;}
