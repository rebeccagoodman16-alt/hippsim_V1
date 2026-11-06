/* hippsim storage + Google sign-in on a self-hosted copy (GitHub Pages or any HTTPS host). Off unless hs-app-config.js sets
     window.HS_APP = {..., backend: 'firebase', firebase: {apiKey, authDomain, projectId, appId}, allowedDomains: ['example.edu']}
   It provides window.HS_BACKEND.use(name) with the same three capabilities the claude.ai build gets from window.claude.use:
     'db'        Firestore (runs/<uid>, runs/<uid>/items/<runId>, .../figs/<n>; see docs/ACCOUNTS.md for the security rules)
     'user'      {id(), profiles(ids)}: the signed-in Google account; id() asks the person to sign in when needed
     'downloads' {save({filename, data})}: an ordinary browser download
   plus signIn(), signOut(), current() and onChange(fn) for the header's account button (hs-app.js).
   Reading pages and simulating never needs an account; saving runs does. */
(function () {
  'use strict';
  const C = window.HS_APP || {};
  if (C.backend !== 'firebase' || !C.firebase) return;
  const V = '10.12.2', base = `https://cdn.jsdelivr.net/npm/firebase@${V}/`;
  const load = src => new Promise((ok, bad) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = bad; document.head.appendChild(s); });
  const ready = load(base + 'firebase-app-compat.js')
    .then(() => Promise.all([load(base + 'firebase-auth-compat.js'), load(base + 'firebase-firestore-compat.js')]))
    .then(() => {
      const app = firebase.initializeApp(C.firebase);
      const auth = app.auth(), db = app.firestore();
      return new Promise(ok => { const off = auth.onAuthStateChanged(() => { off(); ok({auth, db}); }); });
    });
  const listeners = new Set();
  const allowed = u => !C.allowedDomains || !C.allowedDomains.length || C.allowedDomains.some(d => (u.email || '').toLowerCase().endsWith('@' + d.toLowerCase()));

  async function signIn() {
    const {auth} = await ready, p = new firebase.auth.GoogleAuthProvider();
    try { await auth.signInWithPopup(p); } catch (e) { if (/popup/i.test(e.code || '')) return auth.signInWithRedirect(p); throw e; }
    const u = auth.currentUser;
    if (u && !allowed(u)) { await auth.signOut(); throw Object.assign(new Error('This account is not in the lab’s allowed domains.'), {code: 'not_allowed'}); }
    if (u) await (await ready).db.doc('people/' + u.uid).set({name: u.displayName || u.email, updated: new Date().toISOString()}, {merge: true});
    return u;
  }
  async function current() { const {auth} = await ready; return auth.currentUser; }
  ready.then(({auth}) => auth.onAuthStateChanged(u => listeners.forEach(f => { try { f(u); } catch (e) {} })))
    .catch(() => console.warn('hippsim: Google sign-in could not load; saving runs is unavailable.'));

  const user = {
    async id() { let u = await current(); if (!u) u = await signIn(); if (!u) throw new Error('not signed in'); return u.uid; },
    async profiles(ids) {
      const {db} = await ready, out = {};
      await Promise.all(ids.map(async id => { try { const s = await db.doc('people/' + id).get(); if (s.exists) out[id] = {name: s.data().name}; } catch (e) {} }));
      return out;
    }
  };
  const downloads = {
    async save({filename, data}) {
      const blob = data instanceof Blob ? data : new Blob([data]);
      const a = Object.assign(document.createElement('a'), {href: URL.createObjectURL(blob), download: filename});
      document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      return {status: 'saved'};
    }
  };
  window.HS_BACKEND = {
    async use(name) {
      if (name === 'downloads') return downloads;
      const {db} = await ready;
      if (name === 'db') return db;
      if (name === 'user') return user;
      return null;
    },
    signIn, current, signOut: async () => (await ready).auth.signOut(),
    onChange(f) { listeners.add(f); current().then(f, () => {}); return () => listeners.delete(f); }
  };
})();
