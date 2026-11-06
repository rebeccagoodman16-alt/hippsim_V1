# Opening hippsim to Google accounts

Today hippsim runs as a claude.ai artifact: runs are stored with each viewer's claude.ai account, and only
people the artifact is shared with can open it. To let anyone with a Google account use it, host the app
yourself and switch storage to Firebase. The app already supports this (`site/hs-backend-firebase.js`); no
code changes are needed.

**What people get:** anyone can open pages and simulate without an account. Saving runs asks them to sign in
with Google; each person's runs are stored under their account. This is the model FlyWire Codex uses
(open reading, Google sign-in for anything that writes).

## Steps

1. **Host the app.** Create the GitHub repository, push, and turn on Pages (Settings → Pages → Source: GitHub
   Actions). `.github/workflows/pages.yml` builds `app/` and serves it at `https://<user>.github.io/hippsim/`.
2. **Create a Firebase project** (console.firebase.google.com, free Spark plan is enough for a lab):
   - Authentication → Sign-in method → enable **Google**.
   - Authentication → Settings → Authorized domains → add `<user>.github.io`.
   - Firestore Database → create (production mode), then paste the rules below.
   - Project settings → Your apps → add a Web app; copy its config.
3. **Configure the app.** In `tools/build_app.py`, the line that writes `hs-app-config.js` becomes:
   ```js
   window.HS_APP = {sw: true, version: "…", backend: "firebase",
     firebase: {apiKey: "…", authDomain: "<project>.firebaseapp.com", projectId: "<project>", appId: "…"},
     allowedDomains: []};          // e.g. ["university.edu"] to limit saving to lab accounts; [] = any Google account
   ```
   The Firebase web config is not a secret; access is enforced by the rules.
4. Rebuild (`python tools/build_app.py`), push, and test: sign in, save a run, open it from Runs, delete it.

## Firestore rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    // one log per person: entries + folders
    match /runs/{uid} {
      allow read: if request.auth != null;                      // signed-in users see the shared run list
      allow write: if request.auth != null && request.auth.uid == uid;
      match /items/{run} {
        allow read: if request.auth != null;
        allow write: if request.auth != null && request.auth.uid == uid;
        match /figs/{n} {
          allow read: if request.auth != null;
          allow write: if request.auth != null && request.auth.uid == uid;
        }
      }
    }
    // display names shown next to shared runs
    match /people/{uid} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

To keep runs private to each person, change the three `allow read` lines under `runs` to
`request.auth != null && request.auth.uid == uid`.

## Before opening it widely

- **Moving existing runs:** runs saved in the claude.ai version stay there. Download them from Runs (zip), then
  use "Open a run file…" in the hosted app and save them again.
- **Privacy notice:** state on the About page what is stored (display name, email domain check, saved runs) and
  how to delete it (Runs → ⋯ → Delete).
- **Quotas:** the free plan allows 1 GiB stored and 50,000 reads a day; a saved run with its plots is at
  most about 1.5 MB (plots are stored at up to 180 kB each).
- **License:** choose one before inviting people outside the lab (code: MIT or BSD-3 are common; each
  reconstruction keeps its archive's terms).
