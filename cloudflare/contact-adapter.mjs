import legacyContact from './contact-handler.mjs';
export async function contact(request,env){
 if(request.method!=='POST')return Response.json({error:'Method not allowed'},{status:405});
 if(!env.RESEND_API_KEY)return Response.json({error:'Inquiry service is not configured'},{status:503,headers:{'Cache-Control':'no-store'}});
 let body;try{
  const reader=request.body?.getReader();let length=0;const chunks=[];
  if(reader){while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>65536){await reader.cancel();return Response.json({error:'Inquiry too large'},{status:413})}chunks.push(value)}}
  const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength}
  body=JSON.parse(new TextDecoder().decode(bytes)||'{}');
 }catch{return Response.json({error:'Invalid inquiry'},{status:400})}
 let code=200,result;const res={status(value){code=value;return this},json(value){result=Response.json(value,{status:code,headers:{'Cache-Control':'no-store'}});return result}};
 try{return await legacyContact({method:'POST',body},res,env)||result||Response.json({error:'Inquiry failed'},{status:502})}
 catch{return Response.json({error:'Invalid inquiry'},{status:400})}
}
