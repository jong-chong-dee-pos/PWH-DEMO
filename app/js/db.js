/* PWH data layer.
 * One interface (PWH.db) so the UI never touches storage directly.
 * Today: IndexedDB in the browser (falls back to memory if blocked).
 * Later (Step 8): a Firebase adapter with the same methods can replace `adapter`.
 *
 * Stores
 *   files  : id -> file meta (name, type, planDate/month, uploadedAt, rows, validation ...)
 *   chunks : "<id>:<00000>" -> array of compact rows (arrays, not objects)
 *   blobs  : id -> original xlsx ArrayBuffer
 *   meta   : key -> any (settings, cached cross-check results)
 */
(function (g) {
  var PWH = (g.PWH = g.PWH || {});
  var STORES = ['files', 'chunks', 'blobs', 'meta'];
  var CHUNK = 5000;

  function idbAdapter() {
    var dbp = null;
    function open() {
      if (dbp) return dbp;
      dbp = new Promise(function (res, rej) {
        var r = indexedDB.open('pwh-data', 1);
        r.onupgradeneeded = function () {
          STORES.forEach(function (s) { r.result.createObjectStore(s); });
        };
        r.onsuccess = function () { res(r.result); };
        r.onerror = function () { rej(r.error); };
        r.onblocked = function () { rej(new Error('IndexedDB blocked')); };
      });
      return dbp;
    }
    function run(stores, mode, fn) {
      return open().then(function (db) {
        return new Promise(function (res, rej) {
          var t = db.transaction(stores, mode);
          var out = fn(t);
          t.oncomplete = function () {
            if (out && typeof out === 'object' && 'result' in out && out.readyState) res(out.result);
            else res(out);
          };
          t.onerror = function () { rej(t.error); };
          t.onabort = function () { rej(t.error || new Error('aborted')); };
        });
      });
    }
    return {
      get: function (s, k) { return run([s], 'readonly', function (t) { return t.objectStore(s).get(k); }); },
      put: function (s, k, v) { return run([s], 'readwrite', function (t) { t.objectStore(s).put(v, k); }); },
      putMany: function (ops) {
        var names = Array.from(new Set(ops.map(function (o) { return o.s; })));
        return run(names, 'readwrite', function (t) { ops.forEach(function (o) { t.objectStore(o.s).put(o.v, o.k); }); });
      },
      del: function (s, k) { return run([s], 'readwrite', function (t) { t.objectStore(s).delete(k); }); },
      delPrefix: function (s, prefix) {
        return run([s], 'readwrite', function (t) { t.objectStore(s).delete(IDBKeyRange.bound(prefix, prefix + '￿')); });
      },
      all: function (s) { return run([s], 'readonly', function (t) { return t.objectStore(s).getAll(); }); },
      prefix: function (s, prefix) {
        return run([s], 'readonly', function (t) { return t.objectStore(s).getAll(IDBKeyRange.bound(prefix, prefix + '￿')); });
      },
      entries: function (s) {   // [[key, value], ...] in key order (for backups)
        return open().then(function (db) {
          return new Promise(function (res, rej) {
            var out = [], t = db.transaction([s], 'readonly'), c = t.objectStore(s).openCursor();
            c.onsuccess = function () { var cur = c.result; if (cur) { out.push([cur.key, cur.value]); cur.continue(); } };
            t.oncomplete = function () { res(out); };
            t.onerror = function () { rej(t.error); };
          });
        });
      },
      clear: function (s) { return run([s], 'readwrite', function (t) { t.objectStore(s).clear(); }); }
    };
  }

  function memAdapter() {
    var m = {}; STORES.forEach(function (s) { m[s] = new Map(); });
    function sorted(s, f) {
      var keys = Array.from(m[s].keys()).filter(f).sort();
      return keys.map(function (k) { return m[s].get(k); });
    }
    return {
      get: function (s, k) { return Promise.resolve(m[s].get(k)); },
      put: function (s, k, v) { m[s].set(k, v); return Promise.resolve(); },
      putMany: function (ops) { ops.forEach(function (o) { m[o.s].set(o.k, o.v); }); return Promise.resolve(); },
      del: function (s, k) { m[s].delete(k); return Promise.resolve(); },
      delPrefix: function (s, p) { Array.from(m[s].keys()).forEach(function (k) { if (k.indexOf(p) === 0) m[s].delete(k); }); return Promise.resolve(); },
      all: function (s) { return Promise.resolve(sorted(s, function () { return true; })); },
      prefix: function (s, p) { return Promise.resolve(sorted(s, function (k) { return k.indexOf(p) === 0; })); },
      entries: function (s) { return Promise.resolve(Array.from(m[s].keys()).sort().map(function (k) { return [k, m[s].get(k)]; })); },
      clear: function (s) { m[s].clear(); return Promise.resolve(); }
    };
  }

  var adapter = null;
  var persistent = true;
  function A() {
    if (adapter) return adapter;
    try {
      if (typeof indexedDB === 'undefined') throw new Error('no idb');
      adapter = idbAdapter();
    } catch (e) { adapter = memAdapter(); persistent = false; }
    return adapter;
  }
  // If IndexedDB fails at first use, switch to memory once.
  function guard(fn) {
    return function () {
      var args = arguments;
      return fn.apply(null, args).catch(function (e) {
        if (persistent) { adapter = memAdapter(); persistent = false; return fn.apply(null, args); }
        throw e;
      });
    };
  }

  function pad(n) { return ('00000' + n).slice(-5); }
  function newId() { return 'f_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  PWH.db = {
    newId: newId,
    isPersistent: function () { return persistent; },
    listFiles: guard(function () { return A().all('files'); }),
    saveFile: guard(function (meta, rows, buffer) {
      var ops = [{ s: 'files', k: meta.id, v: meta }];
      if (buffer) ops.push({ s: 'blobs', k: meta.id, v: buffer });
      for (var i = 0, n = 0; i < rows.length; i += CHUNK, n++) {
        ops.push({ s: 'chunks', k: meta.id + ':' + pad(n), v: rows.slice(i, i + CHUNK) });
      }
      return A().putMany(ops);
    }),
    // merge a few fields into an existing file record (e.g. activatedAt when an older version is made the one in use)
    updateFile: guard(function (id, patch) {
      return A().get('files', id).then(function (m) {
        if (!m) return null;
        Object.keys(patch).forEach(function (k) { m[k] = patch[k]; });
        return A().put('files', id, m).then(function () { return m; });
      });
    }),
    deleteFile: guard(function (id) {
      return A().del('files', id)
        .then(function () { return A().del('blobs', id); })
        .then(function () { return A().delPrefix('chunks', id + ':'); });
    }),
    getRows: guard(function (id) {
      return A().prefix('chunks', id + ':').then(function (parts) {
        var out = [];
        parts.forEach(function (p) { for (var i = 0; i < p.length; i++) out.push(p[i]); });
        return out;
      });
    }),
    getBuffer: guard(function (id) { return A().get('blobs', id); }),
    getMeta: guard(function (k) { return A().get('meta', k); }),
    setMeta: guard(function (k, v) { return A().put('meta', k, v); }),
    STORES: STORES,
    // every store as {store: [[key, value], ...]} (backups)
    dumpAll: guard(function () {
      var out = {};
      return STORES.reduce(function (p, s) { return p.then(function () { return A().entries(s).then(function (e) { out[s] = e; }); }); }, Promise.resolve()).then(function () { return out; });
    }),
    // replace everything with a dump (restore); written in batches so a large backup does not need one huge transaction
    loadAll: guard(function (dump) {
      var ops = [];
      STORES.forEach(function (s) { (dump[s] || []).forEach(function (kv) { ops.push({ s: s, k: kv[0], v: kv[1] }); }); });
      var p = STORES.reduce(function (q, s) { return q.then(function () { return A().clear(s); }); }, Promise.resolve());
      for (var i = 0; i < ops.length; i += 200) (function (part) { p = p.then(function () { return A().putMany(part); }); })(ops.slice(i, i + 200));
      return p;
    })
  };
})(window);
