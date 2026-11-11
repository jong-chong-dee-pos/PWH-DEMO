/* PWH backup / restore and file saving.
 * A backup is one JSON file holding every store of PWH.db (uploaded Excel files, their rows, settings, rules,
 * scenarios and user accounts). Binary data (the original .xlsx) and dates are tagged so they come back as they were.
 * PWH.saveFile() offers a generated file to the viewer: through the claude.ai downloads capability when the app runs
 * as an artifact, through an ordinary download link anywhere else (intranet, local). */
(function (g) {
  var PWH = (g.PWH = g.PWH || {});
  var FORMAT = 'PWH-backup', VERSION = 1;

  // ---------- encode / decode values that JSON cannot hold ----------
  function b64(buf) {
    var u = new Uint8Array(buf), s = '', CH = 0x8000;
    for (var i = 0; i < u.length; i += CH) s += String.fromCharCode.apply(null, u.subarray(i, i + CH));
    return btoa(s);
  }
  function unb64(str) { var s = atob(str), u = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u.buffer; }
  function enc(v) {
    if (v === null || typeof v !== 'object') return v;
    if (v instanceof Date) return { $date: v.toISOString() };
    if (v instanceof ArrayBuffer) return { $bin: b64(v) };
    if (ArrayBuffer.isView(v)) return { $bin: b64(v.buffer.slice(v.byteOffset, v.byteOffset + v.byteLength)), $view: v.constructor.name };
    if (v instanceof Map) return { $map: Array.from(v.entries()).map(function (e) { return [enc(e[0]), enc(e[1])]; }) };
    if (v instanceof Set) return { $set: Array.from(v).map(enc) };
    if (Array.isArray(v)) return v.map(enc);
    var o = {}; Object.keys(v).forEach(function (k) { o[k] = enc(v[k]); }); return o;
  }
  function dec(v) {
    if (v === null || typeof v !== 'object') return v;
    if (Array.isArray(v)) return v.map(dec);
    if (typeof v.$date === 'string') return new Date(v.$date);
    if (typeof v.$bin === 'string') { var b = unb64(v.$bin); return v.$view && g[v.$view] ? new g[v.$view](b) : b; }
    if (Array.isArray(v.$map)) return new Map(v.$map.map(function (e) { return [dec(e[0]), dec(e[1])]; }));
    if (Array.isArray(v.$set)) return new Set(v.$set.map(dec));
    var o = {}; Object.keys(v).forEach(function (k) { o[k] = dec(v[k]); }); return o;
  }

  // ---------- saving a file ----------
  function anchorSave(name, data, mime) {
    var blob = data instanceof Blob ? data : new Blob([data], { type: mime || 'application/octet-stream' });
    var url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    return Promise.resolve('saved');
  }
  var dlp = null;
  function downloads() {   // the claude.ai capability, or null outside claude.ai
    if (dlp) return dlp;
    var c = g.claude;
    dlp = c && typeof c.use === 'function' ? Promise.race([c.use('downloads'), new Promise(function (r) { setTimeout(function () { r(null); }, 4000); })]).catch(function () { return null; }) : Promise.resolve(null);
    return dlp;
  }
  /* resolves 'saved'; rejects {code} when the viewer declines or saving is not possible here */
  function saveFile(name, data, mime) {
    return downloads().then(function (dl) {
      if (!dl) return anchorSave(name, data, mime);
      var payload = data instanceof ArrayBuffer ? data.slice(0) : data;
      return dl.save({ filename: name, data: payload }).then(function () { return 'saved'; });
    });
  }

  // ---------- backup ----------
  function stamp() { var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; }; return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes()); }
  function make() {
    return PWH.db.dumpAll().then(function (dump) {
      var me = PWH.auth && PWH.auth.me(), files = (dump.files || []).length;
      var users = ((dump.meta || []).filter(function (kv) { return kv[0] === 'users.v1'; })[0] || [null, { list: [] }])[1];
      var head = { format: FORMAT, version: VERSION, createdAt: new Date().toISOString(), createdBy: me ? me.email : '', origin: location.host || 'file',
        counts: { files: files, users: users && users.list ? users.list.length : 0 } };
      var body = {}; Object.keys(dump).forEach(function (s) { body[s] = dump[s].map(function (kv) { return [kv[0], enc(kv[1])]; }); });
      var text = JSON.stringify({ head: head, stores: body });
      return { name: 'pwh-backup-' + stamp() + '.json', text: text, head: head, bytes: text.length };
    });
  }
  /* read a backup file the person chose; resolves {head, stores} or rejects {code: 'format'|'version'|'read'} */
  function read(file) {
    return new Promise(function (res, rej) {
      var r = new FileReader();
      r.onload = function () {
        var o; try { o = JSON.parse(r.result); } catch (e) { return rej({ code: 'format' }); }
        if (!o || !o.head || o.head.format !== FORMAT || !o.stores) return rej({ code: 'format' });
        if (o.head.version > VERSION) return rej({ code: 'version' });
        res(o);
      };
      r.onerror = function () { rej({ code: 'read' }); };
      r.readAsText(file);
    });
  }
  function restore(o) {
    var dump = {};
    PWH.db.STORES.forEach(function (s) { dump[s] = (o.stores[s] || []).map(function (kv) { return [kv[0], dec(kv[1])]; }); });
    return PWH.db.loadAll(dump);
  }

  PWH.saveFile = saveFile;
  PWH.backup = { make: make, read: read, restore: restore, _enc: enc, _dec: dec };
})(window);
