# Photo portfolio sharing

## Category links

Select a category, then use the small share icon at the top right beside Contact.
It uses the same icon and 44px touch target as the individual photo viewer.
The copied URL opens that category immediately, without showing the ALL grid first.

- ALL: `https://photo.nadaun.co/`
- Category address: `https://photo.nadaun.co/portrait`.
- The copy button adds the short, stable preview revision `?s=2` (project links append `&s=2`). This avoids reusing previews cached before category metadata was deployed; it is not tracking. The server preserves this revision in `og:url` so scrapers do not return to the old cached URL. Clean addresses remain supported.
- Selecting categories updates browser history; back/forward restores the category and grid.
- Vercel serves the original page through `api/share.js` for category paths, with matching server-rendered preview metadata. Category paths with a trailing slash redirect to the clean path, preserving a valid project ID and keeping relative image paths at `/images/`.
- Existing category order, project data, curated photo ordering and transition effects are preserved.

| Category | Path |
| --- | --- |
| Editorial | `/editorial` |
| Corporate | `/corporate` |
| Collaboration | `/collaboration` |
| Concert & Festival | `/concert-festival` |
| External Event | `/external-event` |
| Poster | `/poster` |
| Lookbook | `/lookbook` |
| Magazine | `/magazine` |
| Portrait | `/portrait` |
| Actor Profile | `/actor-profile` |
| Business Profile | `/business-profile` |
| COMPANY PROFILE | `/company-profile` |
| Couple | `/couple` |
| Family | `/family` |

When adding a category, add its stable slug to `PHOTO_CATEGORY_SLUGS` in `index.html`
and the explicit route in `vercel.json`. Do not derive shared URLs from a display index.

## Individual project links

The share icon beside the close button copies a link to the current photo project.
Opening that link displays the project's photo viewer directly, including on mobile.

- Existing URL: `https://photo.nadaun.co/?project=<id>` remains supported.
- Sharing within a category keeps its context, e.g. `https://photo.nadaun.co/portrait?project=1409`.
- Use the persistent `PROJECTS.id`; never use shuffled display position or array index.
- Moving to another project updates the URL and the copied link. Closing clears the project parameter.
- Clipboard API failures fall back to browser copy, then a manual link prompt. Success feedback appears only after a successful copy.
- The cache refresh must preserve the `project` parameter.
- Keep the share icon next to close, with a 44px touch target. Preserve the existing grid, viewer controls, category navigation and motion.

Implementation: `photo-share.js`, `photo-share.css`, `vercel.json`, and the category/viewer hooks in `index.html`.
The photo sync updates the `PROJECTS` data block; it must preserve these hooks and asset references.

Validation: all 14 category links and first-render filtering, browser back/forward,
ALL reset, direct project links, project ID 0, next-project sharing, close/reload,
cache refresh, clipboard failure fallbacks, invalid project IDs, route responses and assets.
The 2026-10-14 backup includes `verify-sharing.cjs` and `logic-verification.json` for the
24 Node VM checks against the real source. This is logic verification, not visual browser QA.

## Link preview images (2026-10-14)

KakaoTalk and other link scrapers receive the matching Open Graph/Twitter title, image,
description and canonical URL directly in the HTML response, without running JavaScript.
Category previews use a stable cover from that category in the deployed PROJECTS order.
Project links, including the existing `/?project=0` form, use that project's cover.

- `_lib/share-preview.cjs` reads only the deployed `index.html` source. The photo sync remains the single source for projects and covers; there is no duplicated catalog or generated-page folder.
- `api/share.js` changes the head metadata and image preload only. The original viewer/grid scripts and body are unchanged.
- Explicit Vercel `routes` run sharing before the static filesystem. This is required so existing `/?project=<id>` links do not get the generic static `index.html` metadata.
- `/share-image/<id>.webp?v=<cover-version>` returns the existing public cover bytes with the correct `image/webp` response type. Only known project IDs are accepted; no caller-supplied image URL is fetched. Media originals are not edited or copied.
- Cover paths are encoded segment by segment, including Korean, spaces and ampersands. The image version changes when its source path changes. False fixed image dimensions are removed.
- Metadata has a five-minute CDN cache. Images use a one-day CDN cache and one-hour browser cache. No disk cache is created.
- Messaging apps also maintain their own preview cache. Previously shared URLs may need a cache refresh in [Kakao's OG tools](https://developers.kakao.com/tool); changing our HTML cannot rewrite already-sent messages.

Verification source: `backups/2026-10-14_173739_share-preview/verify-preview.cjs`.
It covers all 14 categories and 346 project mappings, unchanged page body, project ID 0,
invalid IDs, HTML escaping, HEAD requests, allowed image sources and MIME/error handling.
