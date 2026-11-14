import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import test from 'node:test';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {adHtmlPaths,publicAdPolicy} from './adsense.mjs';
import worker from './worker.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const photo=path.basename(root).includes('photo'),host=photo?'photo.nadaun.co':'video.nadaun.co';
const source=photo?root:path.join(root,'src');
const publisher='ca-pub-9416492869063856';
const block=/<!-- NADAUN_ADSENSE_AUTO_BEGIN -->[\s\S]*?<!-- NADAUN_ADSENSE_AUTO_END -->\r?\n?/g;
const fixture=photo?null:JSON.parse(await readFile(path.join(root,'_content/video-manifest.json'),'utf8'));
const env={ASSETS:{async fetch(request){const p=new URL(request.url).pathname;try{return new Response(await readFile(path.join(root,'cloudflare/public',p.slice(1))),{headers:{'Content-Type':p.endsWith('.html')?'text/html; charset=utf-8':'text/plain; charset=utf-8'}})}catch{return new Response('Not found',{status:404})}}}};
const req=(p,options={})=>new Request('https://'+host+p,options);
function tags(html){assert.equal((html.match(/pagead\/js\/adsbygoogle[.]js/g)||[]).length,1);assert.equal((html.match(/name="google-adsense-account"/g)||[]).length,1);assert.ok(html.includes('client='+publisher));assert.match(html,/<script async src="https:\/\/pagead2[.]googlesyndication[.]com\/pagead\/js\/adsbygoogle[.]js\?client=ca-pub-9416492869063856" crossorigin="anonymous"><\/script>/);assert.ok(!/data-ad-slot|<ins[^>]*adsbygoogle/.test(html));}
async function mocked(fn){const old=globalThis.fetch;globalThis.fetch=async()=>Response.json(fixture);try{return await fn()}finally{globalThis.fetch=old}}
// The pre-AdSense backup is an immutable deployment receipt, not a freeze on
// future page copy. Assert current source/staging equality and policy byte scope.
test('current source and generated HTML have one official loader; ad policy preserves every other byte',async()=>{
 for(const name of ['index.html','services-guide.html']){
  const html=await readFile(path.join(source,name),'utf8');tags(html);
  assert.equal(await readFile(path.join(root,'cloudflare/public',name),'utf8'),html);
  const response=()=>new Response(html,{headers:{'Content-Type':'text/html; charset=utf-8'}});
  const allowed=await publicAdPolicy(response(),name==='index.html'?'/':'/services-guide.html');
  assert.equal(await allowed.text(),html,'allowed public page must remain byte-identical');
  const stripped=await publicAdPolicy(response(),'/api/share');
  assert.equal(await stripped.text(),html.replace(block,''),'API policy may remove only the marked ad block');
 }
});
test('all allowed public SSR galleries and project links retain exactly one ad loader',()=>mocked(async()=>{
 const paths=[...adHtmlPaths].filter(p=>p!=='/services-guide.html');paths.push(photo?'/?project=1409&s=2':'/?lib='+encodeURIComponent('가로')+'&video='+encodeURIComponent(fixture['가로'][0].file));
 for(const p of paths){const r=await worker.fetch(req(p),env);assert.ok([200,404].includes(r.status),p);const html=await r.text();if(r.status===200)tags(html);else assert.ok(!html.includes(publisher),p)}
 const guide=await worker.fetch(req('/services-guide.html'),env);assert.equal(guide.status,200);tags(await guide.text());
}));
test('HTML API preview loses only our ad block and never serves private or media source',()=>mocked(async()=>{
 const p=photo?'/api/share?category=portrait&project=1409':'/api/share?gallery=brand';const r=await worker.fetch(req(p),env);assert.equal(r.status,200);const html=await r.text();assert.ok(!html.includes(publisher));assert.match(html,/og:image/);assert.match(html,/NADAUN|나다운/);
 for(const q of ['/.env','/_private/operations/adsense-sites-20261114/source-change.json','/cloudflare/adsense.mjs','/_lib/share-preview.cjs','/api/orders','/login','/not-a-gallery']){const x=await worker.fetch(req(q),env);assert.equal(x.status,404,q);assert.ok(!(await x.text()).includes(publisher),q)}
}));
test('ad policy uses exact public HTML allowlist and leaves JSON/media statuses unchanged',async()=>{
 for(const p of ['/api/share','/login','/_private/a','/images/a.webp','/portrait/unknown']){const r=await publicAdPolicy(new Response('<head><!-- NADAUN_ADSENSE_AUTO_BEGIN -->'+publisher+'<!-- NADAUN_ADSENSE_AUTO_END --></head>',{headers:{'Content-Type':'text/html'}}),p);assert.equal(await r.text(),'<head></head>')}
 const r=await publicAdPolicy(Response.json({ok:true}),'/api/contact');assert.deepEqual(await r.json(),{ok:true});
});
test('ads.txt is exact publicly staged seller record with GET/HEAD/method guards',async()=>{
 const expected=await readFile(path.join(source,'ads.txt'),'utf8');assert.match(expected,/^google[.]com, pub-9416492869063856, DIRECT, f08c47fec0942fa0$/m);const r=await worker.fetch(req('/ads.txt'),env);assert.equal(r.status,200);assert.match(r.headers.get('Content-Type'),/^text\/plain/);assert.equal(await r.text(),expected);const h=await worker.fetch(req('/ads.txt',{method:'HEAD'}),env);assert.equal(h.status,200);assert.equal(await h.text(),'');assert.equal((await worker.fetch(req('/ads.txt',{method:'POST'}),env)).status,405);
 const cfg=JSON.parse(await readFile(path.join(root,'wrangler.jsonc'),'utf8'));assert.ok(cfg.assets.run_worker_first.includes('!/ads.txt'));
});
