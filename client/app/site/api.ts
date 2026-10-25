// Thin JSON client for the Express API. Cookies carry the session (HttpOnly), so no token is stored in JS.
export class ApiError extends Error {
 constructor(public status:number,message:string,public details?:Record<string,unknown>){super(message);}
}
export interface User {id:string;displayName:string;email:string;createdAt:string}
export interface Saved {id:string;structureId:string;name:string;system:string;pieces:number;createdAt:string}
export interface Note {id:string;structureId:string;structureName:string;content:string;createdAt:string;updatedAt:string}
export interface Article {pmid:string;title:string;journal:string;published:string;authors:string[];moreAuthors:number;url:string}
export interface Research {term:string;query:string;total:number;articles:Article[];source:string;cached:boolean}

async function request<T>(method:string,path:string,body?:unknown):Promise<T>{
 let res:Response;
 try{
  res=await fetch(`/api${path}`,{method,credentials:'same-origin',headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined});
 }catch{throw new ApiError(0,'The server could not be reached. Check that the API is running.');}
 const data=await res.json().catch(()=>({})) as {error?:string;details?:Record<string,unknown>};
 if(!res.ok)throw new ApiError(res.status,data.error||`Request failed (${res.status}).`,data.details);
 return data as T;
}

export const api={
 me:()=>request<{user:User}>('GET','/auth/me'),
 login:(email:string,password:string)=>request<{user:User}>('POST','/auth/login',{email,password}),
 register:(displayName:string,email:string,password:string)=>request<{user:User}>('POST','/auth/register',{displayName,email,password}),
 logout:()=>request<{ok:true}>('POST','/auth/logout'),
 saved:()=>request<{items:Saved[]}>('GET','/saved-structures'),
 save:(s:{structureId:string;name:string;system:string;pieces:number})=>request<{item:Saved}>('POST','/saved-structures',s),
 unsave:(id:string)=>request<{ok:true}>('DELETE',`/saved-structures/${id}`),
 notes:(structureId?:string)=>request<{items:Note[]}>('GET',`/notes${structureId?`?structureId=${encodeURIComponent(structureId)}`:''}`),
 addNote:(n:{structureId:string;structureName:string;content:string})=>request<{item:Note}>('POST','/notes',n),
 editNote:(id:string,content:string)=>request<{item:Note}>('PATCH',`/notes/${id}`,{content}),
 deleteNote:(id:string)=>request<{ok:true}>('DELETE',`/notes/${id}`),
 research:(term:string)=>request<Research>('GET',`/research?term=${encodeURIComponent(term)}`),
};
