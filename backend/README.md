# Account access: Firebase project configured, NOT activated

The current public GitHub Pages website remains a browser-local tracker. These rules and the owner bootstrap are a backend foundation, not an active login system. No users, passwords, private keys, service account files, or allowlists belong in the repository.

## Permission contract

| Role | Read protected catalog | Add titles | Edit existing titles | Basic shared settings | Approve/disable regular users | Grant roles | Approve title archival |
|---|---|---|---|---|---|---|---|
| Pending / disabled | No | No | No | No | No | No | No |
| Approved viewer | Yes | No | No | No | No | No | No |
| Manage | Yes | Yes | No | Yes | No | No | No |
| Fmanage | Yes | Yes | Yes | Yes | Yes | No | Request only |
| Owner | Yes | Yes | Yes | Yes | Yes | Yes | Yes |

Approved accounts also require verified email and `view: true`. Registration creates an own `users/{uid}` record with `status: pending` and all flags false. A regular manager cannot edit existing titles; this uses the narrowest interpretation of the owner's instructions pending clarification. Fmanage cannot modify themselves, another manager or the owner. Only the owner may grant roles. The owner UID lives in a protected server record and can only be bootstrapped once with privileged credentials.

Passwords are managed by Firebase Authentication. User documents contain email, view, manage, Fmanage, status and timestamps, never passwords or password hashes. Archival replaces hard deletion so a mistaken removal is recoverable. Fmanage submits a deletion request; owner approval and title archival should be one Firestore transaction. Hard deletion and user document deletion are denied to all browser clients.

## Required before activation

1. The owner supplied project `marvel-list-database` and confirmed `roisuissa6@gmail.com`. Enable email/password Auth and Firestore with production rules. Add the actual GitHub Pages/custom domain to Auth's authorized domains.
2. Enable a strong password policy and email-enumeration protection. Set email verification and password recovery templates. Configure quotas/abuse monitoring; consider App Check before exposing registration publicly.
3. Install Firebase Admin SDK only in the local operator environment. Use Application Default Credentials. Run `MARVEL_FIREBASE_PROJECT=... MARVEL_OWNER_EMAIL=... node bootstrap-owner.mjs` after the owner has registered and verified email. Do not paste service-account credentials into chat or commit them.
4. In `backend/`, install dependencies with `npm install`; the authorization suite passed 8/8 checks using `npx firebase emulators:exec --only firestore 'npm run test:rules' --project demo-marvel-access` on 13 October 2026. Deploy `firestore.rules` to the real project before enabling the client. Rules are not yet deployed.
5. The public Web App configuration is in `dist/firebase-config.js`. Once rules are deployed, set `firebaseEnabled` to `true` and publish the site. The login/pending-approval/admin UI and live revocation are intentionally dormant until this step. Personal watch progress stays local.
6. With private Application Default Credentials on the operator's computer, run `MARVEL_FIREBASE_PROJECT=... node seed-catalog.mjs` from `backend/` to import all existing titles without replacing edits. The existing `dist/data.json` and old Git commits are public. A login overlay cannot make their contents private; protect any new truly private data in Firestore only.
7. Test actual accounts in the real project: registration, email verification, viewer approval and revocation, Manage/Fmanage/Owner actions, password recovery, and the GitHub Pages/custom domain before inviting friends.

The project identity is configured but no login requirement is enabled. Deploy rules first, then enable the login UI so the owner can register and verify their email; bootstrap the owner before inviting anyone else. Never commit credentials, password hashes, service-account JSON, or private keys.

References: https://firebase.google.com/docs/firestore/security/rules-conditions · https://firebase.google.com/docs/auth/web/manage-users · https://firebase.google.com/docs/firestore/security/test-rules-emulator
