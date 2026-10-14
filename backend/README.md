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

The watchlist saves progress locally and publishes completed title counts to `friendProgress/{uid}`. Only the owner and accepted friends can read this record. Opening the watchlist updates the shared copy; there is no background cross-device sync. The friend page shows incoming requests, sent requests, accepted friends, and an earliest common unwatched movie suggestion. Existing code-based snapshots remain readable in old backups but are no longer used for new friendship requests.
