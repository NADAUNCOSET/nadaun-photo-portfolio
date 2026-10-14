import preview from '../_lib/share-preview.cjs';

export function GET(request) {
  const url = new URL(request.url);
  // Vercel rewrites supply the category while retaining the public project's query.
  const slug = url.searchParams.get('category') || '';
  try {
    const page = preview.renderPreview(slug, url.searchParams.get('project'));
    if (!page) return new Response('Not found', {status:404});
    if (url.searchParams.get('_canonical') === '1') {
      const canonical = new URL(page.url);
      return new Response(null, {status:308, headers:{Location:canonical.pathname + canonical.search}});
    }
    return new Response(page.html, {headers:{
      'Content-Type':'text/html; charset=utf-8',
      'Cache-Control':'public, max-age=0, s-maxage=300, must-revalidate',
      'X-Content-Type-Options':'nosniff',
    }});
  } catch (error) {
    console.error('Photo share preview failed:', error.message);
    return new Response('Preview temporarily unavailable', {status:503, headers:{'Cache-Control':'no-store'}});
  }
}

export function HEAD(request) {
  const response = GET(request);
  return new Response(null, {status:response.status, headers:response.headers});
}
