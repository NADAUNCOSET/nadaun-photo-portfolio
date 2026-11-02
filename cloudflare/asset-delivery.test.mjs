import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import test from 'node:test';
import {publicPaths,manifestRoutes} from './public-routes.mjs';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'..'),site=path.basename(root);
const config=JSON.parse(await readFile(path.join(root,'wrangler.jsonc'),'utf8'));
const proof=JSON.parse(await readFile(path.join(here,'asset-proof.json'),'utf8'));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const headers={'X-Content-Type-Options':'nosniff','X-Frame-Options':'SAMEORIGIN','Referrer-Policy':'no-referrer'};

test('static files bypass Worker while home, API and dynamic metadata retain Worker routing',async()=>{
 assert.ok(Array.isArray(config.assets.run_worker_first),'Every static request still invokes the Worker');
 const required=['/','/index.html','/api/*',...Object.keys(manifestRoutes)];
 if(site.includes('photo')){
  const {slugs}=await import('./source-data.mjs');
  required.push('/images/*','/share-image/*',...Object.values(slugs).flatMap(slug=>['/'+slug,'/'+slug+'/*']));
 }
 if(site.includes('video'))required.push('/share-image/*','/brand','/brand/*','/beauty','/beauty/*','/vcr','/vcr/*','/portrait','/portrait/*');
 for(const route of required)assert.ok(config.assets.run_worker_first.includes('/*')||config.assets.run_worker_first.includes(route),'Missing dynamic route '+route);
 const staticFile=publicPaths.find(p=>p!=='/index.html'&&!Object.hasOwn(manifestRoutes,p));
 assert.ok(staticFile);
 assert.ok(config.assets.run_worker_first.includes('!'+staticFile),'Static candidate still forced through Worker');
 const staticPaths=publicPaths.filter(p=>p!=='/index.html'&&!Object.hasOwn(manifestRoutes,p));
 assert.deepEqual(config.assets.run_worker_first.filter(p=>p.startsWith('!')).sort(),staticPaths.map(p=>'!'+p).sort());
});

test('asset-first responses retain the original security headers and audited non-public control file',async()=>{
 const raw=await readFile(path.join(here,'public/_headers'));
 const expected='/*\n'+Object.entries(headers).map(([key,value])=>'  '+key+': '+value).join('\n')+'\n';
 assert.equal(raw.toString(),expected);
 assert.deepEqual(proof.securityHeaders,headers);
 assert.ok(proof.assetControlFiles.some(x=>x.path==='/_headers'&&x.sha256===sha(raw)&&x.bytes===raw.length&&x.servedAsAsset===false));
 assert.ok(!publicPaths.includes('/_headers'));
});

test('all published payload bytes and source URLs remain unchanged',async()=>{
 assert.deepEqual(proof.publicFiles.map(x=>x.path),publicPaths);
 for(const record of proof.publicFiles){
  const published=await readFile(path.join(here,'public',record.path.slice(1)));
  const original=await readFile(path.join(root,record.source));
  assert.equal(sha(published),record.sha256,record.path);
  assert.equal(sha(original),record.sha256,record.source);
  assert.equal(published.length,record.bytes,record.path);
 }
 const staged=(await readdir(path.join(here,'public'))).sort();
 assert.deepEqual(staged,[...publicPaths.map(p=>p.slice(1)),'_headers'].sort());
});
if(Object.keys(manifestRoutes).length)test('metadata redirects are rejected with the edge-supported manual mode',async()=>{
 const worker=(await import('./worker.mjs')).default,original=globalThis.fetch;
 let redirectMode;
 globalThis.fetch=async(url,options)=>{redirectMode=options.redirect;return new Response(null,{status:302,headers:{Location:'https://untrusted.invalid/'}})};
 try{
  const response=await worker.fetch(new Request('https://local.test'+Object.keys(manifestRoutes)[0]),{});
  assert.equal(response.status,502);
  assert.equal(redirectMode,'manual');
 }finally{globalThis.fetch=original}
});
if(site.includes('photo')||site.includes('video'))test('share-image metadata checks reject upstream redirects without following them',async()=>{
 const worker=(await import('./worker.mjs')).default,original=globalThis.fetch;
 const photo=site.includes('photo'),{fallback}=await import('./source-data.mjs');
 const id=photo?'1409':sha('가로/'+fallback['가로'][0].file).slice(0,20);
 let headRedirectMode;
 globalThis.fetch=async(url,options={})=>{
  if(options.method!=='HEAD')return Response.json(fallback);
  headRedirectMode=options.redirect;
  return new Response(null,{status:302,headers:{Location:'https://untrusted.invalid/'}});
 };
 try{
  const response=await worker.fetch(new Request('https://local.test/share-image/'+id+(photo?'.webp':'.jpg')),{});
  assert.equal(response.status,502);
  assert.equal(headRedirectMode,'manual');
 }finally{globalThis.fetch=original}
});
