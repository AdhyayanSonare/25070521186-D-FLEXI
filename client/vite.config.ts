import {fileURLToPath} from 'node:url';
import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/postcss';
const path=(relative:string)=>fileURLToPath(new URL(relative,import.meta.url));
// /api requests are proxied to the Express server in development, so cookies stay same-origin.
const api=process.env.API_URL||'http://localhost:5050';
export default defineConfig({root:path('./web'),publicDir:path('./public'),plugins:[react()],resolve:{alias:{'@':path('./')}},css:{postcss:{plugins:[tailwindcss()]}},server:{watch:{usePolling:true},proxy:{'/api':{target:api,changeOrigin:false}}},preview:{proxy:{'/api':{target:api,changeOrigin:false}}},build:{outDir:path('./dist'),emptyOutDir:true}});
