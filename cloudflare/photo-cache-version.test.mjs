import test from 'node:test';
import assert from 'node:assert/strict';
import worker from './worker.mjs';
const original='https://photo.nadaun.co/images/portfolio/Corporate/test/00.webp?v=original';
test('validated operational cache version preserves the original photo query and bytes stay on R2',async()=>{
 const r=await worker.fetch(new Request(original),{PHOTO_CACHE_VERSION:'20261102-webp-v1'});
 assert.equal(r.status,307);assert.equal(await r.text(),'');
 assert.equal(r.headers.get('Location'),'https://media.nadaun.co/photo/portfolio/Corporate/test/00.webp?v=original&_r2v=20261102-webp-v1');
});
test('unset or malformed cache version retains the existing public-image contract',async()=>{
 for(const value of [undefined,'','bad\r\nheader','https://untrusted.example']){
  const r=await worker.fetch(new Request(original),{PHOTO_CACHE_VERSION:value});
  assert.equal(r.headers.get('Location'),'https://media.nadaun.co/photo/portfolio/Corporate/test/00.webp?v=original');
 }
});
test('HEAD stays bodyless and cannot override cache settings with a request header',async()=>{
 const r=await worker.fetch(new Request(original,{method:'HEAD',headers:{PHOTO_CACHE_VERSION:'forged'}}),{});
 assert.equal(r.status,307);assert.equal((await r.arrayBuffer()).byteLength,0);assert.equal(new URL(r.headers.get('Location')).searchParams.has('_r2v'),false);
});
test('private paths remain rejected even when a cache version is configured',async()=>{
 const r=await worker.fetch(new Request('https://photo.nadaun.co/.env'),{PHOTO_CACHE_VERSION:'20261102-webp-v1'});assert.equal(r.status,404);
});
test('public share-image redirect uses the same verified R2 cache version',async()=>{
 const originalFetch=globalThis.fetch;
 globalThis.fetch=async()=>new Response(null,{status:200,headers:{'Content-Type':'image/webp','Content-Length':'1234'}});
 try{
  const r=await worker.fetch(new Request('https://photo.nadaun.co/share-image/37.webp'),{PHOTO_CACHE_VERSION:'20261102-webp-v1'});
  assert.equal(r.status,307);assert.equal(await r.text(),'');
  const target=new URL(r.headers.get('Location'));assert.equal(target.hostname,'media.nadaun.co');assert.equal(target.searchParams.get('_r2v'),'20261102-webp-v1');
 }finally{globalThis.fetch=originalFetch;}
});
