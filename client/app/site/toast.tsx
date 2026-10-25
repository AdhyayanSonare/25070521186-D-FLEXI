import {createContext,useCallback,useContext,useRef,useState,type ReactNode} from 'react';
type Tone='success'|'error'|'info';
interface Toast {id:number;message:string;tone:Tone}
const ToastContext=createContext<(message:string,tone?:Tone)=>void>(()=>{});
export function ToastProvider({children}:{children:ReactNode}){
 const [toasts,setToasts]=useState<Toast[]>([]),next=useRef(0);
 const show=useCallback((message:string,tone:Tone='success')=>{const id=++next.current;setToasts(t=>[...t.slice(-2),{id,message,tone}]);setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)),3600);},[]);
 return <ToastContext.Provider value={show}>{children}<div className="toasts" role="status" aria-live="polite">{toasts.map(t=><div key={t.id} className={`toast toast-${t.tone}`}><i aria-hidden="true"/>{t.message}</div>)}</div></ToastContext.Provider>;
}
export const useToast=()=>useContext(ToastContext);
