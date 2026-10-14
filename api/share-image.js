import preview from '../_lib/share-preview.cjs';

export async function GET(request) {
  const url = new URL(request.url);
  const project = preview.projectById(url.searchParams.get('project'));
  if (!project) return new Response('Not found', {status:404});
  try {
    // Only published project covers are allowed; never proxy a caller-supplied URL.
    const upstream = await fetch(preview.coverUrl(project), {signal:AbortSignal.timeout(8000), redirect:'error'});
    if (!upstream.ok) throw new Error('Cover response ' + upstream.status);
    const bytes = Buffer.from(await upstream.arrayBuffer());
    if (bytes.length > 5 * 1024 * 1024 || bytes.toString('ascii',0,4) !== 'RIFF' || bytes.toString('ascii',8,12) !== 'WEBP') {
      throw new Error('Invalid preview image');
    }
    return new Response(bytes, {headers:{
      'Content-Type':'image/webp',
      'Cache-Control':'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
      'X-Content-Type-Options':'nosniff',
    }});
  } catch (error) {
    console.error('Photo share image failed:', error.message);
    return new Response('Image temporarily unavailable', {status:502, headers:{'Cache-Control':'no-store'}});
  }
}

export async function HEAD(request) {
  const response = await GET(request);
  return new Response(null, {status:response.status, headers:response.headers});
}
