# Marvel Watch

English, responsive, buildless Marvel watch tracker based on the user's Google Sheets LIST tab, imported 2026-10-09.

## Deployment

Static output is `dist/`. Firebase project `marvel-list-database` is configured. Username-only registration uses Firebase Authentication internally and requires the matching new Firestore rules to be published. New accounts remain pending until approved; the owner UID must be bootstrapped separately. See `backend/README.md`. Hosting identity is in `.openai/hosting.json`.

## Data

`dist/data.json` contains 344 titles, including the earlier 110-title watchlist, the Wikipedia-based MCU collection and the expanded All Marvel collection. The existing title positions are preserved for saved progress. Data is a snapshot, not live synchronization. `watched` holds the source's checked titles for opt-in additive import; new visitors start fresh. Poster provenance is recorded per item.

The source's unusual dates are preserved and explained in the data dialog. Runtime estimates for partly completed seasons divide total season duration evenly by episode count.

## Persistence

Progress, favorites, and profile name are stored in a compact first-party cookie `marvel_watch_v1` with a 400-day rolling maximum age, SameSite=Lax, Path=/ and Secure on HTTPS. Up to five comparison snapshots use separate `marvel_friend_N` cookies. Cookies are browser/device scoped. Storage failures are shown and export remains available. Cookies are sent to this site's host in normal HTTP requests; there is no profile synchronization service.

`MW1.` backup/share codes contain version, profile ID, name, timestamp, and the episode progress array. Downloads also contain favorites. Imported snapshots are strictly range-validated and names are escaped. Friend links use the URL fragment, which is removed after staging an import. The user must add the friend explicitly. Comparisons are snapshots, not live feeds.

## Validation

Run `node --check dist/app.js` and `node validate.mjs`. No managed preview was launched because the required control-browser skill is unavailable in this session. Browser layout and interaction QA remain unverified.

## Updating

Preserve item IDs and array positions for cookie and backup compatibility. New entries are appended; the separate order field controls viewing order. Legacy 84-entry cookies, friend codes, and backups are padded with two unwatched entries. Road to Doomsday contains X-Men/Deadpool and optional Daredevil/Defenders subsections. The next-title queue follows the selected collection. `extract-source.py` is a one-off XML-based importer from the task's source workbook; do not rerun it without reapplying posters. `download-posters.py` records provenance and optimizes local poster assets from MCU API and the mcu-flowchart poster collection.

## Added title sources

- https://www.20thcenturystudios.com/movies/x-men-first-class (2011, 131 minutes)
- https://www.disneyplus.com/browse/entity-9f9e9ae3-88d8-467b-8969-28d253cc4687
- https://www.disneyplus.com/en-il/browse/entity-61687bed-4a66-4657-9252-df80ca1d1fbc

Availability varies by region and subscription. Road to Doomsday is a fan recommendation, not a required official syllabus.

## Settings and Doomsday routes

Settings use a separate marvel_settings_v1 cookie. Theme (dark/light/system), accent, hide-watched, compact view, labels, and reduced motion persist on this device. Focused route has 15 tracked entries: 14 from the Disney+ guide (Loki split into seasons) plus our Endgame recommendation. Expanded adds optional editorial context. Friend comparisons use the same selected route for both people. Filters never delete progress. All 86 titles have classifications and reasons. Source checked 2026-10-09: https://www.disneyplus.com/explore/articles/countdown-to-avengers-doomsday . No missing film or series was found against that guide. These are preparation recommendations, not guaranteed mandatory viewing.

## RoadToDoomsday sync — October 9, 2026

The selected fan tracker is now the route source: https://roadtodoomsday.com and https://roadtodoomsday.com/guide. 24 optional entries were appended, bringing the full collection to 110. All earlier 86 item positions, IDs, episode counts, original runtimes and URLs remain unchanged. Legacy 84- and 86-entry profiles migrate by appending zeros; favorites and friend snapshots remain compatible. The tracker covers 103 distinct entries after expanding bundles; seven existing entries outside that tracker are retained in Full collection.

Routes: 15-title source speedrun; 62-title main route; 41 optional entries; source route including optional entries; full 110-title collection. Source tiers are fan recommendations, not official plot requirements. Road steps preserve the Hawkeye 1–5 / No Way Home / Hawkeye 6 checkpoints; First Class precedes Days of Future Past per the written guide. Other season bundles are expanded without creating duplicate progress. New items link to IMDb title search until user watch links are available. Unknown short-film runtimes/dates remain unknown; X-Men 97 Season 2 is tracked as a whole-season placeholder with no asserted release date or episode count.

UI accents use the selected CSS variable, including headings, focus rings, phase dots, poster overlays, hero shading, profile tint, progress and active controls. Green watched-state indicators remain semantic. This is a source snapshot, not a recurring synchronization service.

## Reliability update — October 9, 2026

Full collection follows the original sheet MCU section before extras. Release-date sorting changes Next to watch and preserves that partition; unknown dates sort last within each section. Name/runtime sorts are for browsing. Road routes retain episode checkpoints unless release order is selected. The malformed Thor: The Dark World date is corrected to 2013-11-08, with its D23 source recorded.

Undo retains the last 20 progress/favorite/import/reset actions in memory. Full JSON backups contain ID-keyed progress, favorites, friend snapshots, settings and view filters. Imports preview before applying, validate size/IDs/counts and cookie capacity, and attempt rollback on write failure. Legacy MW1 codes and comparison links remain supported.

Finish estimates use the local device clock and label next-day finishes. Series use average episode lengths. Friends receive the earliest shared unwatched movie based on the chosen route and saved snapshot. Mobile header hides downward and returns upward; navigation, compact labels, tap targets and long text have been adjusted.

Security: validated data, URL/path allowlists, normalized imports, independent malformed-link handling, HTML CSP and no-referrer. See HOSTING-SECURITY.md for response headers and final-domain requirements. No PWA added.

## iPhone home-screen app — Marvel List

Upload the complete dist contents to the same GitHub Pages folder as before. index.html now includes the Apple standalone/title/touch-icon settings and links to manifest.webmanifest. PNG icons use the existing M logo. Manifest start_url, scope and id are relative so project pages such as /repo/ remain in the correct folder.

On iPhone: open the deployed HTTPS page in Safari, Share, Add to Home Screen, keep Open as Web App enabled if shown, then Add. The suggested name is Marvel List. If an older home-screen shortcut exists, export a full backup from it before replacing it; iOS may retain its original icon/name. This update enables standalone launch but does not add offline caching or a service worker. Browser/device validation still remains.

## Poster update

Nine requested titles now reference distinct local poster files. Six newly sourced posters are credited per title in dist/data.json; three existing local posters were repackaged under new filenames to refresh cached paths. Upload the complete dist/assets directory with data.json, otherwise posters will be missing on GitHub Pages. X-Men ’97 Season 2 uses the official Marvel season image.

## Version 1.0.0

The current displayed version is 1.5. Bump it only when the owner explicitly asks to advance the version; the next version is 1.6, then 1.7, and so on. Publish the requested version with its GitHub update. Routine edits do not automatically advance the displayed version. Skip is a personal saved list separate from watched progress. Skipped titles leave Next to watch, stay uncompleted in statistics, and appear in Skipped Items across routes. Marking a skipped title watched clears its skipped flag. Undo, reset and full backup include the skipped list; old cookies/backups without it remain supported.


## Version 1.2

Updated 22 title watch-link entries and six runtimes supplied by the owner on October 11, 2026. All other metadata, title identities and ordering are preserved. The Agent Carter One-Shot intentionally uses the supplied Item 47 URL, pending correction from the owner. X-Men ’97 Season 2 uses the supplied total runtime 04:26:27.


## Version 1.3

Live countdown to the owner-specified December 18, 2026 at 20:00 Israel time. Daily hours use remaining known runtime in the selected route divided by fractional 24-hour days to the deadline. This matches Still to watch, including skipped titles; unknown runtimes and partial-season estimates are disclosed. The timer stops at zero and resumes accurately after a background tab returns.


## Version 1.5

My lists (lists.html): named swipe builder, right to add, left to pass, up to defer. Deferred cards return after undecided cards. Up to five device-local cookie lists and one resumable draft. Saved lists use global release-date order; the home catalogue groups them by original phase while Next to Watch uses release order. Unknown dates sort last. Existing watched progress is shared. Full backup includes saved lists. Classifications use existing saved RoadToDoomsday metadata.


## Version 1.5.3

Fixed phone access paths: the account menu provides direct Friends and Manage site links; owners are recognized from the protected owner record even when role flags were not set on the profile. Firestore permissions now grant the configured owner full site access independently of profile flags.

## Version 1.5.2

The account avatar opens a menu with Sign out. The embedded management route now switches directly to its dashboard and reports partial loading failures. My friends is a separate in-site page for username requests, pending approval, accepted friends and a movie-night suggestion. The new Firestore rules in `backend/firestore.rules` must be published separately in Firebase Console for friendship actions. No friend count limit applies.

## Version 1.5.1

Fixed swipe movement and scroll anchoring in the personal-list builder. Vertical swipes in either direction defer the current title. After a swipe replaces the card, the page restores its previous scroll position.


## Wikipedia catalog expansion — 2026-10-13

All MCU (based on Wikipedia): 118 entries. All Marvel: 344 entries, 234 newly added. See dist/catalog-additions.txt for scope, sources, additions and reused titles. Existing IDs/order, runtime and watch URLs are retained. Historical release-date corrections are recorded in originalDate/dateSource. Built-in collections are selectable on home and My Lists. Large saved lists use verified chunked cookies. The owner requested the next version, 1.5.2.

Run `node validate.mjs` for the legacy 1.5.1 regression fixture, then `node test-catalog.mjs` for expanded catalog/storage migration. Browser QA is unavailable in this session. `backend/` contains the active username-only Firestore rules and owner bootstrap instructions. Authentication and authorization code is present; publish the matching rules and initialize the owner UID before inviting users. The static catalog remains public at its URL.

Management lives in the home app at `index.html#manage`. The sidebar entry appears only for approved Manager, Senior manager (Fmanage), or Owner accounts. Old `admin.html` links redirect there. Firestore rules enforce every management operation; the route and menu visibility are UI gates only. One-time owner setup remains a privileged Firebase Console/Admin SDK action.
