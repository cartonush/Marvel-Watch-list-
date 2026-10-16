# Username sign-in and access control

The public GitHub Pages site uses Firebase Authentication's email/password provider internally. Visitors enter a username and password only. The client maps a lowercase username to a reserved, undeliverable address such as `alex@users.marvel-list.invalid`; it never requests a real email. Firebase stores passwords. User documents contain username, the internal alias, access flags and timestamps, never passwords. Firebase's email/password provider must remain enabled.

Usernames are 3–24 characters, start with a letter and contain only ASCII letters, digits and underscores. They are case insensitive. Firebase Auth enforces unique internal aliases. Without a real email, self-service email verification and password recovery are unavailable; an operator with Firebase Admin access must handle account recovery. Never publish Admin credentials or service-account JSON in the repo.

## Permissions

| Role | Read protected catalog | Add titles | Edit existing titles | Basic shared settings | Approve/disable regular users | Grant roles | Approve title archival |
|---|---|---|---|---|---|---|---|
| Pending / disabled | No | No | No | No | No | No | No |
| Approved viewer | Yes | No | No | No | No | No | No |
| Manage | Yes | Yes | No | Yes | No | No | No |
| Fmanage | Yes | Yes | Yes | Yes | Yes | No | Request only |
| Owner | Yes | Yes | Yes | Yes | Yes | Yes | Yes |

Registrants create their own pending profile with flags false. The username never grants roles. Only the protected `system/owner` document ties a specific Firebase Auth UID to owner access. Full managers may approve viewers, but cannot grant roles or approve themselves. Only the owner may grant roles or approve archival. Browser clients cannot replace the owner, hard delete a title or delete a user profile.

## Deploy and initialize

1. In Firebase Console → Firestore Database → Rules, paste `backend/firestore.rules` and click **Publish**. The site needs these rules before new username registrations work. Enable Email/Password in Authentication → Sign-in method, and authorize the live domain in Authentication → Settings.
2. Register your own username on the site. Copy the **Account ID** (Firebase Auth UID) shown on the pending screen. No one else should approve this profile; owner bootstrap is a privileged one-time setup.
3. In a private operator environment with Application Default Credentials, run `MARVEL_FIREBASE_PROJECT=marvel-list-database MARVEL_OWNER_UID=<copied UID> node backend/bootstrap-owner.mjs`. It refuses to replace an existing owner. Alternatively use the Firebase Console/Admin SDK to create `system/owner` with `{uid: <copied UID>}` and set that exact `users/<UID>` profile to `username: <your normalized username>, email: <username>@users.marvel-list.invalid, status: approved, view: true, manage: true, Fmanage: true`, preserving valid timestamps. The script is safer because it checks the UID and alias. Do not give owner access solely because a username matches a chosen name.
4. The owner account opens without approval by another user. To add friends, they register usernames, then the owner approves them in Manage site.
5. Run authorization tests locally from `backend/`: `npm install` and `npx firebase emulators:exec --only firestore --project demo-marvel-access 'npm run test:rules'`.

The old real-email login account does not automatically migrate to username authentication. If one exists, sign out and register a username, then bootstrap that new UID. A public static `data.json` and Git history remain publicly retrievable even behind the login overlay. Store truly private future data in protected Firestore collections.

## Version 1.5.12 posters

Publish `backend/firestore.rules` again after deploying the site. New catalog titles may include an IMDb URL and a validated poster reference (`imdb:tt...` or a direct image URL from `m.media-amazon.com/images/`). Existing titles remain compatible. The client previews the poster before saving. Automatic suggestions use the external MetaHub image CDN and may not match a preferred IMDb poster, so managers can supply a direct IMDb-hosted poster image URL instead.

## Version 1.5.15 site search

The Search sites page has three initial categories: Direct watch (f-movies.org, cinehype.sc), Torrents (yts.gg, ext.to), and Subs (yifysubtitles.ch). Searches open a new Google tab with a quoted title and a `site:` filter for each configured domain. Search results appear in Google, with a fallback link on the page if the tab is blocked. No search backend, Brave key, paid Firebase plan or Cloud Functions deployment is required.

Managers can add domains or create custom categories from Manage site → Search engines. These shared changes require publishing `backend/firestore.rules` in Firebase Console → Firestore Database → Rules, which is possible on the Spark plan. Built-in categories work before the new rules are published. Firestore stores only category names, validated domains, author IDs and timestamps. Configuration is limited to ten domains per category; managers can add but not remove domains or categories. Search terms and result pages are not saved in the watchlist.

## Version 1.5.2 friendships

Publish the updated `backend/firestore.rules` from this version before sending requests. Approved users get a username handle under `handles/{username}` when they open the updated site. A sender searches that exact handle, then creates a pending `friendships/{pair}` record. Only the other participant can accept it. Either participant can remove a request or friendship. There is no friend count limit.

The watchlist saves a local cache, publishes completed title counts to `friendProgress/{uid}`, and syncs private watch state through `userWatch/{uid}`. Only the owner and accepted friends can read the friend summary; only the same approved account can read its full watch state. The friend page shows incoming requests, sent requests, accepted friends, and an earliest common unwatched movie suggestion. Existing code-based snapshots remain readable in old backups but are no longer used for new friendship requests.

## Version 1.6 account sync

On Firebase Spark, open Firebase Console → Firestore Database → Rules, replace the editor contents with the complete `backend/firestore.rules` from this version, then click **Publish**. No billing upgrade or Cloud Functions setup is needed. This adds account-scoped `userWatch/{uid}` reads and writes and shared `searchEngines` configuration. Keep all existing rules from the file together. Sign in on the updated website on your original phone first, wait for “Synced across your devices,” and then open the second device under the same username. If the status reports a rules error, publish the rules and reload the site. Saved lists and preferences sync; an unfinished swipe-list draft stays local. An export backup is still recommended.

## Version 1.6.1 friend watch home

Publish `backend/firestore.rules` again after updating the website. An approved friendship now grants read-only `get` access to the other person’s `userWatch/{uid}` document. Pending, removed, and unrelated accounts remain blocked; only the account owner may write. The friend home shows last-synced watch state and updates while open. It never mutates the visitor’s own account data.

## Version 1.6.2 registration Web Push

The frontend uses the standard Push API, not Firebase Messaging. It works with iOS 16.4+ Home Screen apps and supported desktop browsers. On iPhone, use Share → Add to Home Screen and launch from that icon. The site shows a short opt-in card; the system permission prompt follows the user's tap. A Safari tab on iPhone cannot use this flow. The service worker does not cache the site's content.

1. Publish the complete `backend/firestore.rules` in Firebase Console → Firestore Database → Rules. `pushSubscriptions/{uid}/devices/{deviceId}` is private to each approved account. The new inbox, messages, title suggestions and preferences also require these rules.
2. In the GitHub repository's Settings → Secrets and variables → Actions, create secrets `MARVEL_VAPID_PRIVATE_KEY` and `MARVEL_FIREBASE_SERVICE_ACCOUNT_JSON`. The first is the private half of the public key in `push-config.js`. Paste the **entire JSON contents** of a service-account key for project `marvel-list-database` as the second secret, including its braces; no base64 conversion is needed. The older `MARVEL_FIREBASE_SERVICE_ACCOUNT_B64` secret is still accepted as a fallback. Keep the JSON and private key out of git and chat. Give the service account only the Firestore permissions required to read owner, users and subscriptions and write delivery markers / remove stale subscriptions. Never use the Firebase client `apiKey` as a server credential.
3. Under Actions **Variables**, create `MARVEL_PUSH_ENABLED` with value `true`. The workflow `registration-push.yml` runs at minutes 3, 8, 13 and so on, plus manual runs. GitHub may delay or drop scheduled runs, and a public repository's schedule can be disabled after 60 days without activity.
4. Sign in on the installed app or a desktop browser and tap **Enable notifications**. Confirm the device appears under `pushSubscriptions/<account UID>/devices` in Firestore. Run the workflow manually once from the Actions tab and inspect its logs. The first run scans recent events and announces the current app version; subsequent runs use a persisted cursor. Open Notifications to see the inbox and device-alert preferences.

The browser only registers a device. Sending runs in GitHub Actions with a private server credential; a static GitHub Pages page cannot send background push securely. Avoid sharing the service-account JSON or VAPID private key in a public issue or in the repository. If either is exposed, rotate it and update both ends. In the free Spark plan this does not require Cloud Functions, but GitHub Actions and Firestore usage are subject to their own limits. Each subscribed device receives alerts for its account. Push delivery is best-effort; the inbox and management dashboard remain the source of truth. The sender runs at most once per schedule interval, not as an instant Firestore trigger.

## Version 1.6.3 event coverage

| Event | Recipient | Opens |
|---|---|---|
| Pending registration | Owner and senior managers | Manage users |
| Title suggestion | Managers and above, excluding requester | Title suggestions |
| Suggestion reviewed | Requester | Notifications |
| New title | All approved accounts | Collection |
| App release | All approved accounts | Home |
| Direct message | Recipient only | Friend conversation |
| Search-engine change | All approved accounts | Search |
| Access changed | Subject, plus management at the subject's new or prior level and above; no unrelated viewers | Management / Notifications |
| Removal requested | Owner and senior managers, excluding requester | Removal requests |
| Title archived | All approved accounts | Notifications |
| Removal rejected | Requester, owner and senior managers | Notifications |
| Friend requested / accepted | Recipient / both participants | Friends |

The browser cannot create inbox entries or event markers. It can create a friend message only for an accepted friendship and a title suggestion only under its own identity. Preferences can suppress device alerts per category; they do not hide inbox entries. The sender queries changes since its last successful run, writes one event ID per change and a recipient-scoped inbox entry, and uses a short push payload for private messages without message contents. A late scheduled run may delay alerts. Existing old deletion requests without `updatedAt` cannot generate retroactive alerts; new requests include it.

## Version 1.6.4

The push sender accepts a raw service-account JSON GitHub secret so mobile setup does not require base64 encoding. Existing base64 secrets continue to work.
