# Cloudflare recovery package — nadaun-photo-portfolio

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
