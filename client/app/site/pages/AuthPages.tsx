import {useEffect,useRef,useState,type FormEvent} from 'react';
import {Link,useNavigate,useSearchParams} from 'react-router-dom';
import {Eye,EyeOff} from 'lucide-react';
import {ApiError,api,type DemoAccount} from '../api';
import {safeNext,useAuth} from '../auth';
import {useToast} from '../toast';
import {AnatomyPlate} from '../landing/AnatomyPlate';
import '../landing/landing.css';

const EMAIL_RE=/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
type Errors=Record<string,string>;

function Field({id,label,error,hint,...input}:{id:string;label:string;error?:string;hint?:string}&React.InputHTMLAttributes<HTMLInputElement>){
 const [show,setShow]=useState(false);
 const isPassword=input.type==='password';
 const describedBy=[error&&`${id}-error`,hint&&`${id}-hint`].filter(Boolean).join(' ')||undefined;
 return <div className={`field ${error?'has-error':''}`}>
  <label htmlFor={id}>{label}</label>
  <div className="field-control">
   <input id={id} name={id} {...input} type={isPassword&&show?'text':input.type} aria-invalid={!!error} aria-describedby={describedBy}/>
   {isPassword&&<button type="button" className="reveal-btn" onClick={()=>setShow(s=>!s)} aria-label={show?'Hide password':'Show password'}>{show?<EyeOff size={16}/>:<Eye size={16}/>}</button>}
  </div>
  {hint&&!error&&<p id={`${id}-hint`} className="field-hint">{hint}</p>}
  {error&&<p id={`${id}-error`} className="field-error">{error}</p>}
 </div>;
}

function AuthLayout({title,intro,children,footer}:{title:string;intro:string;children:React.ReactNode;footer:React.ReactNode}){
 return <div className="auth">
  <aside className="auth-art">
   <AnatomyPlate href={q=>`/app/atlas${q}`} compact delay={.15}/>
  </aside>
  <section className="auth-panel">
   <div className="auth-card">
    <h1 className="display">{title}</h1>
    <p className="auth-intro">{intro}</p>
    {children}
    <p className="auth-switch">{footer}</p>
   </div>
  </section>
 </div>;
}

function useRedirectIfAuthed(){
 const {status}=useAuth(),nav=useNavigate(),[params]=useSearchParams();
 // Only redirect someone who arrives already signed in; sign-ins on this page navigate themselves.
 const first=useRef(true);
 useEffect(()=>{if(status==='loading'||!first.current)return;first.current=false;if(status==='authed')nav(safeNext(params.get('next')),{replace:true});},[status]);
 return safeNext(params.get('next'));
}

function messageFor(e:unknown){
 if(e instanceof ApiError&&e.status===429)return e.message;
 return e instanceof Error?e.message:'Something went wrong. Try again.';
}

export function LoginPage(){
 const {login}=useAuth(),toast=useToast(),nav=useNavigate(),next=useRedirectIfAuthed();
 const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[errors,setErrors]=useState<Errors>({}),[formError,setFormError]=useState(''),[busy,setBusy]=useState(false);
 const [demo,setDemo]=useState<DemoAccount[]>([]);
 useEffect(()=>{api.demo().then(r=>setDemo(r.accounts)).catch(()=>{});},[]);
 // Fills the form only; signing in still goes through the normal form and server check.
 const [filled,setFilled]=useState('');
 const fillDemo=(a:DemoAccount)=>{setEmail(a.email);setPassword(a.password);setErrors({});setFormError('');setFilled(a.label);document.getElementById('password')?.focus();};
 const submit=async(e:FormEvent)=>{
  e.preventDefault();
  const v:Errors={};
  if(!EMAIL_RE.test(email.trim()))v.email='Enter the email you registered with.';
  if(!password)v.password='Enter your password.';
  setErrors(v);setFormError('');
  if(Object.keys(v).length)return;
  setBusy(true);
  try{await login(email.trim(),password);toast('Signed in.');nav(filled==='Administrator'&&next==='/app/atlas'?'/app/admin':next,{replace:true});}
  catch(err){setFormError(messageFor(err));}
  finally{setBusy(false);}
 };
 return <AuthLayout title="Sign in" intro="Pick up where you left off: your saved structures and notes are waiting." footer={<>New here? <Link to={`/register${next!=='/app/atlas'?`?next=${encodeURIComponent(next)}`:''}`}>Create an account</Link></>}>
  <form className="auth-form" onSubmit={submit} noValidate>
   {formError&&<div className="form-alert" role="alert">{formError}</div>}
   <Field id="email" label="Email" type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} error={errors.email} autoFocus/>
   <Field id="password" label="Password" type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} error={errors.password}/>
   <button type="submit" className="btn btn-dark btn-block" disabled={busy}>{busy?<><span className="spinner"/>Signing in…</>:'Sign in'}</button>
  </form>
  {demo.length>0&&<div className="demo-box">
   <p className="demo-title">Evaluation accounts</p>
   <p className="demo-help">Choose one to fill in its details, then select Sign in.</p>
   <div className="demo-list">{demo.map(a=><button key={a.email} type="button" className={`demo-account ${filled===a.label?'is-filled':''}`} onClick={()=>fillDemo(a)} disabled={busy}>
    <span className={`demo-role ${a.role}`}>{a.label}</span><span className="demo-cred">{a.email}<small>{a.password}</small></span><span className="demo-go">{filled===a.label?'Filled':'Use'}</span>
   </button>)}</div>
  </div>}
 </AuthLayout>;
}

export function RegisterPage(){
 const {register}=useAuth(),toast=useToast(),nav=useNavigate(),next=useRedirectIfAuthed();
 const [f,setF]=useState({displayName:'',email:'',password:'',confirm:''}),[errors,setErrors]=useState<Errors>({}),[formError,setFormError]=useState(''),[busy,setBusy]=useState(false);
 const set=(k:keyof typeof f)=>(e:React.ChangeEvent<HTMLInputElement>)=>setF(s=>({...s,[k]:e.target.value}));
 const submit=async(e:FormEvent)=>{
  e.preventDefault();
  const v:Errors={};
  const name=f.displayName.trim();
  if(name.length<2||name.length>60)v.displayName='Use 2 to 60 characters.';
  if(!EMAIL_RE.test(f.email.trim()))v.email='Enter a valid email address, such as name@example.com.';
  if(f.password.length<8||f.password.length>72||!/[A-Za-z]/.test(f.password)||!/\d/.test(f.password))v.password='Use 8 to 72 characters with at least one letter and one number.';
  if(f.confirm!==f.password)v.confirm='The passwords do not match.';
  setErrors(v);setFormError('');
  if(Object.keys(v).length)return;
  setBusy(true);
  try{await register(name,f.email.trim(),f.password);toast(`Welcome, ${name}. Your account is ready.`);nav(next,{replace:true});}
  catch(err){
   if(err instanceof ApiError&&err.status===409)setErrors({email:'This email already has an account. Sign in instead.'});
   else setFormError(messageFor(err));
  }finally{setBusy(false);}
 };
 return <AuthLayout title="Create your account" intro="Save structures from the atlas, keep notes and come back to them on any device." footer={<>Already have an account? <Link to={`/login${next!=='/app/atlas'?`?next=${encodeURIComponent(next)}`:''}`}>Sign in</Link></>}>
  <form className="auth-form" onSubmit={submit} noValidate>
   {formError&&<div className="form-alert" role="alert">{formError}</div>}
   <Field id="displayName" label="Display name" autoComplete="name" value={f.displayName} onChange={set('displayName')} error={errors.displayName} autoFocus maxLength={60}/>
   <Field id="email" label="Email" type="email" autoComplete="email" value={f.email} onChange={set('email')} error={errors.email}/>
   <Field id="password" label="Password" type="password" autoComplete="new-password" value={f.password} onChange={set('password')} error={errors.password} hint="At least 8 characters, with a letter and a number."/>
   <Field id="confirm" label="Confirm password" type="password" autoComplete="new-password" value={f.confirm} onChange={set('confirm')} error={errors.confirm}/>
   <button type="submit" className="btn btn-dark btn-block" disabled={busy}>{busy?<><span className="spinner"/>Creating account…</>:'Create account'}</button>
  </form>
 </AuthLayout>;
}
