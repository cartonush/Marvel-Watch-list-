# Account access: prepared, NOT activated

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

1. Owner supplies the Firebase project and confirms the owner email. Enable email/password Auth and Firestore with production rules. Register the actual GitHub Pages/custom domain in Auth's authorized domains.
2. Enable a strong password policy and email-enumeration protection. Set email verification and password recovery templates. Configure quotas/abuse monitoring; consider App Check before exposing registration publicly.
3. Install Firebase Admin SDK only in the local operator environment. Use Application Default Credentials. Run `MARVEL_FIREBASE_PROJECT=... MARVEL_OWNER_EMAIL=... node bootstrap-owner.mjs` after the owner has registered and verified email. Do not paste service-account credentials into chat or commit them.
4. Run the Firestore emulator authorization tests in `rules.test.mjs`, then deploy `firestore.rules`. Rules are not yet deployed or emulator-verified in this workspace.
5. Implement the Firebase SDK registration/login/pending-approval and admin UI. Hook reads/writes to Firestore, implement live access revocation, and verify pending/disabled users cannot access protected data by direct API calls. Keep personal watch progress local unless the owner separately requests cloud sync.
6. Import catalog metadata to Firestore with stable IDs. Public film metadata is currently in `dist/data.json` and historical Git commits. A login overlay cannot make already public metadata secret. If title lists/watch links must become private, migrate them to protected storage and stop distributing those values in static files; previous public commits remain recoverable.
7. Test anonymous/pending/viewer/Manage/Fmanage/Owner accounts, verification, revocation, recovery, role escalation, owner immutability and atomic archival before turning on the login requirement.

There is no Firebase project or confirmed owner identity configured, so no login requirement is enabled. No claim of active account security is made until the backend and browser integration are deployed and tested.

References: https://firebase.google.com/docs/firestore/security/rules-conditions · https://firebase.google.com/docs/auth/web/manage-users · https://firebase.google.com/docs/firestore/security/test-rules-emulator
