import {readFile,readdir,mkdir,copyFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url)),root=path.resolve(here,'..'),site=path.basename(root);
const source=site==='nadaun-photo-portfolio'?root:path.join(root,'src'),publicDir=path.join(here,'public');
await mkdir(publicDir,{recursive:true});
const extensions=new Set(['.html','.css','.js','.webmanifest','.ico','.png','.svg']);
const records=[];
for(const item of await readdir(source,{withFileTypes:true})){
 const name=item.name;
 if(!item.isFile()||name.startsWith('.')||!(extensions.has(path.extname(name))||['ads.txt','robots.txt','sitemap.xml','indexnow-verification.txt','agency-manifest.json'].includes(name)))continue;
 const bytes=await readFile(path.join(source,name));await copyFile(path.join(source,name),path.join(publicDir,name));
 records.push({path:'/'+name,source:path.relative(root,path.join(source,name)).replaceAll('\\','/'),bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
}
if(!records.some(x=>x.path==='/index.html'))throw Error('Missing public index');
const manifestRoutes=site==='nadaun-agency-portfolio'?{'/agency-manifest.json':'https://media.nadaun.co/agency/manifest.json'}:site==='nadaun-video-portfolio'?{'/video-manifest.json':'https://media.nadaun.co/video/manifest.json'}:{};
const securityHeaders={'X-Content-Type-Options':'nosniff','X-Frame-Options':'SAMEORIGIN','Referrer-Policy':'no-referrer'};
const headersBody='/*\n'+Object.entries(securityHeaders).map(([key,value])=>'  '+key+': '+value).join('\n')+'\n';
await writeFile(path.join(publicDir,'_headers'),headersBody);
const assetControlFiles=[{path:'/_headers',bytes:Buffer.byteLength(headersBody),sha256:createHash('sha256').update(headersBody).digest('hex'),servedAsAsset:false}];
const workerFirstPaths=JSON.parse(await readFile(path.join(root,'wrangler.jsonc'),'utf8')).assets.run_worker_first;
if(!Array.isArray(workerFirstPaths))throw Error('Selective Worker-first paths required');
const staticPaths=records.map(record=>record.path).filter(pathname=>pathname!=='/index.html'&&!Object.hasOwn(manifestRoutes,pathname));
for(const pathname of staticPaths)if(!workerFirstPaths.includes('!'+pathname))throw Error('Missing explicit static bypass '+pathname);
for(const pattern of workerFirstPaths.filter(value=>value.startsWith('!')))if(!staticPaths.includes(pattern.slice(1)))throw Error('Unapproved static bypass '+pattern);
const requiredWorkerPaths=['/','/index.html','/api/*',...Object.keys(manifestRoutes)];
for(const pathname of requiredWorkerPaths)if(!workerFirstPaths.includes('/*')&&!workerFirstPaths.includes(pathname))throw Error('Missing dynamic Worker route '+pathname);
const packageNames=new Set([...records.map(record=>record.path.slice(1)),'_headers']);
for(const name of await readdir(publicDir))if(!packageNames.has(name))throw Error('Unexpected file in public package: '+name);
await writeFile(path.join(here,'public-routes.mjs'),'export const publicPaths = '+JSON.stringify(records.map(x=>x.path))+';\nexport const manifestRoutes = '+JSON.stringify(manifestRoutes)+';\n');
const legacy=(await readFile(path.join(root,'api/contact.js'),'utf8')).replace('handler(req, res)','handler(req, res, env)').replaceAll('process.env.RESEND_API_KEY','env.RESEND_API_KEY');
if(legacy.includes('process.env'))throw Error('Unconverted environment dependency');
await writeFile(path.join(here,'contact-handler.mjs'),legacy);
await writeFile(path.join(here,'asset-proof.json'),JSON.stringify({site,preparedAt:new Date().toISOString(),publicFiles:records,manifestRoutes,securityHeaders,assetControlFiles,workerFirstPaths,requiredWorkerPaths,requiredSecretNames:['RESEND_API_KEY'],excluded:'Only explicit public top-level HTML/CSS/JS/icons/metadata are staged; no private dirs, source helpers, env or originals. Original contact code is bundled server-side only with env binding adaptation.'},null,2)+'\n');
console.log(JSON.stringify({site,files:records.length,bytes:records.reduce((n,x)=>n+x.bytes,0),manifestRoutes,requiredSecretNames:['RESEND_API_KEY']}));

import vm from 'node:vm';
const template=await readFile(path.join(source,'index.html'),'utf8');
const originalPreview=await readFile(path.join(root,'_lib/share-preview.cjs'),'utf8');
let runtime;
if(site==='nadaun-photo-portfolio'){
 const projectMatch=template.match(/const PROJECTS = (\[[\s\S]*?\n\]);/),slugMatch=template.match(/const PHOTO_CATEGORY_SLUGS = (\{[\s\S]*?\n\});/);
 if(!projectMatch||!slugMatch)throw Error('Missing trusted photo source data');
 const projects=vm.runInNewContext('('+projectMatch[1]+')',{imgs:()=>[],imgsSpread:()=>[]},{timeout:1000});
 const slugs=vm.runInNewContext('('+slugMatch[1]+')',{}, {timeout:1000});
 await writeFile(path.join(here,'source-data.mjs'),'export const template='+JSON.stringify(template)+';\nexport const projects='+JSON.stringify(projects)+';\nexport const slugs='+JSON.stringify(slugs)+';\n');
 runtime="import {createHash} from 'node:crypto';\nimport {template,projects,slugs} from './source-data.mjs';\nconst SITE='https://photo.nadaun.co';\nconst categories=new Map(Object.entries(slugs).map(([category,slug])=>[slug,category]));\nconst byId=new Map(projects.map(project=>[String(project.id),project]));\n"+originalPreview.slice(originalPreview.indexOf('function projectById')).replace(/module[.]exports[\s\S]*$/,'')+"\nexport {renderPreview,projectById,coverUrl};\n";
}else{
 const fallback=JSON.parse(await readFile(path.join(root,'_content/video-manifest.json'),'utf8'));
 const posterVersion=template.match(/const POSTER_VER = '([^']+)'/)[1];
 const start=template.indexOf('const FILE_LABEL ='),end=template.indexOf('// Keep category swaps',start);
 if(start<0||end<start)throw Error('Missing trusted video label rules');
 await writeFile(path.join(here,'video-rules.mjs'),template.slice(start,end)+'\nexport {matchesCategory,canonicalVideoFile};\n');
 await writeFile(path.join(here,'source-data.mjs'),'export const template='+JSON.stringify(template)+';\nexport const fallback='+JSON.stringify(fallback)+';\nexport const posterVersion='+JSON.stringify(posterVersion)+';\n');
 const definitions=originalPreview.slice(originalPreview.indexOf('const validGalleries'),originalPreview.indexOf('function normalizeManifest'));
 runtime="import {createHash} from 'node:crypto';\nimport {template,fallback,posterVersion} from './source-data.mjs';\nimport {matchesCategory,canonicalVideoFile} from './video-rules.mjs';\nconst SITE='https://video.nadaun.co',MEDIA='https://media.nadaun.co/video/';\nconst rules={matchesCategory,canonicalVideoFile};\n"+definitions+originalPreview.slice(originalPreview.indexOf('function normalizeManifest')).replace(/module[.]exports[\s\S]*$/,'')+"\nexport {loadManifest,normalizeManifest,renderPreview,selection,findImage,posterUrl,imageId,rules};\n";
}
await writeFile(path.join(here,'preview-runtime.mjs'),runtime);
for(const [input,output]of [['share.js','share-route.mjs'],['share-image.js','share-image-route.mjs']]){
 const original=await readFile(path.join(root,'api',input),'utf8');
 await writeFile(path.join(here,output),original.replace("import preview from '../_lib/share-preview.cjs';","import * as preview from './preview-runtime.mjs';").replaceAll("redirect:'error'","redirect:'manual'"));
}
