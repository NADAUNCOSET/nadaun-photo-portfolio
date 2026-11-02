import {publicPaths,manifestRoutes} from './public-routes.mjs';
import {contact} from './contact-adapter.mjs';
import * as share from './share-route.mjs';
import * as image from './share-image-route.mjs';
const PHOTO=true;
const security={'X-Content-Type-Options':'nosniff','X-Frame-Options':'SAMEORIGIN','Referrer-Policy':'no-referrer'};
function finish(response,head=false){const headers=new Headers(response.headers);for(const [k,v]of Object.entries(security))headers.set(k,v);return new Response(head?null:response.body,{status:response.status,statusText:response.statusText,headers})}
export default {async fetch(request,env){
 const url=new URL(request.url),head=request.method==='HEAD';let pathname;
 try{pathname=decodeURIComponent(url.pathname)}catch{return finish(new Response('Bad request',{status:400}),head)}
 if(pathname.split('/').some(p=>p.startsWith('.'))||pathname.includes('\\')||pathname.includes('\0'))return finish(new Response('Not found',{status:404}),head);
 if(pathname==='/api/contact')return finish(await contact(request,env));
 if(!['GET','HEAD'].includes(request.method))return finish(new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD'}}));
 if(PHOTO&&pathname.startsWith('/images/')){
  const target=new URL('https://media.nadaun.co/photo/'+pathname.slice('/images/'.length));target.search=url.search;
  return finish(new Response(null,{status:307,headers:{Location:target.href}}),head);
 }
 const imageMatch=pathname.match(PHOTO?/^\/share-image\/([0-9]+)[.]webp$/:/^\/share-image\/([a-f0-9]{20})[.]jpg$/);
 if(imageMatch||pathname==='/api/share-image'){
  if(imageMatch)url.searchParams.set(PHOTO?'project':'image',imageMatch[1]);
  return finish(await image[head?'HEAD':'GET'](new Request(url,{method:request.method})),head);
 }
 if(Object.hasOwn(manifestRoutes,pathname)){
  try{const r=await fetch(manifestRoutes[pathname],{method:request.method,headers:{Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(10000)});if(!r.ok)throw Error('metadata');return finish(r,head)}
  catch{console.error(JSON.stringify({event:'public_manifest_unavailable',path:pathname}));return finish(Response.json({error:'Public gallery metadata temporarily unavailable'},{status:502,headers:{'Cache-Control':'no-store'}}),head)}
 }
 if(pathname!=='/'&&publicPaths.includes(pathname))return finish(await env.ASSETS.fetch(request),head);
 if(pathname==='/api/share')return finish(await share[head?'HEAD':'GET'](request),head);
 const gallery=pathname==='/'?'':pathname.slice(1).replace(/\/$/,'');
 if(PHOTO||pathname==='/'||/^(brand|beauty|vcr|portrait(?:\/(brand|beauty|vcr))?)\/?$/.test(gallery)){
  url.searchParams.set(PHOTO?'category':'gallery',gallery);
  if(pathname!=='/'&&pathname.endsWith('/'))url.searchParams.set('_canonical','1');
  return finish(await share[head?'HEAD':'GET'](new Request(url,{method:request.method})),head);
 }
 return finish(new Response('Not found',{status:404}),head);
}};
