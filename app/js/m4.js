/* Module 4: pick frequency (4.1), swap advice (4.2) and swap simulation (4.3).
 * The numbers come from PWH.freq (see freq.js for the agreed counting rules). Nothing here changes stored data. */
(function (g) {
  var PWH = g.PWH, t = PWH.t;
  var S = { root: null, d: null, base: null, tab: 'freq', from: '', to: '', q: '', open: null, recs: null, busy: '', sim: [], simRes: null, view: null, K: null };
  try { var st = localStorage.getItem('pwh-m4tab'); if (st) S.tab = st; } catch (e) {}

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function nf(n, dg) { return typeof n === 'number' ? n.toLocaleString('en-US', { maximumFractionDigits: dg == null ? 0 : dg }) : esc(n); }
  function m(x) { return nf(Math.round(x)); }
  function $(s) { return S.root && S.root.querySelector(s); }
  function fmtDate(iso) { return iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4) : ''; }
  function fnum(id) { return String(id || '').replace(/^F/, ''); }
  function seg(items, cur, act) { return '<div class="seg" role="group">' + items.map(function (i) { return '<button data-m4="' + act + '" data-v="' + i[0] + '" aria-pressed="' + (cur === i[0]) + '">' + esc(i[1]) + '</button>'; }).join('') + '</div>'; }
  function partName(code) { return S.d && S.d.text.get(code) || ''; }
  function locTxt(pk) {
    if (!pk) return '–';
    if (pk.status === 'ok') return '<span class="loc">' + esc(pk.bin) + '</span>';
    return '<span class="chip warn">' + esc(t('m4.loc.' + pk.status)) + '</span>';
  }

  // ---------- data ----------
  function run() {
    S.busy = t('m4.busy.analyse'); render();
    return new Promise(function (r) { setTimeout(r, 30); }).then(function () {
      S.base = PWH.freq.analyze(S.d, { from: S.from, to: S.to });
      S.recs = null; S.simRes = null; S.busy = ''; render();
      if (S.tab === 'recs') runRecs();
    });
  }
  function runRecs() {
    if (!S.base || S.recs) return;
    S.busy = t('m4.busy.recs'); render();
    setTimeout(function () { S.recs = PWH.freq.recommend(S.d, S.base, 12); S.busy = ''; render(); }, 30);
  }

  // ---------- 4.1 frequency ----------
  function kpis() {
    var B = S.base, all = B.rounds.length, ok = B.okRounds.length;
    function k(label, val, sub) { return '<div class="m4k"><span class="k">' + esc(label) + '</span><span class="v">' + val + '</span>' + (sub ? '<span class="s">' + sub + '</span>' : '') + '</div>'; }
    return '<div class="m4kpis">' +
      k(t('m4.k.rounds'), nf(ok), esc(t('m4.k.rounds_of', { n: nf(all) }))) +
      k(t('m4.k.parts'), nf(B.parts.length), esc(t('m4.k.picks', { n: nf(B.parts.reduce(function (s, p) { return s + p.n; }, 0)) }))) +
      k(t('m4.k.dist'), esc(t('m4.m', { m: m(B.totalM) })), esc(t('m4.k.per', { m: m(ok ? B.totalM / ok : 0) }))) +
      k(t('m4.k.bad'), nf(B.bad.length + B.noLoc.length), esc(t('m4.k.bad_sub', { r: nf(B.bad.length), p: nf(B.noLoc.length) }))) + '</div>';
  }
  function match(code) { var q = S.q.trim().toUpperCase(); return !q || String(code).toUpperCase().indexOf(q) >= 0; }
  function partsTable() {
    var rows = S.base.parts.filter(function (p) { return match(p.code) || Array.from(p.products.keys()).some(match); }), MAX = 60;
    var body = rows.slice(0, MAX).map(function (p, i) {
      var open = S.open === 'p:' + p.code, prods = Array.from(p.products.entries()).sort(function (a, b) { return b[1] - a[1]; });
      var tr = '<tr class="m4r' + (open ? ' open' : '') + '" data-m4="open" data-v="p:' + esc(p.code) + '" tabindex="0"><td class="num m4rank">' + (i + 1) + '</td><td><span class="code">' + esc(p.code) + '</span><div class="sub2">' + esc(p.name) + '</div></td><td class="num"><b>' + nf(p.n) + '</b></td><td>' + locTxt(p.pick) + '</td><td>' + (p.pick.floor ? esc(t('m4.floor', { n: fnum(p.pick.floor) })) : '–') + '</td><td class="num">' + nf(prods.length) + '</td></tr>';
      if (open) tr += '<tr class="m4det"><td></td><td colspan="5"><div class="m4dh">' + esc(t('m4.det.products', { code: p.code })) + '</div><div class="m4bars">' +
        prods.map(function (e) { return '<div class="m4bar"><span class="code">' + esc(e[0]) + '</span><span class="m4bt"><i style="width:' + Math.max(4, e[1] / p.n * 100) + '%"></i></span><b>' + nf(e[1]) + '</b></div>'; }).join('') + '</div></td></tr>';
      return tr;
    }).join('');
    return '<section class="panel m4card"><div class="chd"><div class="chd-l"><h2>' + esc(t('m4.parts.title')) + '</h2><p class="sub">' + esc(t('m4.parts.sub')) + '</p></div><span class="chip info">' + nf(rows.length) + '</span></div>' +
      (rows.length ? '<div class="tablebox m4tb"><table><thead><tr><th class="num">#</th><th>' + esc(t('m4.col.part')) + '</th><th class="num">' + esc(t('m4.col.n')) + '</th><th>' + esc(t('m4.col.loc')) + '</th><th>' + esc(t('m4.col.floor')) + '</th><th class="num">' + esc(t('m4.col.prods')) + '</th></tr></thead><tbody>' + body + '</tbody></table></div>' + (rows.length > MAX ? '<p class="sub">' + esc(t('m4.more', { n: MAX, t: rows.length })) + '</p>' : '')
        : '<p class="empty-note">' + esc(t('m4.none')) + '</p>') + '</section>';
  }
  function locsTable() {
    var rows = S.base.locs.slice(0, 30);
    return '<section class="panel m4card"><div class="chd"><div class="chd-l"><h2>' + esc(t('m4.locs.title')) + '</h2><p class="sub">' + esc(t('m4.locs.sub')) + '</p></div></div>' +
      '<div class="tablebox m4tb"><table><thead><tr><th>' + esc(t('m4.col.loc')) + '</th><th>' + esc(t('m4.col.floor')) + '</th><th class="num">' + esc(t('m4.col.n')) + '</th></tr></thead><tbody>' +
      rows.map(function (l) { return '<tr><td><span class="loc">' + esc(l.bin) + '</span></td><td>' + (l.floor ? esc(t('m4.floor', { n: fnum(l.floor) })) : '–') + '</td><td class="num"><b>' + nf(l.n) + '</b></td></tr>'; }).join('') + '</tbody></table></div></section>';
  }
  function prodsTable() {
    var rows = S.base.products.filter(function (p) { return match(p.product); }), MAX = 40;
    return '<section class="panel m4card"><div class="chd"><div class="chd-l"><h2>' + esc(t('m4.prods.title')) + '</h2><p class="sub">' + esc(t('m4.prods.sub')) + '</p></div><span class="chip info">' + nf(rows.length) + '</span></div>' +
      '<div class="tablebox m4tb"><table><thead><tr><th>' + esc(t('m4.col.product')) + '</th><th class="num">' + esc(t('m4.col.rounds')) + '</th><th class="num">' + esc(t('m4.col.parts')) + '</th><th class="num">' + esc(t('m4.col.per')) + '</th><th class="num">' + esc(t('m4.col.total')) + '</th></tr></thead><tbody>' +
      rows.slice(0, MAX).map(function (p) { return '<tr><td><span class="code">' + esc(p.product) + '</span>' + (S.d.desc.get(p.product) ? '<div class="sub2">' + esc(S.d.desc.get(p.product)) + '</div>' : '') + '</td><td class="num"><b>' + nf(p.rounds) + '</b></td><td class="num">' + nf(p.parts) + '</td><td class="num">' + m(p.m / p.rounds) + '</td><td class="num">' + m(p.m) + '</td></tr>'; }).join('') + '</tbody></table></div>' +
      (rows.length > MAX ? '<p class="sub">' + esc(t('m4.more', { n: MAX, t: rows.length })) + '</p>' : '') + '</section>';
  }
  function badCard() {
    var B = S.base; if (!B.bad.length && !B.noLoc.length) return '';
    var why = {}; B.bad.forEach(function (x) { (why[x.why] = why[x.why] || []).push(x); });
    var pl = {}; B.noLoc.forEach(function (p) { (pl[p.pick.status] = pl[p.pick.status] || []).push(p); });
    var html = '<section class="panel m4card"><div class="chd"><div class="chd-l"><h2>' + esc(t('m4.bad.title')) + '</h2><p class="sub">' + esc(t('m4.bad.sub')) + '</p></div></div>';
    Object.keys(why).forEach(function (k) {
      var list = why[k];
      html += '<details class="m4bad"><summary><span class="chip warn">' + nf(list.length) + '</span> ' + esc(t('m4.why.' + k)) + '</summary><div class="tablebox m4tb"><table><thead><tr><th>' + esc(t('m4.col.date')) + '</th><th>U-line</th><th>JOB</th><th>' + esc(t('m4.col.product')) + '</th></tr></thead><tbody>' +
        list.slice(0, 200).map(function (x) { return '<tr><td>' + esc(fmtDate(x.round.date)) + '</td><td>' + esc(x.round.line) + '</td><td class="code">' + esc(x.round.job) + '</td><td class="code">' + esc(x.product) + '</td></tr>'; }).join('') + '</tbody></table></div></details>';
    });
    Object.keys(pl).forEach(function (k) {
      var list = pl[k].sort(function (a, b) { return b.n - a.n; });
      html += '<details class="m4bad"><summary><span class="chip warn">' + nf(list.length) + '</span> ' + esc(t('m4.why.' + k)) + '</summary><div class="tablebox m4tb"><table><thead><tr><th>' + esc(t('m4.col.part')) + '</th><th class="num">' + esc(t('m4.col.n')) + '</th><th>' + esc(t('m4.col.bins')) + '</th></tr></thead><tbody>' +
        list.slice(0, 200).map(function (p) { return '<tr><td><span class="code">' + esc(p.code) + '</span><div class="sub2">' + esc(p.name) + '</div></td><td class="num">' + nf(p.n) + '</td><td>' + esc((p.pick.bins || []).map(function (b) { return b.bin; }).join(', ') || '–') + '</td></tr>'; }).join('') + '</tbody></table></div></details>';
    });
    return html + '</section>';
  }
  function freqTab() {
    return kpis() + '<div class="m4grid">' + partsTable() + '<div class="m4side">' + locsTable() + '</div></div>' + prodsTable() + badCard();
  }

  // ---------- 4.2 swap advice ----------
  function ruleChip(rules) {
    return rules && rules.length ? '<span class="chip error">' + esc(t('m4.rule.fail')) + '</span>' : '<span class="chip ok">&#10003; ' + esc(t('m4.rule.ok')) + '</span>';
  }
  function topProds(p, n) { return Array.from(p.products.entries()).sort(function (a, b) { return b[1] - a[1]; }).slice(0, n || 3); }
  function swapHead(a, b) {
    function side(p, tag) { return '<div class="m4sw ' + tag + '"><span class="m4tag">' + tag.toUpperCase() + '</span><div><span class="code">' + esc(p.code) + '</span><div class="sub2">' + esc(p.name || partName(p.code)) + '</div></div><div class="m4swl"><span class="loc">' + esc(p.pick.bin) + '</span><span class="sub2">' + esc(t('m4.floor', { n: fnum(p.pick.floor) })) + ' · ' + esc(t('m4.times', { n: nf(p.n) })) + '</span></div></div>'; }
    return '<div class="m4pair">' + side(a, 'a') + '<span class="m4x" aria-hidden="true">⇄</span>' + side(b, 'b') + '</div>';
  }
  function barsHtml(byProd, max) {
    if (!byProd.length) return '<p class="sub">' + esc(t('m4.det.noprod')) + '</p>';
    max = max || Math.max.apply(null, byProd.map(function (x) { return Math.max(x.before, x.after); }));
    return '<div class="m4cmp">' + byProd.slice(0, 12).map(function (x) {
      var up = x.after > x.before;
      return '<div class="m4cr"><span class="code">' + esc(x.product) + '</span><div class="m4cb"><i class="b" style="width:' + (x.before / max * 100) + '%"></i><i class="a' + (up ? ' up' : '') + '" style="width:' + (x.after / max * 100) + '%"></i></div><span class="m4cv' + (up ? ' up' : '') + '">' + m(x.before) + ' → ' + m(x.after) + ' ' + esc(t('m4.m', { m: '' })).trim() + ' (' + (up ? '+' : '−') + m(Math.abs(x.after - x.before)) + ')</span></div>';
    }).join('') + '<div class="m4leg"><span><i class="b"></i>' + esc(t('m4.before')) + '</span><span><i class="a"></i>' + esc(t('m4.after')) + '</span><span><i class="a up"></i>' + esc(t('m4.worse')) + '</span></div></div>';
  }
  function recsTab() {
    if (!S.recs) return '<section class="panel"><p class="empty-note">' + esc(S.busy || t('m4.busy.recs')) + '</p></section>';
    if (!S.recs.length) return '<section class="panel"><p class="empty-note">' + esc(t('m4.recs.none')) + '</p></section>';
    var sum = S.recs.reduce(function (s, r) { return s + r.save; }, 0);
    var head = '<div class="m4note">' + esc(t('m4.recs.head', { n: S.recs.length, m: m(sum), from: fmtDate(S.base.from || S.d.dates[0]), to: fmtDate(S.base.to || S.d.dates[S.d.dates.length - 1]) })) + '</div>';
    return head + S.recs.map(function (r, i) {
      var open = S.open === 'r:' + i, prods = topProds(r.a, 3);
      var reason = t('m4.recs.reason', { a: r.a.code, na: nf(r.a.n), ca: m(r.a.c), b: r.b.code, nb: nf(r.b.n), cb: m(r.b.c) });
      var inSim = S.sim.some(function (s) { return s.a.code === r.a.code && s.b.code === r.b.code; });
      return '<section class="panel m4rec' + (open ? ' open' : '') + '"><div class="m4rh"><span class="m4no">' + (i + 1) + '</span>' + swapHead(r.a, r.b) +
        '<div class="m4gain"><b>−' + m(r.save) + ' ' + esc(t('m4.m', { m: '' })).trim() + '</b><span>' + esc(t('m4.pct', { p: nf(r.pct, 1) })) + '</span></div></div>' +
        '<p class="m4why">' + esc(reason) + '</p>' +
        '<div class="m4meta"><span>' + esc(t('m4.recs.before_after', { b: m(r.before), a: m(r.after) })) + '</span>' + ruleChip(r.rules) +
        (prods.length ? '<span class="sub2">' + esc(t('m4.recs.prods')) + ' ' + prods.map(function (e) { return '<span class="code">' + esc(e[0]) + '</span> (' + e[1] + ')'; }).join(', ') + '</span>' : '') + '</div>' +
        '<div class="m4acts"><button class="btn sm" data-m4="open" data-v="r:' + i + '">' + esc(t(open ? 'm4.btn.hide' : 'm4.btn.detail')) + '</button><button class="btn sm' + (inSim ? '' : ' primary') + '" data-m4="tosim" data-v="' + i + '"' + (inSim ? ' disabled' : '') + '>' + esc(t(inSim ? 'm4.btn.insim' : 'm4.btn.tosim')) + '</button></div>' +
        (open ? '<div class="m4detail">' + barsHtml(r.byProd) + mapBox('r', i, r) + '</div>' : '') + '</section>';
    }).join('');
  }

  // ---------- 4.3 simulation ----------
  function simTab() {
    var B = S.base, parts = B.parts.filter(function (p) { return p.pick.status === 'ok'; });
    var form = '<section class="panel"><div class="chd"><div class="chd-l"><h2>' + esc(t('m4.sim.title')) + '</h2><p class="sub">' + esc(t('m4.sim.sub')) + '</p></div></div>' +
      '<form class="m4add" id="m4add" autocomplete="off"><label><span>Part A</span><input id="m4a" list="m4pl" placeholder="' + esc(t('m4.sim.ph')) + '" required></label><span class="m4x">⇄</span><label><span>Part B</span><input id="m4b" list="m4all" placeholder="' + esc(t('m4.sim.ph')) + '" required></label><button class="btn" type="submit">' + esc(t('m4.sim.add')) + '</button></form>' +
      '<datalist id="m4pl">' + parts.slice(0, 1500).map(function (p) { return '<option value="' + esc(p.code) + '">' + esc(p.pick.bin + ' · ' + p.n) + '</option>'; }).join('') + '</datalist>' +
      '<datalist id="m4all">' + Array.from(S.d.bins.keys()).slice(0, 4000).map(function (c) { return '<option value="' + esc(c) + '">'; }).join('') + '</datalist>' +
      (S.simMsg ? '<div class="msg bad" role="status"><span>' + esc(S.simMsg) + '</span></div>' : '');
    if (S.sim.length) {
      form += '<div class="m4pairs">' + S.sim.map(function (s, i) {
        return '<div class="m4pr">' + swapHead(s.a, s.b) + ruleChip(s.rules) + (s.rules.length ? '<span class="sub2">' + s.rules.map(function (x) { return esc(PWH.rules.reasonText(x)); }).join(' · ') + '</span>' : '') + '<button class="btn sm danger" data-m4="simdel" data-v="' + i + '">' + esc(t('m4.sim.del')) + '</button></div>';
      }).join('') + '</div><div class="m4acts"><button class="btn primary" data-m4="simrun"' + (S.sim.some(function (s) { return s.rules.length; }) ? ' disabled' : '') + '>' + esc(t('m4.sim.run')) + '</button><button class="btn" data-m4="simclear">' + esc(t('m4.sim.clear')) + '</button></div>';
    } else form += '<p class="empty-note">' + esc(t('m4.sim.empty')) + '</p>';
    form += '</section>';
    var R = S.simRes;
    if (R) {
      var save = R.before - R.after, worse = R.byProd.filter(function (x) { return x.after > x.before; });
      form += '<section class="panel"><div class="chd"><div class="chd-l"><h2>' + esc(t('m4.sim.result')) + '</h2><p class="sub">' + esc(t('m4.sim.result_sub')) + '</p></div></div><div class="m4kpis">' +
        '<div class="m4k"><span class="k">' + esc(t('m4.before')) + '</span><span class="v">' + esc(t('m4.m', { m: m(R.before) })) + '</span></div>' +
        '<div class="m4k"><span class="k">' + esc(t('m4.after')) + '</span><span class="v">' + esc(t('m4.m', { m: m(R.after) })) + '</span></div>' +
        '<div class="m4k ' + (save >= 0 ? 'good' : 'badv') + '"><span class="k">' + esc(t('m4.diff')) + '</span><span class="v">' + (save >= 0 ? '−' : '+') + esc(t('m4.m', { m: m(Math.abs(save)) })) + '</span><span class="s">' + esc(t('m4.pct', { p: nf(R.before ? Math.abs(save) / R.before * 100 : 0, 1) })) + '</span></div>' +
        '<div class="m4k"><span class="k">' + esc(t('m4.sim.worse')) + '</span><span class="v">' + nf(worse.length) + '</span><span class="s">' + esc(t('m4.sim.worse_sub')) + '</span></div></div>' +
        barsHtml(R.byProd) + mapBox('s', 0, null) + '</section>';
    }
    return form;
  }

  // ---------- map: one Product's route before / after the swaps ----------
  function mapBox(kind, i, rec) {
    var pairs = kind === 'r' ? [rec] : S.sim, prods = {};
    pairs.forEach(function (p) { p.a.products.forEach(function (n, k) { prods[k] = (prods[k] || 0) + n; }); p.b.products.forEach(function (n, k) { prods[k] = (prods[k] || 0) + n; }); });
    var list = Object.keys(prods).sort(function (a, b) { return prods[b] - prods[a]; }).slice(0, 15);
    if (!list.length || !S.d.L) return '';
    var v = S.view && S.view.kind === kind && S.view.i === i ? S.view : (S.view = { kind: kind, i: i, prod: list[0], mode: 'after' });
    if (list.indexOf(v.prod) < 0) v.prod = list[0];
    return '<div class="m4map"><div class="m4mbar"><label class="inl"><span>' + esc(t('m4.map.product')) + '</span> <select id="m4prod">' + list.map(function (p) { return '<option' + (p === v.prod ? ' selected' : '') + '>' + esc(p) + '</option>'; }).join('') + '</select></label>' +
      seg([['before', t('m4.before')], ['after', t('m4.after')]], v.mode, 'mode') + '<span class="m4mm" id="m4mm"></span></div>' +
      '<div class="m4mapbox m2mapcard" data-fsbox id="m4mapbox"><div class="m2canvas" id="m2wrap"><canvas id="m2cv" tabindex="0" aria-label="Warehouse map"></canvas><div id="m2tip" class="m2tip" hidden></div></div></div></div>';
  }
  function routeFor(prod, pairs, after) {
    var B = S.base, P = B.products.filter(function (x) { return x.product === prod; })[0]; if (!P) return null;
    var pm = S.d.index.byPlant.get(P.plant), kids = pm && pm.get(prod); if (!kids) return null;
    var sw = new Map(); if (after) pairs.forEach(function (s) { sw.set(s.a.code, s.b.pick); sw.set(s.b.code, s.a.pick); });
    var items = [];
    Array.from(kids.keys()).forEach(function (code) {
      var pk = sw.get(code) || PWH.freq.pickOf(S.d, code); if (!pk || pk.status !== 'ok') return;
      items.push({ key: code, cands: [{ bin: pk.bin, rack: pk.rack, level: pk.level, floor: pk.floor, stock: 1 }] });
    });
    return items.length ? PWH.route.plan(S.d.L, items) : null;
  }
  function drawMap() {
    var box = $('#m4mapbox'); if (!box || !S.view) return;
    var pairs = S.view.kind === 'r' ? [S.recs[S.view.i]] : S.sim;
    var res = routeFor(S.view.prod, pairs, S.view.mode === 'after');
    var mm = $('#m4mm'); if (mm) mm.textContent = res ? t('m4.map.dist', { m: m(res.total) }) : '';
    if (!S.K) { S.K = PWH.mapKit('pwh-m4mode'); }
    var K = S.K; K.M.root = box; K.M.canvas = null; K.M.layout = S.d.L; K.M.match = S.d.match; K.M.names = true;
    K.M.focus = null;
    var hot = {}; pairs.forEach(function (s) {
      var aR = S.view.mode === 'after' ? s.b.pick : s.a.pick, bR = S.view.mode === 'after' ? s.a.pick : s.b.pick;
      hot[aR.rack] = { tag: 'A', code: s.a.code, col: '#f2b705' }; hot[bR.rack] = { tag: 'B', code: s.b.code, col: '#22d3ee' };
    });
    var fl = res && res.legs.length ? res.legs[0].floor : (S.d.L.floors[0].id);
    var hotFloor = null; Object.keys(hot).forEach(function (r) { var rk = S.d.match.rackById.get(r); if (rk && !hotFloor) hotFloor = rk.floor; });
    K.M.floor = Math.max(0, S.d.L.floors.map(function (f) { return f.id; }).indexOf(hotFloor || fl));
    K.M.overlay = function (c, Pj, f, o) {
      if (res) {
        c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
        res.legs.forEach(function (l) {
          if (l.floor !== f.id || l.pts.length < 2) return;
          c.beginPath(); l.pts.forEach(function (p, i) { var q = Pj(p[0], p[1], 0); if (i) c.lineTo(q[0], q[1]); else c.moveTo(q[0], q[1]); });
          c.strokeStyle = 'rgba(56,163,255,0.25)'; c.lineWidth = 8; c.stroke(); c.strokeStyle = '#38a3ff'; c.lineWidth = 2.4; c.stroke();
        });
        c.restore();
      }
      Object.keys(hot).forEach(function (rid) {
        var r = S.d.match.rackById.get(rid); if (!r || r.floor !== f.id) return;
        var h = hot[rid], H = o.d3 ? r.levels * o.lp : 0, pts = [Pj(r.x, r.y, H), Pj(r.x + r.w, r.y, H), Pj(r.x + r.w, r.y + r.h, H), Pj(r.x, r.y + r.h, H)];
        c.save(); c.beginPath(); pts.forEach(function (p, i) { if (i) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); }); c.closePath();
        c.shadowColor = h.col; c.shadowBlur = 14; c.fillStyle = h.col + '66'; c.fill(); c.lineWidth = 2.5; c.strokeStyle = h.col; c.stroke(); c.restore();
        var q = Pj(r.x + r.w / 2, r.y + r.h / 2, H), txt = h.tag + ' · ' + h.code;
        c.font = '600 12px "IBM Plex Mono", monospace'; var w = c.measureText(txt).width + 14;
        c.fillStyle = h.col; c.beginPath(); if (c.roundRect) c.roundRect(q[0] - w / 2, q[1] - 30, w, 20, 10); else c.rect(q[0] - w / 2, q[1] - 30, w, 20); c.fill();
        c.fillStyle = '#060d19'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(txt, q[0], q[1] - 20);
      });
    };
    K.wireMap(); K.resize(); K.fit(); K.draw();
  }

  // ---------- page ----------
  function render() {
    var R = S.root; if (!R) return;
    var d = S.d;
    var head = '<div class="ph"><div class="ph-l"><div class="cap">' + esc(t('mod.cap', { n: 4 })) + '</div><h1>' + esc(t('nav.m4')) + '</h1><p class="lede">' + esc(t('m4.intro')) + '</p></div></div>';
    if (!d) { R.innerHTML = head + '<p class="empty-note">' + esc(t('m4.busy.load')) + '</p>'; return; }
    var miss = []; ['daily', 'bom', 'matloc', 'layout'].forEach(function (k) { if (!d.have[k]) miss.push(t('m4.need.' + k)); });
    if (miss.length) { R.innerHTML = head + '<section class="panel"><h2>' + esc(t('m4.need.title')) + '</h2><p class="sub">' + esc(t('m4.need.list', { list: miss.join(', ') })) + '</p></section>'; return; }
    var dates = d.dates, opt = function (v) { return dates.map(function (x) { return '<option value="' + x + '"' + (x === v ? ' selected' : '') + '>' + esc(fmtDate(x)) + '</option>'; }).join(''); };
    var bar = '<div class="m4bar"><div class="m4tabs">' + seg([['freq', t('m4.tab.freq')], ['recs', t('m4.tab.recs')], ['sim', t('m4.tab.sim') + (S.sim.length ? ' (' + S.sim.length + ')' : '')]], S.tab, 'tab') + '</div>' +
      '<label class="inl"><span>' + esc(t('m4.from')) + '</span> <select id="m4from">' + opt(S.from) + '</select></label><label class="inl"><span>' + esc(t('m4.to')) + '</span> <select id="m4to">' + opt(S.to) + '</select></label>' +
      (S.tab === 'freq' ? '<input id="m4q" type="search" placeholder="' + esc(t('m4.q.ph')) + '" value="' + esc(S.q) + '" aria-label="' + esc(t('m4.q.ph')) + '">' : '') +
      (S.busy ? '<span class="m4busy" role="status">' + esc(S.busy) + '</span>' : '') + '</div>';
    var body = !S.base ? '' : S.tab === 'freq' ? freqTab() : S.tab === 'recs' ? recsTab() : simTab();
    var note = d.have.monthly ? '' : '<div class="banner" style="margin:0 0 12px">' + esc(t('m4.warn.monthly')) + '</div>';
    R.innerHTML = head + note + bar + body;
    var q = $('#m4q'); if (q) { q.addEventListener('input', function () { S.q = q.value; var pos = q.selectionStart; render(); var q2 = $('#m4q'); if (q2) { q2.focus(); q2.setSelectionRange(pos, pos); } }); }
    var f1 = $('#m4from'), f2 = $('#m4to');
    if (f1) f1.addEventListener('change', function () { S.from = f1.value; if (S.to < S.from) S.to = S.from; run(); });
    if (f2) f2.addEventListener('change', function () { S.to = f2.value; if (S.from > S.to) S.from = S.to; run(); });
    var add = $('#m4add'); if (add) add.addEventListener('submit', function (e) { e.preventDefault(); addSim($('#m4a').value.trim().toUpperCase(), $('#m4b').value.trim().toUpperCase()); });
    var ps = $('#m4prod'); if (ps) ps.addEventListener('change', function () { S.view.prod = ps.value; drawMap(); });
    if ($('#m4mapbox')) drawMap();
  }
  function partObj(code) {
    var f = S.base.parts.filter(function (p) { return p.code === code; })[0];
    if (f) return f;
    var pk = PWH.freq.pickOf(S.d, code);
    return { code: code, name: partName(code), n: 0, products: new Map(), pick: pk };
  }
  function addSim(a, b) {
    S.simMsg = '';
    if (!a || !b || a === b) { S.simMsg = t('m4.sim.err_pair'); render(); return; }
    if (!S.d.bins.has(a) || !S.d.bins.has(b)) { S.simMsg = t('m4.sim.err_part', { code: !S.d.bins.has(a) ? a : b }); render(); return; }
    var A = partObj(a), B = partObj(b);
    if (S.sim.some(function (s) { return [s.a.code, s.b.code].indexOf(a) >= 0 || [s.a.code, s.b.code].indexOf(b) >= 0 || (A.pick.bin && [s.a.pick.bin, s.b.pick.bin].indexOf(A.pick.bin) >= 0) || (B.pick.bin && [s.a.pick.bin, s.b.pick.bin].indexOf(B.pick.bin) >= 0); })) { S.simMsg = t('m4.sim.err_twice'); render(); return; }
    S.sim.push({ a: A, b: B, rules: PWH.freq.checkSwap(S.d, A, B) }); S.simRes = null; render();
  }
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-m4]'); if (!el || !S.root || !S.root.contains(el)) return;
    var a = el.getAttribute('data-m4'), v = el.getAttribute('data-v');
    if (a === 'tab') { S.tab = v; try { localStorage.setItem('pwh-m4tab', v); } catch (x) {} S.open = null; render(); if (v === 'recs') runRecs(); }
    else if (a === 'open') { S.open = S.open === v ? null : v; render(); }
    else if (a === 'tosim') { var r = S.recs[+v]; if (!S.sim.some(function (s) { return s.a.code === r.a.code; })) S.sim.push({ a: r.a, b: r.b, rules: r.rules }); S.simRes = null; render(); }
    else if (a === 'simdel') { S.sim.splice(+v, 1); S.simRes = null; render(); }
    else if (a === 'simclear') { S.sim = []; S.simRes = null; render(); }
    else if (a === 'simrun') { S.busy = t('m4.busy.sim'); render(); setTimeout(function () { S.simRes = PWH.freq.simulate(S.d, S.base, S.sim); S.busy = ''; S.view = null; render(); }, 30); }
    else if (a === 'mode') { if (S.view) { S.view.mode = v; render(); } }
  });
  function mount(root) {
    S.root = root; S.d = null; S.base = null; S.K = null; render();
    PWH.freq.load().then(function (d) {
      S.d = d;
      // start with the last 3 plan days (agreed); the dates can be changed
      if (!S.from || d.dates.indexOf(S.from) < 0) S.from = d.dates[Math.max(0, d.dates.length - 3)] || '';
      if (!S.to || d.dates.indexOf(S.to) < 0) S.to = d.dates[d.dates.length - 1] || '';
      S.sim = S.sim.map(function (s) { return s; });
      render();
      if (d.have.daily && d.have.bom && d.have.matloc && d.have.layout) run();
    });
  }
  PWH.m4 = { mount: mount };
})(window);
