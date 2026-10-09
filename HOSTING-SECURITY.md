# Hosting security

The HTML includes an active CSP and a no-referrer policy. Inline script execution, external scripts, object embeds, forms and base-tag changes are prohibited. Inline CSS is currently needed for progress meters.

`dist/_headers` is a hosting template for providers that support this format (for example Cloudflare Pages or Netlify). Do not assume GitHub Pages or an arbitrary server applies it. Configure equivalent HTTP response headers on your chosen host and verify the production responses. Frame restrictions only work as response headers; the HTML CSP cannot enforce frame-ancestors.

Use HTTPS with automatic certificate renewal and redirect HTTP to HTTPS. Enable HSTS only after confirming all relevant domains work over HTTPS; do not preload during initial setup.

There are no account credentials, server profiles or API keys in this static app. Shared progress is user-reported, not tamper-proof. Third-party watch destinations are outside this app’s control. Cookies are sent to the same host and are accessible to this app’s JavaScript. Changing domain requires backup/import. Do not host unrelated untrusted scripts on the same origin.

No PWA or service worker was added. Browser and production-header QA must be performed on the target domain before final release.
