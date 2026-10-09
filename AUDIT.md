# Marvel Watch implementation audit

## Completed checks

- All 110 title identifiers, URLs and episode counts retained.
- Legacy 84/86-entry progress and friend migrations pass.
- MCU-first order and release-date queue consistency verified.
- Hawkeye checkpoints retained; empty route sections no longer show false completion.
- Undo recovers hidden titles and partial progress.
- Full backup round-trip preserves settings, friends, favorites and ID-keyed progress.
- Malformed/oversized backups, unknown IDs, invalid episode counts and duplicate friends rejected.
- File imports preview before writing; simulated cookie-write failure restores prior cookies and leaves in-memory state untouched.
- Broken friend URL no longer blocks catalog loading. Legacy code/link restoration passes.
- Unsafe URLs/assets and invalid catalog data rejected; invalid dates explicitly unknown.
- Finish estimates cover midnight, multiple days, partial seasons and missing runtimes.
- Shared-film selection and mobile navigation states tested. JavaScript syntax passes.

## Limits

Tests use a simulated DOM. Required browser-control tooling is unavailable, so real Safari/iPhone layout, file-download UX and cookie restrictions require device QA. Target-domain TLS/certificates and response security headers remain deployment checks. `_headers` is a provider-specific template, not proof of enforcement. Some source dates/runtimes remain unverified and are labeled; not all title metadata has been independently reverified. External viewing sites are outside this audit. Friends use manually shared, self-reported snapshots. Clearing browser data can still remove progress: export before changing domains. No guarantee of zero bugs or complete security.

## Home-screen packaging check

Apple title/capable/icon tags and standalone manifest added. Name: Marvel List. Relative paths checked against both root-domain and GitHub project-folder URLs. PNG icon sizes verified at 180, 192 and 512 pixels. No service worker caching or automatic reloads added. Installation on an actual iPhone remains unverified.
