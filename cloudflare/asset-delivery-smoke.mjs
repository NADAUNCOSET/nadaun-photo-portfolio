import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {publicPaths,manifestRoutes} from './public-routes.mjs';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'..'),site=path.basename(root);
const cli=process.argv[2]||process.env.WRANGLER_MODULE;
if(!cli)throw Error('Pass the verified installed Wrangler API entry path');
const {createTestHarness}=await import(pathToFileURL(path.resolve(cli)));
const config=JSON.parse(await readFile(path.join(root,'wrangler.jsonc'),'utf8'));
const host=config.routes[0].pattern,logs=path.join(here,'logs');
await mkdir(logs,{recursive:true});
await writeFile(path.join(logs,'asset-routing-probe.mjs'),"import worker from '../worker.mjs';export default {async fetch(request,env,ctx){const response=await worker.fetch(request,env,ctx);const headers=new Headers(response.headers);headers.set('X-Local-Test-Worker','1');return new Response(response.body,{status:response.status,statusText:response.statusText,headers})}};\n");
const runtime={...config,main:'cloudflare/logs/asset-routing-probe.mjs'};
delete runtime.build;delete runtime.$schema;
const server=createTestHarness({root,workers:[{config:runtime,secrets:{RESEND_API_KEY:''}}]});
const checks=[],security={'x-content-type-options':'nosniff','x-frame-options':'SAMEORIGIN','referrer-policy':'no-referrer'};
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
async function check(url,{status=200,worker=true,method='GET',sameFile,match,locationMatch}={}){
 const response=await server.fetch('https://'+host+url,{method,redirect:'manual'});
 const bytes=Buffer.from(await response.arrayBuffer());
 assert.equal(response.status,status,method+' '+url);
 assert.equal(response.headers.get('X-Local-Test-Worker'),worker?'1':null,'Worker dispatch '+method+' '+url);
 for(const [key,value] of Object.entries(security))assert.equal(response.headers.get(key),value,key+' '+url);
 if(sameFile)assert.equal(sha(bytes),sha(await readFile(path.join(here,'public',sameFile))),'Payload changed '+url);
 if(match)assert.match(bytes.toString(),match);
 if(locationMatch)assert.match(response.headers.get('Location'),locationMatch);
 if(method==='HEAD')assert.equal(bytes.length,0);
 checks.push({path:url,method,status:response.status,workerInvoked:worker,bytes:bytes.length,sha256:sha(bytes),securityHeadersPreserved:true});
}
try{
 await server.listen();
 const candidate=publicPaths.find(p=>p!=='/index.html'&&!Object.hasOwn(manifestRoutes,p));
 await check(candidate,{worker:false,sameFile:candidate.slice(1)});
 await check(candidate,{worker:false,method:'HEAD'});
 await check(candidate,{status:405,worker:false,method:'POST'});
 await check('/');
 await check('/index.html',{sameFile:'index.html'});
 await check('/',{method:'HEAD'});
 for(const pathname of ['/.env','/cloudflare/worker.mjs','/_private/configuration.json','/_headers'])await check(pathname,{status:404});
 await check('/api/contact',{status:site.includes('agency')||site.includes('photo')||site.includes('video')?405:404});
 for(const pathname of Object.keys(manifestRoutes)){
  await check(pathname,{match:/^[\s]*[\[{]/});
  await check(pathname.replace('-','%2d'),{match:/^[\s]*[\[{]/});
 }
 if(site.includes('photo')){
  await check('/?project=1409&s=2',{match:/SM.*Portrait/});
  await check('/share-image/1409.webp',{status:307,locationMatch:/^https:\/\/media[.]nadaun[.]co\/photo\//});
 }
 if(site.includes('video')){
  await check('/?category=BRAND&s=2',{match:/https:\/\/video[.]nadaun[.]co\/brand/});
  const {fallback}=await import('./source-data.mjs');
  const image=sha('가로/'+fallback['가로'][0].file).slice(0,20);
  await check('/share-image/'+image+'.jpg',{status:307,locationMatch:/^https:\/\/media[.]nadaun[.]co\/video\//});
 }
 if(site.includes('wedding'))for(const page of ['snap.html','film.html'])await check('/'+page,{worker:false,sameFile:page});
 const proof={at:new Date().toISOString(),site,checks,providerWrites:0,productionConfigMainUnchanged:config.main,workerProbeOnlyLocal:true};
 await writeFile(path.join(logs,'asset-delivery-smoke.json'),JSON.stringify(proof,null,2)+'\n');
 console.log(JSON.stringify({site,passed:checks.length,workerBypassVerified:true,providerWrites:0,proof:path.join(logs,'asset-delivery-smoke.json')}));
}finally{await server.close()}
