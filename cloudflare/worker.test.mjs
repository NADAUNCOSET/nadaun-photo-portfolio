import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import test from 'node:test';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'..'),photo=path.basename(root).includes('photo'),kind=photo?'photo':'video';

// Model Cloudflare html_handling at the asset boundary, not a bare filesystem.
const htmlHandling=JSON.parse(await readFile(path.join(here,'../wrangler.jsonc'),'utf8')).assets.html_handling;
function assetRedirect(request){const p=new URL(request.url).pathname;if(htmlHandling==='none'&&p==='/')return new Response('Not found',{status:404});if(htmlHandling!=='none'&&p.endsWith('.html'))return Response.redirect(new URL(p.slice(0,-5),request.url),308);return null}

const mod=await import('./worker.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {default:{fetch:async()=>new Response('Not implemented',{status:501})}};throw e});
const worker=mod.default,fixture=photo?null:JSON.parse(await readFile(path.join(root,'_content/video-manifest.json'),'utf8'));
const request=(p,options={})=>new Request('https://'+kind+'.nadaun.co'+p,options);
const env={RESEND_API_KEY:'unit-test-only',ASSETS:{async fetch(req){const redirect=assetRedirect(req);if(redirect)return redirect;const p=new URL(req.url).pathname;try{return new Response(await readFile(path.join(here,'public',p==='/'?'index.html':p.slice(1))))}catch{return new Response('Not found',{status:404})}}}};
const baseFetch=async(url,options={})=>{assert.match(url,/^https:\/\/media[.]nadaun[.]co\//);if(url.endsWith('/manifest.json'))return Response.json(fixture);assert.equal(options.method,'HEAD');return new Response(null,{headers:{'Content-Type':photo?'image/webp':'image/jpeg','Content-Length':'1000'}})};
async function run(fn,fetcher=baseFetch){const old=globalThis.fetch;globalThis.fetch=fetcher;try{return await fn()}finally{globalThis.fetch=old}}
test('home retains original public portfolio HTML and metadata',()=>run(async()=>{const r=await worker.fetch(request('/'),env);assert.equal(r.status,200);const html=await r.text();assert.match(html,/NADAUN|나다운/);assert.match(html,/og:image/)}));
test('private and server source paths are always unavailable',async()=>{for(const p of ['/.env','/.git/config','/cloudflare/source-data.mjs','/cloudflare/preview-runtime.mjs','/_private/orders.json','/api/orders','/_lib/share-preview.cjs'])assert.equal((await worker.fetch(request(p),{ASSETS:{fetch:()=>new Response('SECRET')}})).status,404,p)});
test('category page and canonical trailing slash retain sharing context',()=>run(async()=>{const p=photo?'/portrait?project=1409':'/brand';const r=await worker.fetch(request(p),env);assert.equal(r.status,200);const html=await r.text();assert.match(html,photo?/SM.*Portrait/:/og:title/);assert.match(html,new RegExp(kind+'[.]nadaun[.]co'));const c=await worker.fetch(request(photo?'/portrait/?project=1409':'/brand/'),env);assert.equal(c.status,308);assert.equal(c.headers.get('Location'),photo?'/portrait?project=1409':'/brand')}));
test('unknown gallery route returns 404',()=>run(async()=>assert.equal((await worker.fetch(request('/not-a-gallery'),env)).status,404)));
test('published image redirects bodylessly to original Cloudflare object',()=>run(async()=>{const file=photo?null:fixture['가로'][0].file;const id=photo?'1409':createHash('sha256').update('가로/'+file).digest('hex').slice(0,20);const r=await worker.fetch(request('/share-image/'+id+(photo?'.webp':'.jpg')+'?url=https://untrusted.invalid'),env);assert.equal(r.status,307);assert.match(r.headers.get('Location'),new RegExp('^https://media[.]nadaun[.]co/'+kind+'/'));assert.equal(await r.text(),'')}));
test('invalid image identifiers cannot create redirects',()=>run(async()=>{const r=await worker.fetch(request('/share-image/not-published.jpg'),env);assert.equal(r.status,404)}));
test('contact keeps required-field validation without external sending',async()=>{const r=await worker.fetch(request('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}),env);assert.equal(r.status,400)});
test('contact preserves provider payload and recipient',()=>run(async()=>{const body={name:'Test',phone:'000',date:'2026-11-03',[photo?'shootType':'projectType']:'Test'};const r=await worker.fetch(request('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),env);assert.equal(r.status,200);assert.equal((await r.json()).success,true)},async(url,options)=>{assert.equal(url,'https://api.resend.com/emails');const body=JSON.parse(options.body);assert.deepEqual(body.to,['rbsent.info@gmail.com']);assert.match(body.subject,new RegExp(kind.toUpperCase()));return Response.json({id:'test-message'})}));
test('HEAD preserves shared page status without a body',()=>run(async()=>{const r=await worker.fetch(request('/',{method:'HEAD'}),env);assert.equal(r.status,200);assert.equal(await r.text(),'')}));
test('original explicit HTML URLs are not redirected to unapproved extensionless routes',async()=>{const r=await worker.fetch(request('/index.html'),env);assert.equal(r.status,200);assert.equal(r.headers.get('Location'),null)});
