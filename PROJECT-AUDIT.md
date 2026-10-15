# Marvel List request audit — 2026-10-15

This is a code and rules audit of version 1.6.2, not a claim that the user's live Firebase project has been inspected.

| Request | Status | Evidence / next step |
|---|---|---|
| English UI, poster links, original phase sections, Next to watch, skip, undo, countdown, settings, personal lists, version, PWA identity | Implemented | Static app and manifest. Several catalog durations remain unknown. |
| All MCU and All Marvel collections, and removal of unrelated historical additions | Implemented in static data | 137 current titles; the 207 unrelated Wikipedia additions were removed. The catalog is public and does not auto-import future Sheets edits. |
| Username login, roles, owner approval, title management | Implemented in code | Requires the matching published Firestore rules and owner bootstrap. Live approvals have not been verified from this workspace. |
| Cross-device watch progress and saved lists | Implemented in code, live status unverified | `userWatch/{uid}` sync. Existing device should sync first; unfinished swipe-list draft is local. Concurrent writes to the same field may overwrite one another. |
| In-site friendship requests and friend watch home | Implemented in code, live status unverified | Accepted friends can see a read-only home with route, title and episode progress. The friend home has its own view rather than every control of the owner's home. Publish the current rules. |
| Search by category with manager-added domains | Partial | Categories and manager edits exist; results currently open a Google tab with site filters. Embedded results require a configured provider. FreeFind's example indexes its account's selected sites; it is not a reusable iframe for arbitrary domains. Google Programmable Search Element is a free ad-supported candidate, but requires a separately created search engine and its `cx` ID. Manager-added domains must also be included in that engine's scope or the provider will omit them. |
| Owner registration Push on browser and iPhone PWA | Prepared, activation pending | Service worker, opt-in, protected subscriptions and scheduled sender are implemented. Publish Firestore rules, set GitHub Actions secrets and enable variable, then subscribe on the device. iOS requires a Home Screen PWA and a tap before the system permission prompt. Schedule may run later than its five-minute target. |
| Source-sheet updates, all missing runtimes and watch URLs | Outstanding content work | No live Sheets import. Current catalog has 33 unknown runtimes, including unreleased titles; some watch links are IMDb fallbacks. Owner said they will supply updates later. |
| End-to-end iPhone QA and live Firestore verification | Outstanding | The emulator authorization suite passes; real device permissions, APNs delivery, actual published rules and domain have not been exercised here. |
| Password recovery for username accounts | Outstanding | Internal `.invalid` email aliases cannot receive reset email; operator-assisted recovery is required. |

The repo stores no Firebase user passwords or private push key. The static `data.json` remains public on GitHub Pages despite the sign-in overlay. Sensitive future catalog data must be moved server-side if private access is required.
