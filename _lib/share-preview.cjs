const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {createHash} = require('node:crypto');

const SITE = 'https://photo.nadaun.co';
const template = fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf8');

// Read the deployed, trusted source only. Request data never enters the VM.
// The existing photo sync keeps PROJECTS current, so there is no second catalog to maintain.
function sourceValue(name, pattern, helpers = {}) {
  const match = template.match(pattern);
  if (!match) throw new Error('Missing photo source: ' + name);
  return vm.runInNewContext('(' + match[1] + ')', helpers, {timeout:1000});
}
const projects = sourceValue('PROJECTS', /const PROJECTS = (\[[\s\S]*?\n\]);/, {imgs:()=>[], imgsSpread:()=>[]});
const slugs = sourceValue('PHOTO_CATEGORY_SLUGS', /const PHOTO_CATEGORY_SLUGS = (\{[\s\S]*?\n\});/);
const categories = new Map(Object.entries(slugs).map(([category, slug]) => [slug, category]));
const byId = new Map(projects.map(project => [String(project.id), project]));

function projectById(id) {
  return typeof id === 'string' && /^\d+$/.test(id) ? byId.get(id) : undefined;
}

function coverUrl(project) {
  const cover = new URL(project.cover, SITE + '/');
  if (cover.origin !== SITE || !cover.pathname.startsWith('/images/portfolio/')) throw new Error('Unexpected photo cover');
  return 'https://media.nadaun.co/photo/' + cover.pathname.slice('/images/'.length)
    .split('/').map(segment => encodeURIComponent(decodeURIComponent(segment))).join('/') + cover.search;
}

function imageUrl(project) {
  const version = createHash('sha256').update(project.cover).digest('hex').slice(0,12);
  return `${SITE}/share-image/${project.id}.webp?v=${version}`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}

function renderPreview(slug = '', id, revision) {
  if (slug && !categories.has(slug)) return null;
  const category = categories.get(slug);
  const project = projectById(id);
  const representative = project || projects.find(item => !category || item.category === category);
  if (!representative) return null;
  const url = new URL('/' + slug, SITE);
  if (project) url.searchParams.set('project', String(project.id));
  if (revision === '2') url.searchParams.set('s', revision);
  const title = project ? `${project.name} · ${project.category} | 나다운` : category ? `${category} | 나다운 포토그래피` : '나다운 포토그래피';
  const description = project ? `${project.name} — 나다운 ${project.category} 촬영 포트폴리오.` : category ? `나다운의 ${category} 촬영 포트폴리오를 만나보세요.` : '나다운 사진 포트폴리오를 만나보세요.';
  const image = imageUrl(representative);
  const alt = `${representative.name} · ${representative.category} — NADAUN Photography`;
  let html = template.replace(/<title>[\s\S]*?<\/title>/, () => '<title>' + escapeHtml(title) + '</title>');
  const values = {
    description, 'og:title':title, 'og:description':description, 'og:url':url.href, 'og:image':image,
    'twitter:title':title, 'twitter:description':description, 'twitter:image':image,
  };
  for (const [key, value] of Object.entries(values)) {
    const pattern = new RegExp('(<meta (?:name|property)="' + key + '" content=")[^"]*(")');
    html = html.replace(pattern, (_, before, after) => before + escapeHtml(value) + after);
  }
  html = html.replace(/(<link rel="canonical" href=")[^"]*(")/, (_, before, after) => before + escapeHtml(url.href) + after)
    .replace(/\s*<meta property="og:image:(?:width|height)"[^>]*>/g, '')
    .replace(/(<link rel="preload" as="image" type="image\/webp" href=")[^"]*(")/, (_, before, after) => before + escapeHtml(coverUrl(representative)) + after)
    .replace('</head>', `  <meta property="og:image:type" content="image/webp">\n  <meta property="og:image:alt" content="${escapeHtml(alt)}">\n  <meta name="twitter:image:alt" content="${escapeHtml(alt)}">\n</head>`);
  return {html, image, title, url:url.href, representative, category};
}

module.exports = {renderPreview, projectById, coverUrl};
