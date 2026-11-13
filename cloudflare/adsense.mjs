// Only approved public HTML keeps the publisher block. APIs never carry ad tags.
export const adHtmlPaths = new Set(["/", "/index.html", "/services-guide.html", "/editorial", "/corporate", "/collaboration", "/concert-festival", "/external-event", "/poster", "/lookbook", "/magazine", "/portrait", "/actor-profile", "/business-profile", "/company-profile", "/couple", "/family"]);
const block = /<!-- NADAUN_ADSENSE_AUTO_BEGIN -->[\s\S]*?<!-- NADAUN_ADSENSE_AUTO_END -->\r?\n?/g;
export async function publicAdPolicy(response, pathname, head = false) {
  if (head || response.status !== 200 || !response.headers.get('Content-Type')?.includes('text/html') || adHtmlPaths.has(pathname)) return response;
  const html = await response.text();
  const clean = html.replace(block, '');
  const headers = new Headers(response.headers);
  headers.delete('Content-Length');
  headers.delete('ETag');
  return new Response(clean, {status: response.status, statusText: response.statusText, headers});
}
