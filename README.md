# Marvel Watch

English, responsive, buildless Marvel watch tracker based on the user's Google Sheets LIST tab, imported 2026-10-09.

## Deployment

Static output is `dist/`. Firebase project `marvel-list-database` is configured. Username-only registration uses Firebase Authentication internally and requires the matching new Firestore rules to be published. New accounts remain pending until approved; the owner UID must be bootstrapped separately. See `backend/README.md`. Hosting identity is in `.openai/hosting.json`.

## Data

`dist/data.json` contains 137 titles: the earlier 110-title watchlist plus 27 Wikipedia-based MCU additions. The 207 Wikipedia-only titles outside MCU and Doomsday have been removed. Progress from the former 344-title catalog is mapped to the retained titles by the historical position map. The catalog is a static snapshot and does not automatically import future sheet edits. `watched` holds the source's checked titles for opt-in additive import; new visitors start fresh. Poster provenance is recorded per item.

The source's unusual dates are preserved and explained in the data dialog. Runtime estimates for partly completed seasons divide total season duration evenly by episode count.

## Persistence

Progress, favorites, and profile name are cached in a compact first-party cookie `marvel_watch_v1` with a 400-day rolling maximum age, SameSite=Lax, Path=/ and Secure on HTTPS. Approved accounts also sync watch progress, lists, skips, favorites, and settings to their private `userWatch/{uid}` Firestore document. An unfinished swipe-list draft remains local. Storage failures are shown and export remains available.

`MW1.` backup/share codes contain version, profile ID, name, timestamp, and the episode progress array. Downloads also contain favorites. Imported snapshots are strictly range-validated and names are escaped. Friend links use the URL fragment, which is removed after staging an import. The user must add the friend explicitly. Comparisons are snapshots, not live feeds.

## Validation

Run `node --check dist/app.js` and `node validate.mjs`. No managed preview was launched because the required control-browser skill is unavailable in this session. Browser layout and interaction QA remain unverified.

## Updating

Preserve item IDs and the historical position map for cookie and backup compatibility. New entries are appended; the separate order field controls viewing order. Legacy 84-entry cookies, friend codes, and backups are padded with unwatched entries. Road to Doomsday contains X-Men/Deadpool and optional Daredevil/Defenders subsections. The next-title queue follows the selected collection. `extract-source.py` is a one-off XML-based importer from the task's source workbook; do not rerun it without reapplying posters. `download-posters.py` records provenance and optimizes local poster assets from MCU API and the mcu-flowchart poster collection.

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

The current displayed version is 1.6.5. Advance the patch version when a change is published to GitHub. Skip is a personal saved list separate from watched progress. Skipped titles leave Next to watch, stay uncompleted in statistics, and appear in Skipped Items across routes. Marking a skipped title watched clears its skipped flag. Undo, reset and full backup include the skipped list; old cookies/backups without it remain supported.


## Version 1.2

Updated 22 title watch-link entries and six runtimes supplied by the owner on October 11, 2026. All other metadata, title identities and ordering are preserved. The Agent Carter One-Shot intentionally uses the supplied Item 47 URL, pending correction from the owner. X-Men ’97 Season 2 uses the supplied total runtime 04:26:27.


## Version 1.3

Live countdown to the owner-specified December 18, 2026 at 20:00 Israel time. Daily hours use remaining known runtime in the selected route divided by fractional 24-hour days to the deadline. This matches Still to watch, including skipped titles; unknown runtimes and partial-season estimates are disclosed. The timer stops at zero and resumes accurately after a background tab returns.


## Version 1.5

My lists (lists.html): named swipe builder, right to add, left to pass, up to defer. Deferred cards return after undecided cards. Up to five device-local cookie lists and one resumable draft. Saved lists use global release-date order; the home catalogue groups them by original phase while Next to Watch uses release order. Unknown dates sort last. Existing watched progress is shared. Full backup includes saved lists. Classifications use existing saved RoadToDoomsday metadata.


## Version 1.5.12

The Add title form now requires an IMDb title URL and previews a poster suggestion derived from its title ID. A direct IMDb-hosted image URL can override the suggestion. Titles store the IMDb source, poster and watch link, and the home catalog refreshes after a successful save. The new poster fields require publishing the updated `backend/firestore.rules` in Firebase Console; GitHub Pages deployment does not publish Firestore rules.

## Version 1.5.11

Closing an open management action returns to the management dashboard. A second close exits the management dialog. The close button, watchlist/back button, backdrop, and Escape key share the same behavior.

## Version 1.5.10

The in-app management dialog now opens on a dashboard with separate buttons for adding titles, basic settings, users, title editing and removal requests. Management data loads only when its panel opens. User approval immediately shows progress and errors. Friends shows a loading screen and reuses a short-lived, per-account session cache while refreshing the latest requests in the background.

## Version 1.5.9

Updated the legacy admin link to redirect to a cache-busted home URL that opens the management dialog after sign-in.

## Version 1.5.8

Unified the versioned Firebase access-module URL across the home, management, Friends, and My Lists scripts, preventing duplicate Firebase initialization and duplicate sign-in overlays on cached mobile sessions.

## Version 1.5.7

Busted the access-module cache as well as the page script so the account menu reliably picks up the in-app management action on phones.

## Version 1.5.6

Manage site now opens as a responsive in-app dialog, matching the My Lists flow. The account menu and mobile navigation open the same modal; users without a management role never see the entry. Existing `admin.html` links return to the app and open that dialog for authorized users.

## Version 1.5.5

Manage site now has a dedicated `admin.html` route instead of relying on in-page hash navigation, improving reliable opening on mobile Safari. The dashboard shell loads directly and continues to hide all management data until Firebase confirms the user role. Added a responsive full-width mobile layout, a clear back-to-watchlist link, and cache-busted assets.

## Version 1.5.4

Reduced perceived loading delay on the Friends page: the access overlay now shows a branded progress state, request lists render without waiting for per-friend progress reads, and catalog/progress loads continue in the background. Manage site now uses a real in-app link and always opens a safe dashboard shell; account-only data remains hidden unless the current user has a management role. Added a shared load guard to prevent duplicate management reads. Updated mobile cache keys and visible version.

## Version 1.5.3

Fixed phone access paths: the account menu provides direct Friends and Manage site links; owners are recognized from the protected owner record even when role flags were not set on the profile. Firestore permissions now grant the configured owner full site access independently of profile flags.

## Version 1.5.2

The account avatar opens a menu with Sign out. The embedded management route now switches directly to its dashboard and reports partial loading failures. My friends is a separate in-site page for username requests, pending approval, accepted friends and a movie-night suggestion. The new Firestore rules in `backend/firestore.rules` must be published separately in Firebase Console for friendship actions. No friend count limit applies.

## Version 1.5.1

Fixed swipe movement and scroll anchoring in the personal-list builder. Vertical swipes in either direction defer the current title. After a swipe replaces the card, the page restores its previous scroll position.


## Wikipedia catalog expansion — 2026-10-13

All MCU (based on Wikipedia): 118 entries. All Marvel: 137 entries, with 207 unrelated Wikipedia additions removed. See dist/catalog-additions.txt for scope, sources, additions and reused titles. Existing IDs/order, runtime and watch URLs are retained. Historical release-date corrections are recorded in originalDate/dateSource. Built-in collections are selectable on home and My Lists. Large saved lists use verified chunked cookies. The owner requested the next version, 1.5.2.

Run `node validate.mjs` for the legacy 1.5.1 regression fixture, then `node test-catalog.mjs` for expanded catalog/storage migration. Browser QA is unavailable in this session. `backend/` contains the active username-only Firestore rules and owner bootstrap instructions. Authentication and authorization code is present; publish the matching rules and initialize the owner UID before inviting users. The static catalog remains public at its URL.

Management opens in an in-app dialog for approved Manager, Senior manager (Fmanage), or Owner accounts. Firestore rules enforce every management operation; the route and menu visibility are UI gates only. One-time owner setup remains a privileged Firebase Console/Admin SDK action.

## Version 1.5.13

Removed 207 Wikipedia-only titles outside the MCU and Road to Doomsday. The original 110 and 27 additional MCU titles remain. Historical positional progress is migrated to the 137-title catalog by saved index mapping; older ID-keyed backups and personal lists discard retired titles. Add Title displays save errors beside the submit button and reveals a View added title action, which opens the saved title in All Marvel. IMDb URL and working poster preview remain required; publish backend/firestore.rules in Firebase Console for new title creation.

## Version 1.5.14

Added Search sites with Direct watch, Torrents and Subs tabs. Managers can add validated domains and create custom engines from the in-app management dashboard. Search results are filtered to the configured HTTPS domains. Live results require the callable Firebase function and a server-side Brave Search API secret; see backend/README.md for deployment. The frontend reports clearly when the service is not yet active.

## Version 1.5.15

Search sites opens a Google search in a new tab with the quoted title and `site:` filters for the selected category. A fallback link remains when a browser blocks the tab. Removed the unused Brave Search function and paid-service requirement. Built-in categories work on GitHub Pages and Firebase Spark. Shared manager-added categories require publishing the Firestore search rules on Spark.

## Version 1.6

Search opens a quoted Google search with `site:` filters in a new tab. Approved managers can add validated domains and custom search categories through the in-app dashboard. The built-in categories work on Firebase Spark without a backend. Watch progress, episode counts, favorites, skipped titles, settings, and saved personal lists sync by account through the protected `userWatch/{uid}` Firestore document. Browser cookies remain a local cache and existing backup export remains available. Publish the new Firestore rules before relying on sync or shared manager categories.

## Version 1.6.1

Accepted friends can open each other’s read-only watch home from My friends. It renders the friend’s selected route or saved personal list, per-title and per-episode progress, next title, viewing totals, and live updates from the friend’s private Firestore watch document. A friend request alone does not grant access, and removing the friendship revokes reads. The regular account home remains editable only by its owner. Publish the updated Firestore rules. Search remains the free new-tab site-filtered flow; embedded search is under evaluation.

## Version 1.6.2

Owner device registration for standards-based Web Push is now included. The owner can enable it from the first-run prompt or account menu, and iPhone users need to open the Home Screen app to grant notification permission. A notification service worker opens the in-app management dashboard. Firestore rules allow only the owner to save their own device subscriptions. A scheduled GitHub Actions sender can check for pending registration requests and deliver an alert about every five minutes once its two private secrets and enable flag are configured. Follow `backend/README.md`; deploying the static site alone cannot send a background push. The search integration review and outstanding work are in `PROJECT-AUDIT.md`.

## Version 1.6.3

Approved users can opt into device alerts and manage categories in the new Notifications page. A private inbox with unread badge and read markers keeps alerts available even when device push is delayed. Accepted friends can send direct messages; members can suggest a title with an IMDb link, and managers review suggestions in Manage site. The scheduled sender observes registrations, title suggestions, new titles, app releases, direct messages, search-engine edits, access changes, friend requests and acceptance, removal requests and completed title archival. Privileged access changes notify the subject and management peers at the same or higher level, while ordinary viewers do not receive notifications about unrelated role changes. Alert preferences suppress device push but keep inbox entries. The server credential and VAPID key are still required to activate the sender; publish the updated Firestore rules. The sender is scheduled about every five minutes and is not guaranteed instantaneous.

## Version 1.6.4

The push sender accepts a raw service-account JSON GitHub secret so mobile setup does not require base64 encoding. Existing base64 secrets continue to work.

## Version 1.6.5

The push sender now reconciles all pending registrations on every run and creates one notification for each outstanding request, including requests missed by a prior scan. Existing event markers prevent repeat alerts.
