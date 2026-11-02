# Cloudflare recovery package — nadaun-photo-portfolio

## Current state — 2026-11-02 afternoon

Canonical URL: [https://photo.nadaun.co](https://photo.nadaun.co). Source: [NADAUNCOSET/nadaun-photo-portfolio](https://github.com/NADAUNCOSET/nadaun-photo-portfolio) from the existing NAS `_Site/nadaun-photo-portfolio` master. The Worker and canonical domain were deployed; home200 is verified. GitHub automatic deployment linking and each business feature are separate checks.

The current optimization keeps Worker handling as the default (`/*`) and bypasses it only for 22 exact approved static paths using negative patterns. Home `/`, `/index.html`, API, sharing/category queries, metadata, unknown and encoded paths retain Worker handling. The exact list is in [wrangler.jsonc](../wrangler.jsonc). The asset package adds a non-public `_headers` control file with the same nosniff, SAMEORIGIN and no-referrer headers; original payload bytes, media URLs and quality remain unchanged.

Prepare with `node cloudflare/prepare-assets.mjs`; run `node --test cloudflare/worker.test.mjs cloudflare/asset-delivery.test.mjs` (14 checks). `node cloudflare/asset-delivery-smoke.mjs <verified-wrangler-api-entry>` uses the installed Wrangler4.156.1 local runtime and production compatibility date2026-11-02 to test actual asset bypass, headers, private404, method guards and dynamic routes. Its test probe stays in ignored NAS logs and is never the production main. This optimization is awaiting the operator's remote deployment and live verification.

Contact delivery remains incomplete until the authorized sending credential is correctly bound and actual delivery is verified. GET405 and mocked validation tests do not establish a delivered email. Static delivery avoids Worker invocation only for the listed canonical assets; home/dynamic requests still use Worker quota. The actual account plan is unverified, and domain fees do not include unlimited Worker/R2 usage.

## Preparation snapshot — before deployment, preserved history

Prepared 2026-11-02 05:56:50 UTC. **Local package only; deployment and DNS are handled by the root operator.**

1. From the repository root, run `node cloudflare/prepare-assets.mjs` to regenerate the explicit public allowlist and asset hashes from the current NAS source.
2. Run `node --test cloudflare/worker.test.mjs` (currently 9 passed).
3. Use the existing pinned Wrangler **4.107.0** with root `wrangler.jsonc`; direct `WRANGLER_LOG_PATH` into this `cloudflare/logs` directory. The verified dry-run command, run from `cloudflare/`, is `wrangler deploy --config ../wrangler.jsonc --dry-run --outdir ./dry-run`.
4. Review target account/Worker inventory before a workers.dev preview deployment. No account ID, routes or custom domains are declared. Preserve existing Cloudflare resources and auth.
5. Verify the preview's actual navigation, category/query deep links, metadata, HEAD/redirects, original Cloudflare media and all private/source404s, then let the domain operator perform the approved production routing change.

Contact uses the original provider/template/recipient through a native Worker adapter. Bind the existing `RESEND_API_KEY` as a Worker secret using an authorized account workflow; no value belongs in config or frontend. Missing configuration returns503. Tests never sent a real message.

The asset directory is **cloudflare/public only**. Do not deploy the repository root. `asset-proof.json` records source→copy SHA256 and size. The runtime checks the generated public allowlist before asset serving. Existing media URLs stay on Cloudflare; no Vercel fallback is used.

Photo/video prepare scripts transform existing preview helper functions into Worker ESM: fs/vm source extraction occurs at build time only; the runtime includes the same public template/catalog/labels and node:crypto compatibility. Original helper/API files are unchanged by this package.

See `verification.json` for exact checks and remaining live-verification limits. No historical pages.dev/workers.dev frontend was evidenced by the scoped repository search; root account inventory remains authoritative.


## GitHub and Cloudflare Builds

Connect the existing GitHub main branch to the matching Cloudflare Worker. Build command: `node cloudflare/prepare-assets.mjs`. No npm install or frontend dependencies are required for these five static packages; the generator uses Node built-ins only (Node 24 tested). Wrangler root config declares the same build command, so a deployment regenerates the current public files and server-side preview data before bundling. The deployment environment supplies Wrangler.

Track only worker/prepare/contact-adapter source, tests, this README, root wrangler.jsonc and the related existing application source. Generated public files, helper modules, dry-run bundles, proofs, runtime state and logs remain on NAS and are ignored. Existing secret values are never in GitHub/config.

## Explicit HTML URL handling

Keep `assets.html_handling` set to `none`. Cloudflare default HTML handling redirects existing `.html` URLs to extensionless paths, which the closed public allowlist correctly rejects. The Worker maps only approved `/` internally to `/index.html`; it does not open arbitrary extensionless or private paths. After deployment, verify `/`, `/index.html`, and actual navigation such as wedding `/snap.html` and `/film.html` return200 without a redirect to an unapproved route; also recheck private/source404 and HEAD body0. Official behavior: https://developers.cloudflare.com/workers/static-assets/routing/advanced/html-handling/#disable-html-handling
