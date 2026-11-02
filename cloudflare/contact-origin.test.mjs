import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const folderName=path.basename(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'));
const siteName=folderName.includes('photo')?'photo':folderName.includes('video')?'video':'agency';
const cases=[[siteName,folderName]];
for(const [site,folder] of cases){
 const worker=(await import('./worker.mjs')).default;
 const canonical='https://'+site+'.nadaun.co';
 async function run(options={}){
  const {method='POST',url=canonical+'/api/contact',body='{}',key=true}=options;
  const origin=Object.hasOwn(options,'origin')?options.origin:canonical;
  let outbound=0;const old=globalThis.fetch;globalThis.fetch=async()=>{outbound++;throw Error('DENY_NET');};
  try{const headers={'Content-Type':'application/json'};if(origin!==undefined)headers.Origin=origin;
   const env={ASSETS:{fetch:async()=>new Response('public fixture')},...(key?{RESEND_API_KEY:'unit-test-only-not-a-credential'}:{})};
   const request=new Request(url,{method,headers,...(!['GET','HEAD','OPTIONS'].includes(method)?{body}:{})});
   const response=await worker.fetch(request,env);return{response,outbound};
  }finally{globalThis.fetch=old;}
 }
 for(const origin of ['https://foreign.invalid','null','https://'+site+'.nadaun.co.foreign.invalid','http://'+site+'.nadaun.co'])test(site+' contact denies untrusted Origin '+origin,async()=>{
  const {response,outbound}=await run({origin});assert.equal(response.status,403);assert.equal(response.headers.get('Cache-Control'),'no-store');assert.equal(response.headers.get('X-Content-Type-Options'),'nosniff');assert.equal(response.headers.get('Access-Control-Allow-Origin'),null);assert.equal(outbound,0);
 });
 test(site+' contact denies absent Origin before configuration or body validation',async()=>{
  for(const key of [true,false]){const {response,outbound}=await run({origin:undefined,key});assert.equal(response.status,403);assert.equal(outbound,0);}
 });
 test(site+' foreign Origin is rejected before a valid-shaped body can invoke provider',async()=>{const body=JSON.stringify({name:'Unit Test',phone:'000',date:'2026-11-03',[site==='photo'?'shootType':'projectType']:'Unit Test'});const {response,outbound}=await run({origin:'https://foreign.invalid',body});assert.equal(response.status,403);assert.equal(outbound,0);});
 test(site+' contact correct Origin keeps required-field validation without provider',async()=>{const {response,outbound}=await run();assert.equal(response.status,400);assert.equal(outbound,0);});
 test(site+' contact correct Origin keeps malformed JSON validation',async()=>{const {response,outbound}=await run({body:'{'});assert.equal(response.status,400);assert.equal(outbound,0);});
 test(site+' contact correct Origin keeps size limit',async()=>{const {response,outbound}=await run({body:JSON.stringify({x:'x'.repeat(65536)})});assert.equal(response.status,413);assert.equal(outbound,0);});
 test(site+' contact correct Origin keeps original unconfigured-provider 503',async()=>{const {response,outbound}=await run({key:false});assert.equal(response.status,503);assert.equal(outbound,0);});
 test(site+' contact same-origin HTTPS Worker preview stays same-origin',async()=>{const preview='https://'+folder+'.jameskimrb.workers.dev';const {response,outbound}=await run({url:preview+'/api/contact',origin:preview});assert.equal(response.status,400);assert.equal(outbound,0);});
 test(site+' contact canonical header cannot authorize cross-origin preview request',async()=>{const {response,outbound}=await run({url:'https://'+folder+'.jameskimrb.workers.dev/api/contact'});assert.equal(response.status,403);assert.equal(outbound,0);});
 test(site+' contact HTTP self-origin is rejected',async()=>{const url='http://'+site+'.nadaun.co';const {response,outbound}=await run({url:url+'/api/contact',origin:url});assert.equal(response.status,403);assert.equal(outbound,0);});
 for(const method of ['PUT','PATCH','DELETE'])test(site+' contact '+method+' foreign Origin is rejected before method adapter',async()=>{const {response,outbound}=await run({method,origin:'https://foreign.invalid'});assert.equal(response.status,403);assert.equal(outbound,0);});
 test(site+' contact foreign/missing/null preflight never allows CORS',async()=>{for(const origin of ['https://foreign.invalid',undefined,'null']){const {response,outbound}=await run({method:'OPTIONS',origin});assert.equal(response.status,403);assert.equal(response.headers.get('Access-Control-Allow-Origin'),null);assert.equal(outbound,0);}});
 test(site+' contact same-origin preflight remains 405 with POST method contract',async()=>{const {response,outbound}=await run({method:'OPTIONS'});assert.equal(response.status,405);assert.equal(response.headers.get('Allow'),'POST');assert.equal(response.headers.get('Cache-Control'),'no-store');assert.equal(response.headers.get('Access-Control-Allow-Origin'),null);assert.equal(outbound,0);});
 test(site+' GET and HEAD contact behavior remains 405 without Origin',async()=>{for(const method of ['GET','HEAD']){const {response,outbound}=await run({method,origin:undefined});assert.equal(response.status,405);assert.equal(outbound,0);}});
 test(site+' public ASSETS GET still accepts no Origin',async()=>{const {response,outbound}=await run({url:canonical+'/index.html',method:'GET',origin:undefined});assert.equal(response.status,200);assert.equal(await response.text(),'public fixture');assert.equal(response.headers.get('X-Content-Type-Options'),'nosniff');assert.equal(outbound,0);});
}
