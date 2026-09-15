# Photo portfolio sharing

The share icon beside the close button copies a link to the current photo project.
Opening that link displays the project's photo viewer directly, including on mobile.

- URL: `https://photo.nadaun.co/?project=<id>`.
- Use the persistent `PROJECTS.id`; never use shuffled display position or array index.
- Moving to another project updates the URL and the copied link. Closing clears the project parameter.
- Clipboard API failures fall back to browser copy, then a manual link prompt. Success feedback appears only after a successful copy.
- The cache refresh must preserve the `project` parameter.
- Keep the share icon next to close, with a 44px touch target. Preserve the existing grid, viewer controls, category navigation and motion.

Implementation: `photo-share.js`, `photo-share.css`, and the viewer hooks in `index.html`.
The photo sync updates the `PROJECTS` data block; it must preserve these hooks and asset references.

Validation: direct project links, project ID 0, next-project sharing, close/reload,
cache refresh, clipboard failure fallbacks, invalid project IDs, and desktop/mobile widths.
