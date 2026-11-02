import preview from '../_lib/share-preview.cjs';

export async function GET(request) {
  const url = new URL(request.url);
  const project = preview.projectById(url.searchParams.get('project'));
  if (!project) return new Response('Not found', {status:404});
  try {
    // Only published covers are allowed. Check metadata without downloading image bytes.
    const target = preview.coverUrl(project);
    const upstream = await fetch(target, {method:'HEAD', signal:AbortSignal.timeout(8000), redirect:'error'});
    if (!upstream.ok) throw new Error('Cover response ' + upstream.status);
    const size = Number(upstream.headers.get('content-length'));
    const type = upstream.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
    if (!Number.isSafeInteger(size) || size <= 0 || size > 5 * 1024 * 1024 || type !== 'image/webp') {
      throw new Error('Invalid preview image');
    }
    return new Response(null, {status:307, headers:{
      'Location':target,
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
