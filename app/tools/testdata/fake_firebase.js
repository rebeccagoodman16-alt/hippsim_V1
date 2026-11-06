/* Test double for the Firebase compat SDK (auth + Firestore subset hippsim uses), stored in localStorage. tools/test_accounts.py */
(function () {
  const K = 'fakefs:', listeners = [], snaps = [];
  const read = p => { const v = localStorage.getItem(K + p); return v == null ? undefined : JSON.parse(v); };
  const notify = () => snaps.forEach(f => f());
  const docRef = path => ({
    id: path.split('/').pop(), path,
    async get() { const v = read(path); return {id: path.split('/').pop(), exists: v !== undefined, data: () => v}; },
    async set(v, o) { const old = (o && o.merge && read(path)) || {}; localStorage.setItem(K + path, JSON.stringify(Object.assign({}, old, v))); notify(); },
    async delete() { localStorage.removeItem(K + path); notify(); },
    collection: name => colRef(path + '/' + name)
  });
  const colRef = path => ({
    doc: id => docRef(path + '/' + id),
    onSnapshot(cb) {
      const f = () => { const depth = path.split('/').length + 1;
        const docs = Object.keys(localStorage).filter(k => k.startsWith(K + path + '/') && k.slice(K.length).split('/').length === depth)
          .map(k => ({id: k.split('/').pop(), data: () => JSON.parse(localStorage.getItem(k))}));
        cb({docs}); };
      snaps.push(f); setTimeout(f, 0); return () => {};
    }
  });
  const auth = {
    currentUser: JSON.parse(localStorage.getItem('fakeuser') || 'null'),
    onAuthStateChanged(cb) { listeners.push(cb); setTimeout(() => cb(auth.currentUser), 0); return () => listeners.splice(listeners.indexOf(cb), 1); },
    async signInWithPopup() { auth.currentUser = {uid: 'g_123', displayName: 'Rebecca Test', email: 'rt@example.edu'}; localStorage.setItem('fakeuser', JSON.stringify(auth.currentUser)); listeners.forEach(f => f(auth.currentUser)); return {user: auth.currentUser}; },
    async signOut() { auth.currentUser = null; localStorage.removeItem('fakeuser'); listeners.forEach(f => f(null)); }
  };
  window.firebase = {initializeApp: () => ({auth: () => auth, firestore: () => ({doc: docRef, collection: colRef})}), auth: {GoogleAuthProvider: function () {}}};
})();
