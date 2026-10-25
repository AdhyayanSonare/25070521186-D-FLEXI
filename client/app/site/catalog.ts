// Loads the anatomy manifest the Atlas already ships (public/models/atlas.json) once and shares it.
import {useEffect,useState} from 'react';
import {SYSTEMS,type Atlas,type SystemId} from '../anatomy';
let pending:Promise<Atlas>|null=null;
export function loadAtlas(){
 pending??=fetch('/models/atlas.json').then(r=>{if(!r.ok)throw new Error('The anatomy catalogue could not be loaded.');return r.json() as Promise<Atlas>;}).catch(e=>{pending=null;throw e;});
 return pending;
}
export function useCatalog(){
 const [atlas,setAtlas]=useState<Atlas|null>(null),[error,setError]=useState('');
 useEffect(()=>{let live=true;loadAtlas().then(a=>live&&setAtlas(a)).catch(e=>live&&setError(e.message));return()=>{live=false;};},[]);
 return {atlas,error};
}
export const systemOf=(id:string)=>SYSTEMS.find(s=>s.id===id);
export function systemCounts(atlas:Atlas){const c={} as Record<SystemId,number>;for(const p of atlas.parts)c[p.system]=(c[p.system]??0)+1;return c;}
/** Sentence case for display: "right pectoralis major" becomes "Right pectoralis major". */
export const titleCase=(s:string)=>s.charAt(0).toUpperCase()+s.slice(1);
