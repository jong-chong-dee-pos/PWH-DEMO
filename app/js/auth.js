/* PWH sign-in and roles.
 * Accounts: e-mail + 4-digit employee code. Two roles:
 *   admin : everything, plus Module 1 files, Module 2 layout, Module 5 types and rules, user management
 *   user  : sees every module; in Module 4 may choose Plants and save simulation scenarios
 * Storage goes through `store` only (today: this browser's IndexedDB via PWH.db meta 'users.v1').
 * A central store later needs a new `store` with the same load/save, nothing else changes.
 * The session (who is signed in, last activity) stays in this browser's localStorage.
 * NOTE: while accounts live in the browser this keeps honest people out of the wrong screens; it is not
 * protection against someone who opens the browser's developer tools. Real protection needs the central store. */
(function (g) {
  var PWH = (g.PWH = g.PWH || {});
  var KEY = 'users.v1', SKEY = 'pwh-session';
  var IDLE_MS = 8 * 60 * 60 * 1000;          // signed out after 8 hours without use
  var MAX_TRIES = 5, LOCK_MS = 60 * 1000;    // 5 wrong codes -> wait 1 minute

  var PERMS = {
    'data.edit': ['admin'],     // Module 1: upload, choose the file in use, delete, plant order
    'layout.edit': ['admin'],   // Module 2: upload / remove the warehouse layout
    'rules.edit': ['admin'],    // Module 5: storage types and rules
    'sim.edit': ['admin', 'user'], // Module 4: choose Plants, save / delete simulation scenarios
    'users.manage': ['admin']
  };

  var store = {
    load: function () { return PWH.db.getMeta(KEY).then(function (v) { return (v && v.list) || []; }); },
    save: function (list) { return PWH.db.setMeta(KEY, { list: list }); }
  };

  var A = { users: [], me: null, tries: 0, lockUntil: 0, lastSave: 0, timer: null, onOut: null };

  function now() { return Date.now(); }
  function normEmail(s) { return String(s || '').trim().toLowerCase(); }
  function okEmail(s) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s); }
  function okCode(s) { return /^\d{4}$/.test(String(s || '')); }
  function hex(buf) { return Array.prototype.map.call(new Uint8Array(buf), function (b) { return (b < 16 ? '0' : '') + b.toString(16); }).join(''); }
  function salt() {
    var a = new Uint8Array(12);
    if (g.crypto && g.crypto.getRandomValues) g.crypto.getRandomValues(a); else for (var i = 0; i < a.length; i++) a[i] = Math.floor(Math.random() * 256);
    return hex(a.buffer);
  }
  function hash(code, s) {
    var txt = 'pwh:' + s + ':' + code;
    if (g.crypto && g.crypto.subtle && g.TextEncoder) return g.crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt)).then(hex);
    var h = 2166136261; for (var i = 0; i < txt.length; i++) { h ^= txt.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }   // fallback when the browser has no Web Crypto
    return Promise.resolve('f' + h.toString(16));
  }
  function pub(u) { return u ? { id: u.id, email: u.email, name: u.name, role: u.role, active: u.active !== false, createdAt: u.createdAt, lastLogin: u.lastLogin || null } : null; }
  function find(id) { return A.users.filter(function (u) { return u.id === id; })[0] || null; }
  function byEmail(e) { e = normEmail(e); return A.users.filter(function (u) { return u.email === e; })[0] || null; }
  function activeAdmins(list) { return (list || A.users).filter(function (u) { return u.role === 'admin' && u.active !== false; }); }
  function err(code) { var e = new Error(code); e.code = code; return e; }

  // ---------- session ----------
  function readSession() { try { return JSON.parse(localStorage.getItem(SKEY) || 'null'); } catch (e) { return null; } }
  function writeSession(s) { try { if (s) localStorage.setItem(SKEY, JSON.stringify(s)); else localStorage.removeItem(SKEY); } catch (e) {} }
  function setMe(u) {
    A.me = u ? pub(u) : null;
    PWH.user = A.me;   // Module 1 writes uploadedBy from this
    document.documentElement.setAttribute('data-role', A.me ? A.me.role : 'none');
  }
  function touch() {
    if (!A.me) return;
    var t0 = now(); A.last = t0;
    if (t0 - A.lastSave > 60 * 1000) { A.lastSave = t0; writeSession({ uid: A.me.id, at: t0 }); }
  }
  function watchIdle() {
    if (A.timer) return;
    ['pointerdown', 'keydown', 'wheel'].forEach(function (ev) { document.addEventListener(ev, touch, { passive: true, capture: true }); });
    A.timer = setInterval(function () {
      if (!A.me) return;
      var s = readSession(), last = Math.max(A.last || 0, (s && s.at) || 0);
      if (!s || s.uid !== A.me.id) return signOut('other');
      if (now() - last > IDLE_MS) signOut('idle');
    }, 60 * 1000);
  }
  function signOut(why) {
    writeSession(null); setMe(null);
    if (A.onOut) A.onOut(why || 'out');
  }

  // ---------- public ----------
  /* ready() -> 'setup' (no accounts yet) | 'login' | 'in' */
  function ready() {
    return store.load().catch(function () { return []; }).then(function (list) {
      A.users = list;
      watchIdle();
      if (!list.length) { setMe(null); return 'setup'; }
      var s = readSession(), u = s && find(s.uid);
      if (u && u.active !== false && now() - (s.at || 0) <= IDLE_MS) { setMe(u); A.last = now(); A.lastSave = 0; touch(); return 'in'; }
      if (s && u && now() - (s.at || 0) > IDLE_MS) { writeSession(null); setMe(null); return 'idle'; }
      writeSession(null); setMe(null); return 'login';
    });
  }
  function validate(p, editing) {
    var email = normEmail(p.email), name = String(p.name || '').trim();
    if (!okEmail(email)) return 'email';
    if (!name) return 'name';
    if (!editing || p.code) { if (!okCode(p.code)) return 'code'; }
    var other = byEmail(email); if (other && (!editing || other.id !== editing)) return 'dup';
    if (p.role !== 'admin' && p.role !== 'user') return 'role';
    return null;
  }
  function setup(p) {
    if (A.users.length) return Promise.reject(err('exists'));
    var bad = validate(Object.assign({}, p, { role: 'admin' })); if (bad) return Promise.reject(err(bad));
    var s = salt();
    return hash(p.code, s).then(function (h) {
      var u = { id: 'u' + now().toString(36), email: normEmail(p.email), name: String(p.name).trim(), role: 'admin', active: true, salt: s, hash: h, createdAt: now(), lastLogin: now() };
      A.users = [u];
      return store.save(A.users).then(function () { setMe(u); A.lastSave = 0; touch(); return pub(u); });
    });
  }
  function login(email, code) {
    if (now() < A.lockUntil) return Promise.reject(Object.assign(err('locked'), { wait: Math.ceil((A.lockUntil - now()) / 1000) }));
    var fail = function () {
      A.tries++;
      if (A.tries >= MAX_TRIES) { A.tries = 0; A.lockUntil = now() + LOCK_MS; return Promise.reject(Object.assign(err('locked'), { wait: LOCK_MS / 1000 })); }
      return Promise.reject(Object.assign(err('wrong'), { left: MAX_TRIES - A.tries }));
    };
    return store.load().catch(function () { return A.users; }).then(function (list) {
      A.users = list;
      var u = byEmail(email);
      if (!u || !okCode(code)) return hash(String(code || ''), 'x').then(fail);   // same work either way
      return hash(code, u.salt).then(function (h) {
        if (h !== u.hash) return fail();
        if (u.active === false) return Promise.reject(err('disabled'));
        A.tries = 0; u.lastLogin = now();
        return store.save(A.users).then(function () { setMe(u); A.lastSave = 0; touch(); return pub(u); });
      });
    });
  }
  function can(perm) { return !!(A.me && PERMS[perm] && PERMS[perm].indexOf(A.me.role) >= 0); }
  function list() { return A.users.map(pub); }

  function requireAdmin() { if (!can('users.manage')) throw err('denied'); }
  function addUser(p) {
    try { requireAdmin(); } catch (e) { return Promise.reject(e); }
    var bad = validate(p); if (bad) return Promise.reject(err(bad));
    var s = salt();
    return hash(p.code, s).then(function (h) {
      var u = { id: 'u' + now().toString(36) + Math.floor(Math.random() * 1e4).toString(36), email: normEmail(p.email), name: String(p.name).trim(), role: p.role, active: true, salt: s, hash: h, createdAt: now(), createdBy: A.me.id };
      var next = A.users.concat([u]);
      return store.save(next).then(function () { A.users = next; return pub(u); });
    });
  }
  /* p: {email, name, role, active, code?}; code '' keeps the old one */
  function updateUser(id, p) {
    try { requireAdmin(); } catch (e) { return Promise.reject(e); }
    var u = find(id); if (!u) return Promise.reject(err('missing'));
    var bad = validate(Object.assign({ role: u.role }, p), id); if (bad) return Promise.reject(err(bad));
    var role = p.role || u.role, active = p.active == null ? u.active !== false : !!p.active;
    if (id === A.me.id && (role !== 'admin' || !active)) return Promise.reject(err('self'));
    var trial = A.users.map(function (x) { return x.id === id ? Object.assign({}, x, { role: role, active: active }) : x; });
    if (!activeAdmins(trial).length) return Promise.reject(err('lastadmin'));
    var done = p.code ? (function () { var s = salt(); return hash(p.code, s).then(function (h) { return { salt: s, hash: h }; }); })() : Promise.resolve({});
    return done.then(function (sec) {
      var next = A.users.map(function (x) { return x.id === id ? Object.assign({}, x, { email: normEmail(p.email), name: String(p.name).trim(), role: role, active: active, updatedAt: now() }, sec) : x; });
      return store.save(next).then(function () { A.users = next; if (id === A.me.id) setMe(find(id)); return pub(find(id)); });
    });
  }
  function removeUser(id) {
    try { requireAdmin(); } catch (e) { return Promise.reject(e); }
    if (id === A.me.id) return Promise.reject(err('self'));
    var next = A.users.filter(function (x) { return x.id !== id; });
    if (!activeAdmins(next).length) return Promise.reject(err('lastadmin'));
    return store.save(next).then(function () { A.users = next; });
  }

  PWH.auth = {
    ready: ready, setup: setup, login: login, logout: function () { signOut('out'); }, can: can, me: function () { return A.me; },
    list: list, addUser: addUser, updateUser: updateUser, removeUser: removeUser, okEmail: okEmail, okCode: okCode,
    onSignedOut: function (fn) { A.onOut = fn; }, PERMS: PERMS, IDLE_MS: IDLE_MS,
    useStore: function (s) { store = s; }   // swap in a central store later
  };
})(window);
