/* Module 4: pick frequency and heatmap, swap advice, swap simulation (spec of 07/11/2026).
 * Numbers come from PWH.freq (see freq.js for the agreed rules). Nothing here changes stored data. */
(function (g) {
  var PWH = g.PWH, t = PWH.t;
  var S = {
    root: null, d: null, base: null, tab: 'freq', from: '', to: '', product: '', q: '', sort: 'plan', open: null, partsMax: 60,
    prodView: null, prodRound: 0, hFloor: 0, hSel: {}, hq: '', kits: {}, recs: null, recOpen: null, sim: [], simMsg: '', simRes: null,
    simProd: null, view: null, busy: null, plantPick: {}, rp: { before: { floor: null, mode: '2d' }, after: { floor: null, mode: '2d' } }, stale: false, runId: 0, err: '', form: { a: '', ab: '', b: '', bb: '' }
  };
  try { var st = localStorage.getItem('pwh-m4tab'); if (st) S.tab = st; } catch (e) {}

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function nf(n, dg) { return typeof n === 'number' ? n.toLocaleString('en-US', { maximumFractionDigits: dg == null ? 0 : dg }) : esc(n); }
  function m(x) { return nf(Math.round(x)); }
  function mm(x) { return esc(t('m4.m', { m: m(x) })); }
  function $(s) { return S.root && S.root.querySelector(s); }
  function fmtDate(iso) { return iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4) : ''; }
  function fmtTime(ms) { var d = new Date(ms), p = function (n) { return (n < 10 ? '0' : '') + n; }; return p(d.getHours()) + ':' + p(d.getMinutes()); }
  function fnum(id) { return String(id || '').replace(/^F/, ''); }
  function floorTxt(f) { return f ? t('m4.floor', { n: fnum(f) }) : '–'; }
  function seg(items, cur, act, extra) { return '<div class="seg" role="group">' + items.map(function (i) { return '<button type="button" data-m4="' + act + '" data-v="' + esc(i[0]) + '"' + (extra || '') + ' aria-pressed="' + (cur === i[0]) + '">' + esc(i[1]) + '</button>'; }).join('') + '</div>'; }
  function partName(code) { return S.d && S.d.text.get(code) || ''; }
  function prodName(code) { return S.d && S.d.desc.get(code) || ''; }
  function nbar(v, max, txt) { return '<span class="nbar"><i style="width:' + (v > 0 ? Math.max(3, v / (max || 1) * 100) : 0).toFixed(1) + '%"></i><b>' + (txt || nf(v)) + '</b></span>'; }
  function chip(kind, txt) { return '<span class="chip ' + kind + '">' + esc(txt) + '</span>'; }
  function statusChip(pk) { return pk.status === 'ok' ? chip('ok', t('m4.st.ok')) : chip('warn', t('m4.loc.' + pk.status)); }
  function locTag(bin) { return '<span class="loc">' + esc(bin) + '</span>'; }
  function pct(x) { return x == null ? '—' : nf(x, 1) + '%'; }
  function diffTxt(before, after) { var dlt = before - after; return Math.abs(dlt) < 0.5 ? esc(t('m4.same')) : esc(t(dlt > 0 ? 'm4.down' : 'm4.up', { m: m(Math.abs(dlt)) })); }

  // ---------- running ----------
  function setBusy(step, done, total) {
    S.busy = step ? { step: step, done: done || 0, total: total || 0 } : null;
    var el = $('#m4busy'); if (el) el.outerHTML = busyHtml(); else if (step) render();
  }
  function busyHtml() {
    var B = S.busy; if (!B) return '<div id="m4busy" hidden></div>';
    var p = B.total ? Math.round(B.done / B.total * 100) : null;
    return '<div id="m4busy" class="m4busy" role="status"><span class="m4spin" aria-hidden="true"></span><span>' + esc(t('m4.step.' + B.step)) + (B.total ? ' ' + nf(B.done) + '/' + nf(B.total) : '') + '</span>' +
      (p != null ? '<span class="m4prog"><i style="width:' + p + '%"></i></span>' : '') + (S.base ? '<span class="sub2">' + esc(t('m4.busy.old')) + '</span>' : '') + '</div>';
  }
  // every run gets a number; a slower older run never overwrites a newer one
  function run(reload) {
    var id = ++S.runId; S.err = '';
    setBusy('load');
    var p = reload || !S.d ? PWH.freq.load().then(function (d) { if (id !== S.runId) return; S.d = d; S.stale = false; fixRange(); }) : Promise.resolve();
    return p.then(function () {
      if (id !== S.runId || !ready()) { if (id === S.runId) { S.busy = null; render(); } return; }
      setBusy('rounds'); render();
      return PWH.freq.analyze(S.d, { from: S.from, to: S.to, product: S.product, plantPick: S.plantPick, progress: function (i, n) { if (id === S.runId) setBusy('route', i, n); } }).then(function (base) {
        if (id !== S.runId) return;
        S.base = base; S.recs = null; S.simRes = null; S.busy = null;
        S.sim.forEach(function (s) { s.a = partObj(s.a.code, s.a.pick.bin); s.b = partObj(s.b.code, s.b.pick.bin); s.rules = PWH.freq.checkSwap(S.d, s.a, s.b); });
        render();
        if (S.tab === 'recs') runRecs();
      });
    }).catch(function (e) { if (id === S.runId) { S.busy = null; S.err = String(e && e.message || e); render(); } });
  }
  function runRecs() {
    if (!S.base || S.recs || S.busy) return;
    var id = S.runId;
    setBusy('recs'); render();
    PWH.freq.recommend(S.d, S.base, 12, function (i, n) { if (id === S.runId) setBusy('recs', i, n); }).then(function (r) {
      if (id !== S.runId) return; S.recs = r; S.busy = null; render();
    }).catch(function (e) { if (id === S.runId) { S.busy = null; S.err = String(e && e.message || e); render(); } });
  }
  function runSim() {
    var id = S.runId;
    setBusy('sim'); render();
    PWH.freq.simulate(S.d, S.base, S.sim, function (i, n) { if (id === S.runId) setBusy('sim', i, n); }).then(function (r) {
      if (id !== S.runId) return; S.simRes = r; S.simRes.pairs = S.sim.slice(); S.simProd = r.byProd.length ? r.byProd[0].product : null; S.busy = null; render();
    }).catch(function (e) { if (id === S.runId) { S.busy = null; S.err = String(e && e.message || e); render(); } });
  }
  function ready() { var h = S.d && S.d.have; return h && h.daily && h.bom && h.matloc && h.layout; }
  function fixRange() {
    var d = S.d; if (!d.dates.length) return;
    if (!S.from || !S.to) { var r = PWH.freq.defaultRange(d); S.from = r.from; S.to = r.to; }
  }

  // ---------- toolbar and scope ----------
  function toolbar() {
    var d = S.d, min = d.dates[0] || '', max = d.dates[d.dates.length - 1] || '';
    var prods = []; d.days.forEach(function (day) { day.rows.forEach(function (r) { if (r[1] && prods.indexOf(r[1]) < 0) prods.push(r[1]); }); });
    return '<div class="m4tool">' +
      '<div class="m4tabs">' + seg([['freq', t('m4.tab.freq')], ['recs', t('m4.tab.recs')], ['sim', t('m4.tab.sim') + (S.sim.length ? ' (' + S.sim.length + ')' : '')]], S.tab, 'tab') + '</div>' +
      '<div class="m4flt">' +
      '<label class="m4f"><span>' + esc(t('m4.from')) + '</span><input type="date" id="m4from" value="' + esc(S.from) + '" min="' + esc(min) + '" max="' + esc(max) + '"></label>' +
      '<label class="m4f"><span>' + esc(t('m4.to')) + '</span><input type="date" id="m4to" value="' + esc(S.to) + '" min="' + esc(min) + '" max="' + esc(max) + '"></label>' +
      '<label class="m4f grow"><span>' + esc(t('m4.f.product')) + '</span><input id="m4prodf" list="m4prods" value="' + esc(S.product) + '" placeholder="' + esc(t('m4.f.product_ph')) + '"></label>' +
      '<datalist id="m4prods">' + prods.slice(0, 3000).map(function (p) { return '<option value="' + esc(p) + '">' + esc(prodName(p)) + '</option>'; }).join('') + '</datalist>' +
      '<div class="m4fb"><button type="button" class="btn" data-m4="clear">' + esc(t('m4.f.clear')) + '</button><button type="button" class="btn primary" data-m4="recalc">' + esc(t('m4.f.recalc')) + '</button></div>' +
      '</div></div>';
  }
  function scopeLine() {
    var d = S.d, B = S.base, days = PWH.freq.daysIn(d, S.from, S.to), plan = days.filter(function (x) { return x.plan; }), gap = days.filter(function (x) { return !x.plan; });
    var last = d.dates[d.dates.length - 1];
    var parts = [esc(t('m4.scope.range', { from: fmtDate(S.from), to: fmtDate(S.to) })), esc(t('m4.scope.days', { n: plan.length, of: days.length }))];
    if (gap.length) parts.push('<span class="m4gap">' + esc(t('m4.scope.gap', { list: gap.map(function (x) { return fmtDate(x.date).slice(0, 5); }).join(', ') })) + '</span>');
    parts.push(esc(t('m4.scope.upto', { d: fmtDate(last) })));
    if (S.product) parts.push('<b>' + esc(t('m4.scope.product', { p: S.product })) + '</b>');
    var files = d.files, fl = [];
    if (files.bom) fl.push('BOM: ' + files.bom.name); if (files.matloc) fl.push('Material–Location: ' + files.matloc.name);
    files.daily.filter(function (f) { return f.planDate >= S.from && f.planDate <= S.to; }).forEach(function (f) { fl.push(t('m4.scope.dailyf', { d: fmtDate(f.planDate) }) + ': ' + f.name); });
    files.monthly.forEach(function (f) { fl.push(t('m4.scope.monthlyf') + ': ' + f.name); });
    fl.push(t('m4.scope.layout')); fl.push(t('m4.scope.rules', { n: (d.rules.rules || []).length }));
    return '<div class="m4scope"><p>' + parts.join(' · ') + '</p>' +
      '<p class="sub2">' + esc(t('m4.scope.note')) + (B ? ' · ' + esc(t('m4.scope.at', { t: fmtTime(B.at) })) : '') + '</p>' +
      '<details class="m4files"><summary>' + esc(t('m4.scope.files')) + '</summary><ul>' + fl.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></details></div>';
  }

  // ---------- 1. frequency ----------
  function kpis() {
    var B = S.base;
    function k(label, val, sub, cls) { return '<div class="m4k' + (cls ? ' ' + cls : '') + '"><span class="k">' + esc(label) + '</span><span class="v">' + val + '</span>' + (sub ? '<span class="s">' + sub + '</span>' : '') + '</div>'; }
    var nIss = issueGroups().reduce(function (s, gp) { return s + gp.items.length; }, 0);
    return '<div class="m4kpis m4k8">' +
      k(t('m4.k.rounds'), nf(B.rounds.length), esc(t('m4.k.rounds_sub'))) +
      k(t('m4.k.ident'), nf(B.identified.length), esc(t('m4.k.of', { n: nf(B.rounds.length) }))) +
      k(t('m4.k.complete'), nf(B.complete.length), esc(t('m4.k.partial', { n: nf(B.partial.length) }))) +
      k(t('m4.k.parts'), nf(B.parts.length), esc(t('m4.k.parts_sub'))) +
      k(t('m4.k.plan'), nf(B.planFreq), esc(t('m4.k.plan_sub'))) +
      k(t('m4.k.route'), nf(B.routeFreq), esc(t('m4.k.route_sub', { n: nf(B.planFreq - B.routeFreq) }))) +
      k(t('m4.k.dist'), mm(B.totalM), esc(t('m4.k.dist_sub', { m: m(B.complete.length ? B.totalM / B.complete.length : 0) }))) +
      k(t('m4.k.issues'), nf(nIss), esc(t('m4.k.issues_sub')), nIss ? 'warnv' : '') + '</div>' +
      (B.consistent ? '' : '<div class="msg bad" role="status"><span>' + esc(t('m4.err.heatsum', { h: nf(B.heatSum), r: nf(B.routeFreq) })) + '</span></div>');
  }
  function matchQ(p) { var q = S.q.trim().toUpperCase(); return !q || p.code.toUpperCase().indexOf(q) >= 0 || (p.name || '').toUpperCase().indexOf(q) >= 0; }
  function partsTable() {
    var B = S.base, rows = B.parts.filter(matchQ).slice();
    if (S.sort === 'route') rows.sort(function (a, b) { return b.nRoute - a.nRoute || b.n - a.n; });
    var top = Math.max(1, rows.reduce(function (s, p) { return Math.max(s, p.n); }, 0)), shown = rows.slice(0, S.partsMax);
    var body = shown.map(function (p, i) {
      var open = S.open === p.code, prods = Array.from(p.products.entries()).sort(function (a, b) { return b[1] - a[1]; });
      var bins = (p.pick.bins || []), onl = bins.filter(function (b) { return b.loc.kind === 'rack'; });
      var tr = '<tr class="m4r' + (open ? ' open' : '') + '" data-m4="open" data-v="' + esc(p.code) + '" tabindex="0" aria-expanded="' + open + '">' +
        '<td class="num m4rank">' + (i + 1) + '</td><td class="m4pn"><span class="code">' + esc(p.code) + '</span><div class="sub2">' + esc(p.name || '–') + '</div></td>' +
        '<td class="num">' + nbar(p.n, top) + '</td><td class="num">' + (p.nRoute === p.n ? nf(p.nRoute) : '<b class="m4lo">' + nf(p.nRoute) + '</b>') + '</td>' +
        '<td class="num">' + nf(prods.length) + '</td>' +
        '<td>' + (bins.length ? esc(t('m4.bins.n', { n: bins.length, on: onl.length })) : '–') + '</td>' +
        '<td>' + (p.pick.status === 'ok' ? locTag(p.pick.bin) + '<div class="sub2">' + esc(floorTxt(p.pick.floor)) + ' · ' + esc(t('m4.times', { n: nf(p.nRoute) })) + '</div>' : '–') + '</td>' +
        '<td>' + statusChip(p.pick) + '</td>' +
        '<td class="m4act">' + (p.pick.status === 'ok' ? '<button type="button" class="btn sm" data-m4="onmap" data-v="' + esc(p.code) + '">' + esc(t('m4.act.map')) + '</button>' : '') +
        '<button type="button" class="btn sm" data-m4="simA" data-v="' + esc(p.code) + '">' + esc(t('m4.act.sim')) + '</button></td></tr>';
      if (open) tr += '<tr class="m4det"><td></td><td colspan="8"><div class="m4dgrid"><div><div class="m4dh">' + esc(t('m4.det.products', { code: p.code })) + '</div><div class="m4bars">' +
        prods.map(function (e) { return '<div class="m4bar"><span><span class="code">' + esc(e[0]) + '</span><span class="sub2"> ' + esc(prodName(e[0])) + '</span></span><span class="m4bt"><i style="width:' + Math.max(4, e[1] / p.n * 100) + '%"></i></span><b>' + nf(e[1]) + '</b></div>'; }).join('') + '</div></div>' +
        '<div><div class="m4dh">' + esc(t('m4.det.bins')) + '</div>' + (bins.length ? '<ul class="m4binl">' + bins.map(function (b) {
          var chosen = p.pick.status === 'ok' && b.bin === p.pick.bin;
          return '<li' + (chosen ? ' class="on"' : '') + '>' + locTag(b.bin) + '<span class="sub2">' + esc(b.loc.kind === 'rack' ? floorTxt(b.loc.floor) + ' · ' + t('m4.level', { n: b.loc.level }) : t('m4.binkind.' + b.loc.kind)) + ' · ' + esc(t('m4.stock', { n: nf(b.stock) })) + '</span>' + (chosen ? chip('info', t('m4.det.chosen')) : '') + '</li>';
        }).join('') + '</ul>' : '<p class="sub">' + esc(t('m4.loc.noloc')) + '</p>') + '</div></div></td></tr>';
      return tr;
    }).join('');
    return '<section class="panel m4card" id="m4parts"><div class="chd"><div class="chd-l"><h2>' + esc(t('m4.parts.title')) + ' <span class="chip info">' + nf(rows.length) + '</span></h2><p class="sub">' + esc(t('m4.parts.sub2')) + '</p></div></div>' +
      '<div class="m4ptool"><input id="m4q" type="search" placeholder="' + esc(t('m4.q.part')) + '" value="' + esc(S.q) + '" aria-label="' + esc(t('m4.q.part')) + '"><span class="sub2">' + esc(t('m4.q.note')) + '</span><span class="grow"></span><span class="sub2">' + esc(t('m4.sort')) + '</span>' + seg([['plan', t('m4.col.plan')], ['route', t('m4.col.route')]], S.sort, 'sort') + '</div>' +
      (rows.length ? '<div class="tablebox m4tb"><table class="m4pt"><thead><tr><th class="num">#</th><th>' + esc(t('m4.col.part')) + '</th><th class="num">' + esc(t('m4.col.plan')) + '</th><th class="num">' + esc(t('m4.col.route')) + '</th><th class="num">' + esc(t('m4.col.prods')) + '</th><th>' + esc(t('m4.col.bins')) + '</th><th>' + esc(t('m4.col.chosen')) + '</th><th>' + esc(t('m4.col.status')) + '</th><th></th></tr></thead><tbody>' + body + '</tbody></table></div>' +
        (rows.length > S.partsMax ? '<div class="m4more"><span class="sub2">' + esc(t('m4.more', { n: S.partsMax, t: rows.length })) + '</span><button type="button" class="btn sm" data-m4="more">' + esc(t('m4.more.btn')) + '</button></div>' : '')
        : '<p class="empty-note">' + esc(t(S.q ? 'm4.none.q' : 'm4.none')) + '</p>') + '</section>';
  }
  function prodStatus(p) {
    if (p.status === 'plant') return chip('warn', t('m4.ps.plant'));
    if (p.status === 'nobom' || p.status === 'noparts') return chip('warn', t('m4.ps.nobom'));
    if (p.status === 'partial') return chip('warn', t('m4.ps.partial', { n: p.parts - p.routedParts }));
    return chip('ok', t('m4.ps.ok'));
  }
  function plantCell(p) {
    if (p.status === 'plant') return '<select class="m4psel" data-prod="' + esc(p.product) + '" aria-label="' + esc(t('m4.ps.choose')) + '"><option value="">' + esc(t('m4.ps.choose')) + '</option>' + p.plants.map(function (x) { return '<option>' + esc(x) + '</option>'; }).join('') + '</select>';
    return esc(p.plant || '–') + (p.how === 'user' ? ' ' + chip('info', t('m4.ps.own')) : '');
  }
  function prodsTable() {
    var B = S.base, order = { plant: 0, nobom: 1, noparts: 1, partial: 2, ok: 3 }, rows = B.products.slice().sort(function (a, b) { return (order[a.status] - order[b.status]) || b.rounds - a.rounds; });
    var cnt = { ok: 0, partial: 0, plant: 0, nobom: 0 }; rows.forEach(function (p) { var k = p.status === 'noparts' ? 'nobom' : p.status; cnt[k] = (cnt[k] || 0) + 1; });
    var body = rows.slice(0, 200).map(function (p) {
      var on = S.prodView === p.product, ok = p.status === 'ok' || p.status === 'partial';
      return '<tr class="m4r' + (on ? ' open' : '') + '"' + (ok ? ' data-m4="prod" data-v="' + esc(p.product) + '" tabindex="0"' : '') + '><td class="m4pn"><span class="code">' + esc(p.product) + '</span><div class="sub2">' + esc(prodName(p.product) || '–') + '</div></td>' +
        '<td class="num">' + nf(p.rounds) + '</td><td>' + plantCell(p) + '</td><td class="num">' + (ok ? nf(p.parts) : '–') + '</td>' +
        '<td class="num">' + (ok ? (p.routedParts === p.parts ? nf(p.routedParts) + '/' + nf(p.parts) : '<b class="m4lo">' + nf(p.routedParts) + '/' + nf(p.parts) + '</b>') : '–') + '</td>' +
        '<td class="num">' + (p.status === 'ok' && p.complete ? mm(p.m / p.complete) : '–') + '</td><td>' + prodStatus(p) + '</td></tr>';
    }).join('');
    return '<section class="panel m4card" id="m4prodt"><div class="chd"><div class="chd-l"><h2>' + esc(t('m4.prods.title2')) + ' <span class="chip info">' + nf(rows.length) + '</span></h2><p class="sub">' + esc(t('m4.prods.sub3')) + '</p></div></div>' +
      '<div class="m4psum">' + chip('ok', t('m4.ps.ok') + ' ' + cnt.ok) + chip('warn', t('m4.ps.partial0') + ' ' + cnt.partial) + chip('warn', t('m4.ps.plant') + ' ' + cnt.plant) + (cnt.nobom ? chip('warn', t('m4.ps.nobom') + ' ' + cnt.nobom) : '') + '</div>' +
      (rows.length ? '<div class="tablebox m4tb"><table><thead><tr><th>' + esc(t('m4.col.product')) + '</th><th class="num">JOB</th><th>Plant</th><th class="num">' + esc(t('m4.col.parts')) + '</th><th class="num">' + esc(t('m4.col.found')) + '</th><th class="num">' + esc(t('m4.col.per')) + '</th><th>' + esc(t('m4.col.status')) + '</th></tr></thead><tbody>' + body + '</tbody></table></div>' +
        (rows.length > 200 ? '<p class="sub">' + esc(t('m4.more', { n: 200, t: rows.length })) + '</p>' : '') : '<p class="empty-note">' + esc(t('m4.none')) + '</p>') +
      (S.prodView ? prodView() : '') + '</section>';
  }
  function prodView() {
    var B = S.base, P = B.products.filter(function (x) { return x.product === S.prodView; })[0]; if (!P) return '';
    var codes = PWH.freq.partsOf(S.d, P.product, P.plant), pmap = new Map(); B.parts.forEach(function (p) { pmap.set(p.code, p); });
    var list = codes.map(function (c) { return pmap.get(c) || { code: c, name: partName(c), n: 0, nRoute: 0, products: new Map(), pick: PWH.freq.pickOf(S.d, c) }; });
    var off = list.filter(function (p) { return p.pick.status !== 'ok'; });
    var rl = P.rlist, ri = Math.min(S.prodRound, rl.length - 1), rr = rl[ri];
    return '<div class="m4pv" id="m4pv"><div class="m4pvh"><div><h3>' + esc(t('m4.pv.title', { p: P.product })) + '</h3><p class="sub">' + esc(prodName(P.product)) + ' · Plant ' + esc(P.plant) + '</p></div><button type="button" class="btn sm" data-m4="prod" data-v="' + esc(P.product) + '">' + esc(t('m4.close')) + '</button></div>' +
      '<div class="m4kpis">' +
      '<div class="m4k"><span class="k">' + esc(t('m4.pv.rounds')) + '</span><span class="v">' + nf(P.rounds) + '</span><span class="s">' + esc(t('m4.k.partial', { n: nf(P.rounds - P.complete) })) + '</span></div>' +
      '<div class="m4k"><span class="k">' + esc(t('m4.pv.parts')) + '</span><span class="v">' + nf(codes.length) + '</span><span class="s">' + esc(t('m4.pv.off', { n: off.length })) + '</span></div>' +
      '<div class="m4k"><span class="k">' + esc(t('m4.pv.per')) + '</span><span class="v">' + (P.complete ? mm(P.m / P.complete) : '–') + '</span><span class="s">' + esc(t('m4.pv.per_sub')) + '</span></div>' +
      '<div class="m4k"><span class="k">' + esc(t('m4.pv.total')) + '</span><span class="v">' + mm(P.m) + '</span><span class="s">' + esc(t('m4.pv.total_sub', { n: P.complete })) + '</span></div></div>' +
      '<div class="m4pvg"><div class="tablebox m4tb"><table><thead><tr><th>' + esc(t('m4.col.part')) + '</th><th class="num">' + esc(t('m4.col.plan')) + '</th><th>' + esc(t('m4.col.chosen')) + '</th><th>' + esc(t('m4.col.status')) + '</th></tr></thead><tbody>' +
      list.map(function (p) { return '<tr><td class="m4pn"><span class="code">' + esc(p.code) + '</span><div class="sub2">' + esc(p.name || '–') + '</div></td><td class="num">' + nf(p.products.get(P.product) || 0) + '</td><td>' + (p.pick.status === 'ok' ? locTag(p.pick.bin) + ' <span class="sub2">' + esc(floorTxt(p.pick.floor)) + '</span>' : '–') + '</td><td>' + statusChip(p.pick) + '</td></tr>'; }).join('') + '</tbody></table></div>' +
      '<div class="m4map"><div class="m4mbar"><label class="m4f"><span>' + esc(t('m4.pv.round')) + '</span><select id="m4round">' + rl.map(function (r, i) { return '<option value="' + i + '"' + (i === ri ? ' selected' : '') + '>' + esc(fmtDate(r.date) + ' · ' + r.line + ' · JOB ' + r.job) + '</option>'; }).join('') + '</select></label><span class="m4mm">' + esc(t('m4.pv.route', { m: m(rr.byProd[P.product] ? rr.byProd[P.product].m : 0) })) + (rr.byProd[P.product] && !rr.byProd[P.product].complete ? ' · ' + esc(t('m4.partial_route')) : '') + '</span></div>' +
      routeBox('pv') + '</div></div></div>';
  }

  // ---------- heatmap ----------
  // one continuous colour ramp from 1 pick to the highest count in the range (no fixed steps)
  var HEAT = ['#2b6c9e', '#2a9d8f', '#8ab84a', '#f2b705', '#f0603a'], ZERO = '#4a5a74', NODATA = '#26324a';
  function breaks(max) { return Math.max(1, max); }
  function hex(c) { return [parseInt(c.substr(1, 2), 16), parseInt(c.substr(3, 2), 16), parseInt(c.substr(5, 2), 16)]; }
  function heatColor(n, max) {
    var k = max <= 1 ? 1 : Math.min(1, Math.max(0, (n - 1) / (max - 1))) * (HEAT.length - 1), i = Math.min(HEAT.length - 2, Math.floor(k)), f = k - i;
    var a = hex(HEAT[i]), b = hex(HEAT[i + 1]);
    return '#' + [0, 1, 2].map(function (j) { var v = Math.round(a[j] + (b[j] - a[j]) * f); return (v < 16 ? '0' : '') + v.toString(16); }).join('');
  }
  function legend(max) {
    return '<div class="m4hleg"><span class="m4hl"><i style="background:' + NODATA + '"></i>' + esc(t('m4.h.nodata')) + '</span><span class="m4hl"><i style="background:' + ZERO + '"></i>' + esc(t('m4.h.zero')) + '</span>' +
      '<span class="m4ramp"><b>1</b><i style="background:linear-gradient(90deg,' + HEAT.join(',') + ')"></i><b>' + nf(max) + '</b></span><span class="sub2">' + esc(t('m4.h.unit2', { n: nf(max) })) + '</span></div>';
  }
  function floorSeg() { return seg(S.d.L.floors.map(function (f, i) { return [String(i), floorTxt(f.id)]; }), String(S.hFloor), 'hfloor'); }
  function heatBox(id, title, br, withTools) {
    return '<div class="m4hroot" id="m4h-' + id + '"><div class="m2mapcard m4hbox" data-fsbox>' +
      '<div class="m4htool">' + (title ? '<b class="m4ht">' + esc(title) + '</b>' : '') + (withTools ? floorSeg() + '<input type="search" class="m4hq" data-hq="' + id + '" placeholder="' + esc(t('m4.h.q')) + '" value="' + esc(S.hq) + '" aria-label="' + esc(t('m4.h.q')) + '">' : '') +
      '<span class="grow"></span><button type="button" class="btn sm" data-m4="hz" data-k="' + id + '" data-v="out" aria-label="' + esc(t('m4.h.zout')) + '">−</button><button type="button" class="btn sm" data-m4="hz" data-k="' + id + '" data-v="in" aria-label="' + esc(t('m4.h.zin')) + '">+</button><button type="button" class="btn sm" data-m4="hz" data-k="' + id + '" data-v="fit">' + esc(t('m4.h.fit')) + '</button><button type="button" class="btn sm" data-m4="hfs" data-k="' + id + '">' + esc(t('m4.h.fs')) + '</button></div>' +
      '<div class="m4hbody"><div class="m2canvas" id="m2wrap"><canvas id="m2cv" tabindex="0" aria-label="' + esc(t('m4.h.title')) + '"></canvas><div id="m2tip" class="m2tip" hidden></div></div><aside class="m4hside" id="m4hs-' + id + '"></aside></div>' + legend(br) + '</div></div>';
  }
  function heatSection() {
    var B = S.base, max = 0; B.heat.forEach(function (h) { if (h.n > max) max = h.n; });
    S.slots = { f: { id: 'f', base: B, br: breaks(max) } };
    return '<section class="panel m4card"><div class="chd"><div class="chd-l"><h2>' + esc(t('m4.h.title')) + '</h2><p class="sub">' + esc(t('m4.h.sub', { n: nf(B.heatSum) })) + '</p></div></div>' + heatBox('f', '', S.slots.f.br, true) + '</section>';
  }
  function heatSide(slot) {
    var el = $('#m4hs-' + slot.id); if (!el) return;
    var rid = S.hSel[slot.id];
    if (!rid) { el.innerHTML = '<p class="sub m4hhint">' + esc(t('m4.h.hint')) + '</p>'; return; }
    var B = slot.base, h = B.heat.get(rid), rk = S.d.match.rackById.get(rid);
    var stored = [];   // Parts kept in this rack (Material-Location), so a rack with 0 picks still shows what is there
    var occ = S.d.match.occ.get(rid) || {}; Object.keys(occ).forEach(function (lv) { occ[lv].forEach(function (b) { b.items.forEach(function (it) { stored.push({ bin: b.bin, level: +lv, code: it.mat }); }); }); });
    var pmap = new Map(); B.parts.forEach(function (p) { pmap.set(p.code, p); });
    var rows = [];
    if (h) h.bins.forEach(function (b) { b.parts.forEach(function (n, code) { rows.push({ bin: b.bin, level: b.level, code: code, n: n }); }); });
    rows.sort(function (a, b) { return b.n - a.n || (a.bin < b.bin ? -1 : 1); });
    var html = '<div class="m4hsh"><h3>' + esc(t('m4.h.rack', { r: rid })) + '</h3><p class="sub2">' + esc(rk ? floorTxt(rk.floor) + ' · ' + t('m4.h.levels', { n: rk.levels }) : '') + '</p>' +
      '<p class="m4hsn"><b>' + nf(h ? h.n : 0) + '</b> ' + esc(t('m4.h.times')) + '</p></div>';
    if (rows.length) html += '<ul class="m4hlist">' + rows.map(function (r) {
      var p = pmap.get(r.code), prods = p ? Array.from(p.products.entries()).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 3) : [];
      return '<li><div class="m4hl1"><span class="code">' + esc(r.code) + '</span><b>' + nf(r.n) + '</b></div><div class="sub2">' + esc(partName(r.code) || '–') + '</div>' +
        '<div class="m4hl2">' + locTag(r.bin) + '<span class="sub2">' + esc(t('m4.level', { n: r.level })) + '</span></div>' +
        (prods.length ? '<div class="sub2">' + esc(t('m4.h.prods')) + ' ' + prods.map(function (e) { return esc(e[0]) + ' (' + e[1] + ')'; }).join(', ') + '</div>' : '') +
        (slot.id === 'f' ? '<div class="m4hl3"><button type="button" class="btn sm" data-m4="gopart" data-v="' + esc(r.code) + '">' + esc(t('m4.act.part')) + '</button><button type="button" class="btn sm" data-m4="simA" data-v="' + esc(r.code) + '">' + esc(t('m4.act.sim')) + '</button><button type="button" class="btn sm" data-m4="gorecs">' + esc(t('m4.act.recs')) + '</button></div>' : '') + '</li>';
    }).join('') + '</ul>';
    var idle = stored.filter(function (s) { return !rows.some(function (r) { return r.code === s.code && r.bin === s.bin; }); });
    if (idle.length) html += '<details class="m4idle"' + (rows.length ? '' : ' open') + '><summary>' + esc(t('m4.h.idle', { n: idle.length })) + '</summary><ul class="m4hlist">' + idle.map(function (s) { return '<li><div class="m4hl1"><span class="code">' + esc(s.code) + '</span><b>0</b></div><div class="sub2">' + esc(partName(s.code) || '–') + '</div><div class="m4hl2">' + locTag(s.bin) + '<span class="sub2">' + esc(t('m4.level', { n: s.level })) + '</span></div></li>'; }).join('') + '</ul></details>';
    if (!rows.length && !idle.length) html += '<p class="sub">' + esc(t('m4.h.empty')) + '</p>';
    el.innerHTML = html;
  }
  function heatMatches(q) {
    q = String(q || '').trim().toUpperCase(); if (!q) return null;
    var set = new Set();
    S.d.match.rackById.forEach(function (r, id) { if (id.toUpperCase().indexOf(q) === 0) set.add(id); });
    S.d.bins.forEach(function (bins, code) { if (code.toUpperCase().indexOf(q) >= 0) bins.forEach(function (b) { var bi = PWH.layout.binInfo(b.bin); if (bi && S.d.match.rackById.has(bi.rack)) set.add(bi.rack); }); });
    return set;
  }
  function mountHeat(slot) {
    var root = $('#m4h-' + slot.id); if (!root || !S.d.L) return;
    var K = S.kits[slot.id] || (S.kits[slot.id] = PWH.mapKit('pwh-m4h'));
    K.M.root = root; K.M.canvas = null; K.M.layout = S.d.L; K.M.match = S.d.match; K.M.names = true; K.M.mode = '2d'; K.M.noDim = true; K.M.noNums = true;
    K.M.floor = Math.min(S.hFloor, S.d.L.floors.length - 1); K.M.sel = S.hSel[slot.id] || null; K.M.focus = null; K.M.hl = heatMatches(S.hq);
    K.M.rackTint = function (r) { var h = slot.base.heat.get(r.id); return h && h.n > 0 ? heatColor(h.n, slot.br) : S.d.rackData.has(r.id) ? ZERO : NODATA; };
    K.M.onSelect = function (id) { S.hSel[slot.id] = id; heatSide(slot); };
    K.M.overlay = function (c, Pj, f) {   // frequency number on each rack with picks
      c.save(); c.font = '600 11px "IBM Plex Sans Thai", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      slot.base.heat.forEach(function (h, rid) {
        var r = S.d.match.rackById.get(rid); if (!r || r.floor !== f.id || !h.n) return;
        var a = Pj(r.x, r.y, 0), b = Pj(r.x + r.w, r.y + r.h, 0); if (Math.abs(b[0] - a[0]) < 16 || Math.abs(b[1] - a[1]) < 11) return;
        c.fillStyle = '#0b1220'; c.fillText(String(h.n), (a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
      });
      c.restore();
    };
    K.wireMap(); K.resize(); K.fit(); K.draw();
    heatSide(slot);
  }

  // ---------- data problems ----------
  function issueGroups() {
    var B = S.base, by = {};
    B.issues.forEach(function (x) { (by[x.why] = by[x.why] || []).push(x); });
    var order = ['nojob', 'noproduct', 'plant', 'nobom', 'noparts', 'loc_noloc', 'loc_notonlayout', 'loc_unreach', 'loc_special'];
    return order.filter(function (k) { return by[k]; }).map(function (k) { return { why: k, items: by[k] }; });
  }
  function issuesCard() {
    var gs = issueGroups(); if (!gs.length) return '';
    var html = '<section class="panel m4card" id="m4iss"><div class="chd"><div class="chd-l"><h2>' + esc(t('m4.bad.title')) + '</h2><p class="sub">' + esc(t('m4.bad.sub2')) + '</p></div></div>';
    gs.forEach(function (gp) {
      var part = gp.why.indexOf('loc_') === 0, list = gp.items;
      html += '<details class="m4bad"><summary><span class="chip warn">' + nf(list.length) + '</span> ' + esc(t('m4.iss.' + gp.why)) + '</summary><div class="tablebox m4tb">' + (part
        ? '<table><thead><tr><th>' + esc(t('m4.col.part')) + '</th><th class="num">' + esc(t('m4.col.plan')) + '</th><th>' + esc(t('m4.col.bins')) + '</th><th>' + esc(t('m4.col.product')) + '</th></tr></thead><tbody>' +
          list.slice(0, 300).map(function (p) { return '<tr><td class="m4pn"><span class="code">' + esc(p.part) + '</span><div class="sub2">' + esc(p.name || '–') + '</div></td><td class="num">' + nf(p.n) + '</td><td>' + esc(p.bins.join(', ') || '–') + '</td><td class="m4wrap">' + esc(p.products.slice(0, 6).join(', ')) + (p.products.length > 6 ? ' …' : '') + '</td></tr>'; }).join('')
        : '<table><thead><tr><th>' + esc(t('m4.col.date')) + '</th><th>U-line</th><th>JOB</th><th>' + esc(t('m4.col.product')) + '</th><th>' + esc(t('m4.col.file')) + '</th></tr></thead><tbody>' +
          list.slice(0, 300).map(function (x) { return '<tr><td>' + esc(fmtDate(x.date)) + '</td><td>' + esc(x.line || '–') + '</td><td class="code">' + esc(x.job || '–') + '</td><td><span class="code">' + esc(x.product || '–') + '</span>' + (x.plants ? '<div class="sub2">Plant ' + esc(x.plants.join(' / ')) + '</div>' : '') + '</td><td class="m4wrap sub2">' + esc(x.file) + (x.row ? ' · ' + esc(t('m4.row', { n: x.row })) : '') + '</td></tr>'; }).join('')) +
        '</tbody></table></div>' + (list.length > 300 ? '<p class="sub">' + esc(t('m4.more', { n: 300, t: list.length })) + '</p>' : '') + '</details>';
    });
    return html + '</section>';
  }
  function freqTab() {
    var B = S.base;
    if (!B.rounds.length) return '<section class="panel"><p class="empty-note">' + esc(t(S.product ? 'm4.empty.product' : 'm4.empty.range')) + '</p></section>' + issuesCard();
    return kpis() + heatSection() + partsTable() + prodsTable() + issuesCard();
  }

  // ---------- 2. swap advice ----------
  function ruleBlock(rules) {
    if (rules && rules.length) return '<div class="m4rule bad">' + chip('error', t('m4.rule.fail')) + '<ul>' + rules.map(function (x) { return '<li>' + esc(PWH.rules.reasonText(x)) + '</li>'; }).join('') + '</ul></div>';
    return '<div class="m4rule">' + chip('ok', '✓ ' + t('m4.rule.ok')) + '<span class="sub2">' + esc(t('m4.rule.nosize')) + '</span></div>';
  }
  function sideHtml(p, tag) {
    return '<div class="m4sw ' + tag + '"><span class="m4tag">' + tag.toUpperCase() + '</span><div class="m4swb"><span class="code">' + esc(p.code) + '</span><div class="sub2">' + esc(p.name || partName(p.code) || '–') + '</div>' +
      '<div class="m4swl">' + locTag(p.pick.bin) + '<span class="sub2">' + esc(floorTxt(p.pick.floor)) + ' · ' + esc(t('m4.times', { n: nf(p.n || 0) })) + '</span></div></div></div>';
  }
  function pairHtml(a, b) { return '<div class="m4pair">' + sideHtml(a, 'a') + '<span class="m4x" aria-hidden="true">⇄</span>' + sideHtml(b, 'b') + '</div>'; }
  function prodList(list, up) {
    if (!list.length) return '<span class="sub2">–</span>';
    return list.slice(0, 6).map(function (x) { return '<span class="m4pd' + (up ? ' up' : '') + '"><span class="code">' + esc(x.product) + '</span> ' + (up ? '+' : '−') + m(Math.abs(x.after - x.before)) + '</span>'; }).join('') + (list.length > 6 ? '<span class="sub2">' + esc(t('m4.andmore', { n: list.length - 6 })) + '</span>' : '');
  }
  function barsHtml(byProd) {
    if (!byProd.length) return '<p class="sub">' + esc(t('m4.det.noprod')) + '</p>';
    var max = Math.max.apply(null, byProd.map(function (x) { return Math.max(x.before, x.after); }).concat([1]));
    return '<div class="m4cmp"><div class="m4dh">' + esc(t('m4.cmp.title')) + '</div>' + byProd.slice(0, 14).map(function (x) {
      var up = x.after > x.before;
      return '<div class="m4cr"><span class="code">' + esc(x.product) + '</span><div class="m4cb"><i class="b" style="width:' + (x.before / max * 100) + '%"></i><i class="a' + (up ? ' up' : '') + '" style="width:' + (x.after / max * 100) + '%"></i></div><span class="m4cv' + (up ? ' up' : '') + '">' + m(x.before) + ' → ' + m(x.after) + ' ' + esc(t('m4.unit')) + ' (' + (up ? '+' : '−') + m(Math.abs(x.after - x.before)) + ')</span></div>';
    }).join('') + '<div class="m4leg"><span><i class="b"></i>' + esc(t('m4.before')) + '</span><span><i class="a"></i>' + esc(t('m4.after')) + '</span><span><i class="a up"></i>' + esc(t('m4.worse')) + '</span></div></div>';
  }
  function recsTab() {
    var R = S.recs, B = S.base;
    var scope = '<div class="m4note">' + esc(t('m4.recs.scope', { c: nf(B.complete.length), n: nf(B.rounds.length), x: nf(B.rounds.length - B.complete.length) })) + (S.product ? ' ' + esc(t('m4.recs.only', { p: S.product })) : ' ' + esc(t('m4.recs.all'))) + '</div>';
    if (!R) return scope + '<section class="panel"><p class="empty-note">' + esc(t('m4.busy.recs')) + '</p></section>';
    if (!R.list.length) return scope + '<section class="panel"><h2>' + esc(t('m4.norec.title')) + '</h2><p>' + esc(t('m4.norec.' + (R.why || 'nogain'), { c: nf(R.candidates), f: nf(R.failed), n: nf(R.tried) })) + '</p></section>';
    var sum = R.list.reduce(function (s, r) { return s + r.save; }, 0);
    var head = scope + '<div class="m4note">' + esc(t('m4.recs.head2', { n: R.list.length, m: m(sum) })) + '</div>';
    return head + R.list.map(function (r, i) {
      var open = S.recOpen === i, sim = r.sim, topA = Array.from(r.a.products.entries()).sort(function (x, y) { return y[1] - x[1]; }).slice(0, 2);
      var inSim = S.sim.some(function (s) { return s.a.code === r.a.code && s.b.code === r.b.code; });
      var reason = t('m4.recs.reason2', { a: r.a.code, na: nf(r.a.n), prods: topA.map(function (e) { return e[0] + ' (' + e[1] + ')'; }).join(', ') || '–', ca: m(r.a.c), b: r.b.code, nb: nf(r.b.n), cb: m(r.b.c) });
      return '<section class="panel m4rec' + (open ? ' open' : '') + '"><div class="m4rh"><span class="m4no">' + (i + 1) + '</span>' + pairHtml(r.a, r.b) +
        '<div class="m4gain"><b>−' + mm(r.save) + '</b><span>' + esc(pct(r.pct)) + '</span></div></div>' +
        '<p class="m4why">' + esc(reason) + '</p>' + ruleBlock(r.rules) +
        '<dl class="m4facts"><div><dt>' + esc(t('m4.before')) + '</dt><dd>' + mm(r.before) + '</dd></div><div><dt>' + esc(t('m4.after')) + '</dt><dd>' + mm(r.after) + '</dd></div><div><dt>' + esc(t('m4.diff')) + '</dt><dd class="good">' + diffTxt(r.before, r.after) + ' (' + pct(r.pct) + ')</dd></div>' +
        '<div><dt>' + esc(t('m4.recs.used')) + '</dt><dd>' + esc(t('m4.recs.used_v', { u: nf(sim.roundsUsed), x: nf(sim.roundsOut) })) + '</dd></div></dl>' +
        '<div class="m4pl"><div><span class="sub2">' + esc(t('m4.recs.better', { n: sim.better.length })) + '</span><div class="m4pds">' + prodList(sim.better, false) + '</div></div><div><span class="sub2">' + esc(t('m4.recs.worse', { n: sim.worse.length })) + '</span><div class="m4pds">' + prodList(sim.worse, true) + '</div></div></div>' +
        '<div class="m4acts"><button type="button" class="btn sm" data-m4="ropen" data-v="' + i + '" aria-expanded="' + open + '">' + esc(t(open ? 'm4.btn.hide' : 'm4.btn.detail')) + '</button><button type="button" class="btn sm' + (inSim ? '' : ' primary') + '" data-m4="tosim" data-v="' + i + '">' + esc(t(inSim ? 'm4.btn.opensim' : 'm4.btn.tosim2')) + '</button></div>' +
        (open ? '<div class="m4detail">' + barsHtml(sim.byProd) + routePicker('r', sim.byProd) + '</div>' : '') + '</section>';
    }).join('');
  }

  // ---------- route map (one Product, one round, before or after) ----------
  function routePicker(kind, byProd) {
    var list = byProd.map(function (x) { return x.product; }).slice(0, 20); if (!list.length || !S.d.L) return '';
    var v = S.view && S.view.kind === kind ? S.view : (S.view = { kind: kind, prod: list[0], mode: 'after' });
    if (list.indexOf(v.prod) < 0) v.prod = list[0];
    return '<div class="m4map"><div class="m4mbar"><label class="m4f"><span>' + esc(t('m4.map.product')) + '</span><select id="m4rprod">' + list.map(function (p) { return '<option' + (p === v.prod ? ' selected' : '') + '>' + esc(p) + '</option>'; }).join('') + '</select></label>' +
      seg([['before', t('m4.before')], ['after', t('m4.after')]], v.mode, 'mode') + '<span class="m4mm" id="m4mm"></span></div><p class="sub2">' + esc(t('m4.map.scope')) + '</p>' + routeBox(kind) + '</div>';
  }
  function routeBox(kind) { return '<div class="m4mapbox m2mapcard" data-fsbox id="m4rb-' + kind + '"><div class="m2canvas" id="m2wrap"><canvas id="m2cv" tabindex="0" aria-label="' + esc(t('m4.map.aria')) + '"></canvas><div id="m2tip" class="m2tip" hidden></div></div></div>'; }
  function routeOf(prod, plant, ov) {
    var codes = PWH.freq.partsOf(S.d, prod, plant), items = [];
    codes.forEach(function (code) { var pk = PWH.freq.pickOf(S.d, code, ov); if (pk.status === 'ok') items.push({ key: code, cands: [{ bin: pk.bin, rack: pk.rack, level: pk.level, floor: pk.floor, stock: 1 }] }); });
    return items.length ? PWH.route.plan(S.d.L, items) : null;
  }
  function drawRoute(kind) {
    var box = $('#m4rb-' + kind); if (!box) return;
    var prod, plant, ov = null, hot = {}, pairs = [];
    if (kind === 'pv') { prod = S.prodView; }
    else {
      prod = S.view && S.view.prod;
      pairs = kind === 'r' ? [S.recs.list[S.recOpen]] : (S.simRes ? S.simRes.pairs : []);
      if (S.view.mode === 'after') ov = kind === 'r' ? S.recs.list[S.recOpen].sim.ov : S.simRes.ov;
    }
    var P = S.base.products.filter(function (x) { return x.product === prod; })[0]; if (!P) return; plant = P.plant;
    var res = routeOf(prod, plant, ov);
    var mmEl = $('#m4mm'); if (mmEl && kind !== 'pv') mmEl.textContent = res ? t('m4.map.dist2', { m: m(res.total), p: prod }) : '';
    pairs.forEach(function (s) {
      var after = S.view && S.view.mode === 'after';
      var aR = after ? s.b.pick : s.a.pick, bR = after ? s.a.pick : s.b.pick;
      hot[aR.rack] = { tag: 'A', code: s.a.code, col: '#f2b705' }; hot[bR.rack] = { tag: 'B', code: s.b.code, col: '#22d3ee' };
    });
    var K = S.kits['r-' + kind] || (S.kits['r-' + kind] = PWH.mapKit('pwh-m4r'));
    K.M.root = box; K.M.canvas = null; K.M.layout = S.d.L; K.M.match = S.d.match; K.M.names = true; K.M.focus = null; K.M.rackTint = null; K.M.onSelect = function () {};
    var fl = res && res.legs.length ? res.legs[0].floor : S.d.L.floors[0].id, hotFloor = null;
    Object.keys(hot).forEach(function (r) { var rk = S.d.match.rackById.get(r); if (rk && !hotFloor) hotFloor = rk.floor; });
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
        c.fillStyle = h.col + '66'; c.fill(); c.lineWidth = 2.5; c.strokeStyle = h.col; c.stroke(); c.restore();
        var q = Pj(r.x + r.w / 2, r.y + r.h / 2, H), txt = h.tag + ' · ' + h.code;
        c.font = '600 12px "IBM Plex Mono", monospace'; var w = c.measureText(txt).width + 14;
        c.fillStyle = h.col; c.beginPath(); if (c.roundRect) c.roundRect(q[0] - w / 2, q[1] - 30, w, 20, 10); else c.rect(q[0] - w / 2, q[1] - 30, w, 20); c.fill();
        c.fillStyle = '#060d19'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(txt, q[0], q[1] - 20);
      });
    };
    K.wireMap(); K.resize(); K.fit(); K.draw();
  }

  // ---------- 3. simulation ----------
  function partObj(code, bin) {
    var f = S.base && S.base.parts.filter(function (p) { return p.code === code; })[0];
    var pick = bin ? PWH.freq.pointOf(S.d, bin) : (f ? f.pick : PWH.freq.pickOf(S.d, code));
    return { code: code, name: partName(code), n: f ? f.nRoute : 0, products: f ? f.products : new Map(), pick: pick };
  }
  function binOpts(code, cur) {
    var bins = (S.d.bins.get(code) || []).filter(function (b) { var p = PWH.freq.pointOf(S.d, b.bin); return p.status === 'ok'; });
    var auto = PWH.freq.pickOf(S.d, code);
    if (!bins.length) return '<option value="">' + esc(t('m4.sim.nobin')) + '</option>';
    return bins.map(function (b) { var p = PWH.freq.pointOf(S.d, b.bin); return '<option value="' + esc(b.bin) + '"' + ((cur ? cur === b.bin : auto.bin === b.bin) ? ' selected' : '') + '>' + esc(b.bin + ' · ' + floorTxt(p.floor) + ' · ' + t('m4.stock', { n: nf(b.stock) }) + (auto.bin === b.bin ? ' · ' + t('m4.sim.used') : '')) + '</option>'; }).join('');
  }
  function simTab() {
    var B = S.base, F = S.form, used = B.parts.filter(function (p) { return p.pick.status === 'ok'; });
    var form = '<section class="panel"><div class="chd"><div class="chd-l"><h2>' + esc(t('m4.sim.title')) + '</h2><p class="sub">' + esc(t('m4.sim.sub2')) + '</p></div></div>' +
      '<form class="m4simf" id="m4add" autocomplete="off">' +
      '<fieldset><legend>Part A</legend><label class="m4f"><span>' + esc(t('m4.col.part')) + '</span><input id="m4a" list="m4pl" value="' + esc(F.a) + '" placeholder="' + esc(t('m4.sim.ph')) + '" required></label><label class="m4f"><span>' + esc(t('m4.sim.bin')) + '</span><select id="m4ab">' + (F.a && S.d.bins.has(F.a) ? binOpts(F.a, F.ab) : '<option value="">' + esc(t('m4.sim.pickfirst')) + '</option>') + '</select></label></fieldset>' +
      '<span class="m4x" aria-hidden="true">⇄</span>' +
      '<fieldset><legend>Part B</legend><label class="m4f"><span>' + esc(t('m4.col.part')) + '</span><input id="m4b" list="m4all" value="' + esc(F.b) + '" placeholder="' + esc(t('m4.sim.ph')) + '" required></label><label class="m4f"><span>' + esc(t('m4.sim.bin')) + '</span><select id="m4bb">' + (F.b && S.d.bins.has(F.b) ? binOpts(F.b, F.bb) : '<option value="">' + esc(t('m4.sim.pickfirst')) + '</option>') + '</select></label></fieldset>' +
      '<button class="btn" type="submit">' + esc(t('m4.sim.add')) + '</button></form>' +
      '<datalist id="m4pl">' + used.slice(0, 1500).map(function (p) { return '<option value="' + esc(p.code) + '">' + esc(p.pick.bin + ' · ' + p.nRoute) + '</option>'; }).join('') + '</datalist>' +
      '<datalist id="m4all">' + Array.from(S.d.bins.keys()).slice(0, 4000).map(function (c) { return '<option value="' + esc(c) + '">'; }).join('') + '</datalist>' +
      (S.simMsg ? '<div class="msg bad" role="status"><span>' + esc(S.simMsg) + '</span></div>' : '');
    if (S.sim.length) {
      form += '<div class="m4pairs">' + S.sim.map(function (s, i) { return '<div class="m4pr">' + pairHtml(s.a, s.b) + ruleBlock(s.rules) + '<button type="button" class="btn sm danger" data-m4="simdel" data-v="' + i + '">' + esc(t('m4.sim.del')) + '</button></div>'; }).join('') + '</div>';
    } else form += '<p class="empty-note">' + esc(t('m4.sim.empty')) + '</p>';
    var bad = S.sim.some(function (s) { return s.rules.length; });
    form += '<div class="m4acts"><button type="button" class="btn primary" data-m4="simrun"' + (!S.sim.length || bad ? ' disabled' : '') + '>' + esc(t('m4.sim.run2')) + '</button><button type="button" class="btn" data-m4="simclear"' + (S.sim.length || S.simRes ? '' : ' disabled') + '>' + esc(t('m4.sim.reset')) + '</button>' + (bad ? '<span class="sub2">' + esc(t('m4.sim.blocked')) + '</span>' : '') + '</div></section>';
    var R = S.simRes;
    if (R) form += simResult(R);
    return form;
  }
  function simResult(R) {
    var down = R.save >= 0;
    var html = '<section class="panel"><div class="chd"><div class="chd-l"><h2>' + esc(t('m4.sim.result')) + '</h2><p class="sub">' + esc(t('m4.sim.result_sub2', { u: nf(R.roundsUsed), x: nf(R.roundsOut) })) + (S.product ? ' ' + esc(t('m4.recs.only', { p: S.product })) : '') + '</p></div></div><div class="m4kpis">' +
      '<div class="m4k"><span class="k">' + esc(t('m4.before')) + '</span><span class="v">' + mm(R.before) + '</span></div>' +
      '<div class="m4k"><span class="k">' + esc(t('m4.after')) + '</span><span class="v">' + mm(R.after) + '</span></div>' +
      '<div class="m4k ' + (Math.abs(R.save) < 0.5 ? '' : down ? 'good' : 'badv') + '"><span class="k">' + esc(t(Math.abs(R.save) < 0.5 ? 'm4.diff' : down ? 'm4.k.down' : 'm4.k.up')) + '</span><span class="v">' + mm(Math.abs(R.save)) + '</span><span class="s">' + (R.pct == null ? '—' : nf(Math.abs(R.pct), 1) + '%') + '</span></div>' +
      '<div class="m4k"><span class="k">' + esc(t('m4.k.used')) + '</span><span class="v">' + nf(R.roundsUsed) + '</span><span class="s">' + esc(t('m4.k.out', { n: nf(R.roundsOut) })) + '</span></div>' +
      '<div class="m4k"><span class="k">' + esc(t('m4.k.affected')) + '</span><span class="v">' + nf(R.byProd.length) + '</span><span class="s">' + esc(t('m4.k.updown', { a: R.better.length, b: R.worse.length })) + '</span></div></div>' +
      (R.lost.length ? '<div class="msg warn" role="status"><span>' + esc(t('m4.sim.lost', { n: R.lost.length })) + '</span></div>' : '') +
      (R.sameFreq ? '' : '<div class="msg bad" role="status"><span>' + esc(t('m4.err.freq')) + '</span></div>');
    if (R.byProd.length) {
      html += '<h3>' + esc(t('m4.sim.byprod')) + '</h3><div class="tablebox m4tb"><table><thead><tr><th>' + esc(t('m4.col.product')) + '</th><th class="num">' + esc(t('m4.col.rounds')) + '</th><th class="num">' + esc(t('m4.before')) + '</th><th class="num">' + esc(t('m4.after')) + '</th><th class="num">' + esc(t('m4.col.change')) + '</th><th class="num">%</th></tr></thead><tbody>' +
        R.byProd.map(function (x) { var up = x.after > x.before, on = S.simProd === x.product; return '<tr class="m4r' + (on ? ' open' : '') + '" data-m4="sprod" data-v="' + esc(x.product) + '" tabindex="0"><td><span class="code">' + esc(x.product) + '</span><div class="sub2">' + esc(prodName(x.product) || '–') + '</div></td><td class="num">' + nf(x.rounds) + '</td><td class="num">' + m(x.before) + '</td><td class="num">' + m(x.after) + '</td><td class="num ' + (up ? 'up' : 'good') + '">' + diffTxt(x.before, x.after) + '</td><td class="num">' + pct(x.before > 0 ? (x.before - x.after) / x.before * 100 : null) + '</td></tr>'; }).join('') + '</tbody></table></div>';
      if (S.simProd) html += routePair(R);
    } else html += '<p class="empty-note">' + esc(t('m4.sim.nochange')) + '</p>';
    // heatmaps before / after on one colour scale
    var max = 0; [S.base.heat, R.afterBase.heat].forEach(function (hm) { hm.forEach(function (h) { if (h.n > max) max = h.n; }); });
    var br = breaks(max);
    S.slots = { b: { id: 'b', base: S.base, br: br }, a: { id: 'a', base: R.afterBase, br: br } };
    html += '<h3>' + esc(t('m4.sim.heat')) + '</h3><p class="sub">' + esc(t('m4.sim.heat_sub', { b: nf(S.base.routeFreq), a: nf(R.afterBase.routeFreq) })) + '</p><div class="m4hfl">' + floorSeg() + '</div><div class="m4hpair">' + heatBox('b', t('m4.before'), br, false) + heatBox('a', t('m4.after'), br, false) + '</div>';
    return html + '</section>';
  }

  // ---------- simulation: before / after routes side by side, like the pick route page ----------
  function pairRoutes(R) {
    var P = S.base.products.filter(function (x) { return x.product === S.simProd; })[0]; if (!P || !P.plant) return null;
    if (S.rcache && S.rcache.key === S.simProd && S.rcache.R === R) return S.rcache;
    var out = { key: S.simProd, R: R, plant: P.plant, rounds: P.complete || P.rounds };
    ['before', 'after'].forEach(function (side) {
      var ov = side === 'after' ? R.ov : null, codes = PWH.freq.partsOf(S.d, P.product, P.plant), picks = {}, items = [];
      codes.forEach(function (c) { var pk = PWH.freq.pickOf(S.d, c, ov); picks[c] = pk; if (pk.status === 'ok') items.push({ key: c, cands: [{ bin: pk.bin, rack: pk.rack, level: pk.level, floor: pk.floor, stock: 1 }] }); });
      var res = items.length ? PWH.route.plan(S.d.L, items) : { order: [], legs: [], total: 0, unreachable: [] };
      var seq = {}, runs = [];
      res.order.forEach(function (o, i) { seq[o.key] = i + 1; var f = picks[o.key].floor, last = runs[runs.length - 1]; if (last && last.floor === f) last.n++; else runs.push({ floor: f, n: 1 }); });
      var cur = res.start ? res.start.floor : null, lifts = 0; runs.forEach(function (r) { if (cur && r.floor !== cur) lifts++; cur = r.floor; }); if (res.drop && cur !== res.drop.floor) lifts++;
      out[side] = { res: res, picks: picks, seq: seq, runs: runs, lifts: lifts, codes: codes, time: PWH.freq.timeOf(res.total || 0, res.order.length, lifts) };
    });
    S.rcache = out; return out;
  }
  function mins(sec) { return Math.max(1, Math.round(sec / 60)); }
  function flowLine(sd) {
    var res = sd.res; if (!res.start) return '';
    var h = [], cur = res.start.floor, df = res.drop.floor;
    function st(c, tx) { return '<span class="m3st ' + c + '"><i aria-hidden="true"></i>' + esc(tx) + '</span>'; }
    function lift(a, b) { return t(+fnum(b) > +fnum(a) ? 'm3.flow.up' : 'm3.flow.down'); }
    h.push(st('end', t('m2.mk.start')));
    sd.runs.forEach(function (r) { if (r.floor !== cur) h.push(st('lift', lift(cur, r.floor))); cur = r.floor; h.push(st('floor', t('m3.flow.step2', { n: fnum(r.floor), c: r.n }))); });
    if (cur !== df) h.push(st('lift', lift(cur, df)));
    h.push(st('end', t('m2.mk.drop')));
    return '<div class="m3flow m4flow" role="list" aria-label="' + esc(t('m3.flow.title')) + '">' + h.join('<span class="m3ln" aria-hidden="true"></span>') + '</div>';
  }
  function routeCard(side, sd, other) {
    var V = S.rp[side], fl = S.d.L.floors, fi = V.floor == null ? Math.max(0, fl.map(function (f) { return f.id; }).indexOf(sd.runs.length ? sd.runs[0].floor : fl[0].id)) : V.floor;
    V.floor = fi;
    var dm = sd.res.total - other.res.total, dt = sd.time.sec - other.time.sec;
    var delta = side === 'after' && (Math.abs(dm) >= 0.5) ? '<span class="m4dl ' + (dm < 0 ? 'good' : 'up') + '">' + esc(t(dm < 0 ? 'm4.down' : 'm4.up', { m: m(Math.abs(dm)) })) + ' · ' + esc(t(dt < 0 ? 'm4.tdown' : 'm4.tup', { n: Math.max(1, Math.round(Math.abs(dt) / 60)) })) + '</span>' : '';
    return '<div class="m4rp" id="m4rp-' + side + '"><div class="m2mapcard m4rpbox" data-fsbox>' +
      '<div class="m4rph"><b class="m4rpt">' + esc(t(side === 'before' ? 'm4.before' : 'm4.after')) + '</b>' +
      '<span class="m4rpk"><span class="k">' + esc(t('m3.kpi.dist')) + '</span><span class="v">' + mm(sd.res.total || 0) + '</span></span>' +
      '<span class="m4rpk" title="' + esc(t('m3.kpi.time_tip', { w: mins(sd.time.walk), n: sd.res.order.length, p: PWH.SIM.pick, l: sd.lifts, ls: PWH.SIM.lift, v: PWH.SIM.walk })) + '"><span class="k">' + esc(t('m4.simtime')) + '</span><span class="v">' + esc(t('m3.kpi.min', { n: mins(sd.time.sec) })) + '</span><span class="s">' + esc(t('m3.kpi.split', { w: mins(sd.time.walk), p: mins(sd.time.pick + sd.time.lift) })) + '</span></span>' + delta + '</div>' +
      flowLine(sd) +
      '<div class="m4htool">' + seg(fl.map(function (f, i) { return [String(i), floorTxt(f.id)]; }), String(fi), 'rfloor', ' data-k="' + side + '"') + seg([['2d', '2D'], ['3d', '3D']], V.mode, 'rmode', ' data-k="' + side + '"') +
      '<span class="grow"></span><button type="button" class="btn sm" data-m4="rz" data-k="' + side + '" data-v="out" aria-label="' + esc(t('m4.h.zout')) + '">−</button><button type="button" class="btn sm" data-m4="rz" data-k="' + side + '" data-v="in" aria-label="' + esc(t('m4.h.zin')) + '">+</button><button type="button" class="btn sm" data-m4="rz" data-k="' + side + '" data-v="fit">' + esc(t('m4.h.fit')) + '</button><button type="button" class="btn sm" data-m4="rfs" data-k="' + side + '">' + esc(t('m4.h.fs')) + '</button></div>' +
      '<div class="m2canvas" id="m2wrap"><canvas id="m2cv" tabindex="0" aria-label="' + esc(t('m4.map.aria')) + '"></canvas><div id="m2tip" class="m2tip" hidden></div></div></div></div>';
  }
  function routePair(R) {
    var X = pairRoutes(R); if (!X) return '';
    var list = R.byProd.map(function (x) { return x.product; });
    var html = '<h3>' + esc(t('m4.rp.title')) + '</h3><div class="m4mbar"><label class="m4f"><span>' + esc(t('m4.map.product')) + '</span><select id="m4sprod">' + list.map(function (p) { return '<option value="' + esc(p) + '"' + (p === S.simProd ? ' selected' : '') + '>' + esc(p + (prodName(p) ? ' · ' + prodName(p) : '')) + '</option>'; }).join('') + '</select></label><span class="sub2">' + esc(t('m4.rp.note', { n: X.rounds })) + '</span></div>' +
      '<div class="m4rpair">' + routeCard('before', X.before, X.after) + routeCard('after', X.after, X.before) + '</div>';
    // order of the picks before and after, A / B and changed rows marked
    var swapped = {}; R.pairs.forEach(function (s) { swapped[s.a.code] = 'A'; swapped[s.b.code] = 'B'; });
    var codes = X.before.codes.slice().sort(function (a, b) { return (X.after.seq[a] || 999) - (X.after.seq[b] || 999); });
    html += '<h3>' + esc(t('m4.rp.order')) + '</h3><div class="tablebox m4tb"><table class="m4ord"><thead><tr><th>' + esc(t('m4.col.part')) + '</th><th class="num">' + esc(t('m4.rp.seq_b')) + '</th><th>' + esc(t('m4.rp.bin_b')) + '</th><th class="num">' + esc(t('m4.rp.seq_a')) + '</th><th>' + esc(t('m4.rp.bin_a')) + '</th><th></th></tr></thead><tbody>' +
      codes.map(function (c) {
        var b = X.before.picks[c], a = X.after.picks[c], sb = X.before.seq[c], sa = X.after.seq[c], tag = swapped[c];
        var moved = b.bin !== a.bin, re = sb !== sa;
        var note = tag ? chip(tag === 'A' ? 'warn' : 'info', t('m4.rp.swapped', { t: tag })) : moved ? chip('info', t('m4.rp.moved')) : re ? chip('info', t('m4.rp.reorder')) : '';
        function binTxt(pk) { return pk.status === 'ok' ? locTag(pk.bin) + ' <span class="sub2">' + esc(floorTxt(pk.floor)) + '</span>' : chip('warn', t('m4.loc.' + pk.status)); }
        return '<tr class="' + (tag ? 'm4sw' + tag : re ? 'm4re' : '') + '"><td class="m4pn"><span class="code">' + esc(c) + '</span><div class="sub2">' + esc(partName(c) || '–') + '</div></td><td class="num">' + (sb || '–') + '</td><td>' + binTxt(b) + '</td><td class="num"><b>' + (sa || '–') + '</b></td><td>' + binTxt(a) + '</td><td>' + note + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    return html;
  }
  function drawPair(side) {
    var root = $('#m4rp-' + side), X = S.rcache; if (!root || !X) return;
    var sd = X[side], V = S.rp[side], res = sd.res;
    var K = S.kits['rp-' + side] || (S.kits['rp-' + side] = PWH.mapKit('pwh-m4rp'));
    K.M.root = root; K.M.canvas = null; K.M.layout = S.d.L; K.M.match = S.d.match; K.M.names = true; K.M.rackTint = null; K.M.noDim = false; K.M.noNums = true;
    K.M.mode = V.mode; K.M.floor = V.floor; K.M.sel = null; K.M.hl = null; K.M.onSelect = function () {};
    var racks = new Set(); res.order.forEach(function (o) { var pk = sd.picks[o.key]; if (pk.rack) racks.add(pk.rack); }); K.M.focus = racks;
    var swapped = {}; X.R.pairs.forEach(function (s) { swapped[s.a.code] = '#f2b705'; swapped[s.b.code] = '#22d3ee'; });
    K.M.overlay = function (c, Pj, f, o) {
      c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
      (res.legs || []).forEach(function (l) {
        if (l.floor !== f.id || l.pts.length < 2) return;
        c.beginPath(); l.pts.forEach(function (p, i) { var q = Pj(p[0], p[1], 0); if (i) c.lineTo(q[0], q[1]); else c.moveTo(q[0], q[1]); });
        c.strokeStyle = 'rgba(56,163,255,0.25)'; c.lineWidth = 8; c.stroke(); c.strokeStyle = '#38a3ff'; c.lineWidth = 2.4; c.stroke();
      });
      // numbered stops: grouped per rack so the badge reads e.g. "6,8,9"
      var byRack = {}; res.order.forEach(function (o, i) { var pk = sd.picks[o.key]; if (!pk.rack || pk.floor !== f.id) return; (byRack[pk.rack] = byRack[pk.rack] || []).push({ n: i + 1, code: o.key }); });
      c.font = '600 12px "IBM Plex Sans Thai", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      Object.keys(byRack).forEach(function (rid) {
        var r = S.d.match.rackById.get(rid); if (!r) return;
        var H = o.d3 ? r.levels * o.lp : 0, q = Pj(r.x + r.w / 2, r.y + r.h / 2, H), list = byRack[rid], txt = list.map(function (x) { return x.n; }).join(','), col = null;
        list.forEach(function (x) { if (swapped[x.code]) col = swapped[x.code]; });
        var w = Math.max(22, c.measureText(txt).width + 12);
        c.fillStyle = col || '#ffffff'; c.strokeStyle = col ? '#060d19' : '#38a3ff'; c.lineWidth = 2;
        c.beginPath(); if (c.roundRect) c.roundRect(q[0] - w / 2, q[1] - 11, w, 22, 11); else c.rect(q[0] - w / 2, q[1] - 11, w, 22); c.fill(); c.stroke();
        c.fillStyle = '#060d19'; c.fillText(txt, q[0], q[1] + 0.5);
      });
      c.restore();
    };
    K.wireMap(); K.resize(); K.fit(); K.draw();
  }

  // ---------- page ----------
  function render() {
    var R = S.root; if (!R) return;
    var d = S.d;
    var head = '<div class="ph"><div class="ph-l"><h1>' + esc(t('nav.m4')) + '</h1><p class="lede">' + esc(t('m4.intro2')) + '</p></div></div>';
    if (!d) { R.innerHTML = head + busyHtml() + (S.err ? '<div class="msg bad"><span>' + esc(t('m4.err.run', { e: S.err })) + '</span></div>' : ''); return; }
    var miss = []; ['daily', 'bom', 'matloc', 'layout'].forEach(function (k) { if (!d.have[k]) miss.push(t('m4.need.' + k)); });
    if (miss.length) { R.innerHTML = head + '<section class="panel"><h2>' + esc(t('m4.need.title')) + '</h2><p class="sub">' + esc(t('m4.need.list', { list: miss.join(', ') })) + '</p></section>'; return; }
    var note = d.have.monthly ? '' : '<div class="banner" style="margin:0 0 12px">' + esc(t('m4.warn.monthly')) + '</div>';
    var stale = S.stale ? '<div class="m3banner m4stale" role="status"><span>' + esc(t('m4.stale')) + '</span><button type="button" class="btn sm primary" data-m4="recalc">' + esc(t('m4.f.recalc')) + '</button></div>' : '';
    var err = S.err ? '<div class="msg bad" role="status"><span>' + esc(t('m4.err.run', { e: S.err })) + '</span><button type="button" class="btn sm" data-m4="recalc">' + esc(t('m4.retry')) + '</button></div>' : '';
    S.slots = null;
    var body = !S.base ? '' : S.tab === 'freq' ? freqTab() : S.tab === 'recs' ? recsTab() : simTab();
    var heldWin = window.scrollY;
    R.innerHTML = head + note + stale + toolbar() + scopeLine() + busyHtml() + err + '<div class="m4body' + (S.busy && S.base ? ' m4old' : '') + (S.stale ? ' m4old' : '') + '">' + body + '</div>';
    window.scrollTo(0, heldWin);
    wire();
    if (S.base && S.slots) Object.keys(S.slots).forEach(function (k) { if ($('#m4h-' + k)) mountHeat(S.slots[k]); });
    if ($('#m4rb-pv')) drawRoute('pv');
    if ($('#m4rb-r')) drawRoute('r');
    if ($('#m4rp-before')) { drawPair('before'); drawPair('after'); }
  }
  function wire() {
    var f1 = $('#m4from'), f2 = $('#m4to');
    function dates() { var a = f1.value, b = f2.value; if (!a || !b) return; if (b < a) { var x = a; a = b; b = x; } S.from = a; S.to = b; S.prodView = null; run(); }
    if (f1) f1.addEventListener('change', dates); if (f2) f2.addEventListener('change', dates);
    var pf = $('#m4prodf'); if (pf) pf.addEventListener('change', function () { var v = pf.value.trim(); if (v === S.product) return; S.product = v; S.prodView = null; run(); });
    var q = $('#m4q'); if (q) q.addEventListener('input', function () { S.q = q.value; var pos = q.selectionStart; var sec = $('#m4parts'); if (sec) { var tmp = document.createElement('div'); tmp.innerHTML = partsTable(); sec.replaceWith(tmp.firstChild); var q2 = $('#m4q'); q2.focus(); q2.setSelectionRange(pos, pos); wireQ(); } });
    wireQ();
    S.root.querySelectorAll('.m4hq').forEach(function (inp) {
      inp.addEventListener('input', function () { S.hq = inp.value; var K = S.kits.f; if (K) { K.M.hl = heatMatches(S.hq); K.draw(); } });
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { var K = S.kits.f, set = heatMatches(inp.value); if (K && set && set.size) K.zoomToRacks(Array.from(set)); } });
    });
    S.root.querySelectorAll('.m4psel').forEach(function (sel) { sel.addEventListener('change', function () { if (!sel.value) return; S.plantPick[sel.getAttribute('data-prod')] = sel.value; run(); }); });
    var rs = $('#m4round'); if (rs) rs.addEventListener('change', function () { S.prodRound = +rs.value; render(); });
    var spd = $('#m4sprod'); if (spd) spd.addEventListener('change', function () { S.simProd = spd.value; S.rp.before.floor = S.rp.after.floor = null; render(); });
    var rp = $('#m4rprod'); if (rp) rp.addEventListener('change', function () { S.view.prod = rp.value; if (S.view.kind === 's') S.simProd = rp.value; drawRoute(S.view.kind); });
    var add = $('#m4add');
    if (add) {
      add.addEventListener('submit', function (e) { e.preventDefault(); addSim(); });
      ['a', 'b'].forEach(function (k) {
        var inp = $('#m4' + k); inp.addEventListener('change', function () { S.form[k] = inp.value.trim().toUpperCase(); S.form[k + 'b'] = ''; render(); });
        var sel = $('#m4' + k + 'b'); sel.addEventListener('change', function () { S.form[k + 'b'] = sel.value; });
      });
    }
  }
  function wireQ() { var q = $('#m4q'); if (q && !q.dataset.w) { q.dataset.w = 1; } }
  function addSim() {
    var F = S.form; S.simMsg = '';
    F.a = ($('#m4a').value || '').trim().toUpperCase(); F.b = ($('#m4b').value || '').trim().toUpperCase();
    F.ab = $('#m4ab').value; F.bb = $('#m4bb').value;
    if (!F.a || !F.b || F.a === F.b) { S.simMsg = t('m4.sim.err_pair'); render(); return; }
    if (!S.d.bins.has(F.a) || !S.d.bins.has(F.b)) { S.simMsg = t('m4.sim.err_part', { code: !S.d.bins.has(F.a) ? F.a : F.b }); render(); return; }
    if (!F.ab || !F.bb) { S.simMsg = t('m4.sim.err_bin'); render(); return; }
    var A = partObj(F.a, F.ab), B = partObj(F.b, F.bb);
    if (S.sim.some(function (s) { return [s.a.code, s.b.code].indexOf(F.a) >= 0 || [s.a.code, s.b.code].indexOf(F.b) >= 0 || [s.a.pick.bin, s.b.pick.bin].indexOf(F.ab) >= 0 || [s.a.pick.bin, s.b.pick.bin].indexOf(F.bb) >= 0; })) { S.simMsg = t('m4.sim.err_twice'); render(); return; }
    S.sim.push({ a: A, b: B, rules: PWH.freq.checkSwap(S.d, A, B) }); S.simRes = null; S.form = { a: '', ab: '', b: '', bb: '' }; render();
  }
  function goTab(v) { S.tab = v; try { localStorage.setItem('pwh-m4tab', v); } catch (x) {} S.view = null; render(); if (v === 'recs') runRecs(); window.scrollTo({ top: 0 }); }
  function selectRackOf(code) {
    var p = S.base.parts.filter(function (x) { return x.code === code; })[0]; if (!p || p.pick.status !== 'ok') return;
    var fi = S.d.L.floors.map(function (f) { return f.id; }).indexOf(p.pick.floor); if (fi >= 0) S.hFloor = fi;
    S.hSel.f = p.pick.rack; render();
    var sec = $('#m4h-f'); if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'center' });
    var K = S.kits.f; if (K) K.zoomToRacks([p.pick.rack]);
  }
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-m4]'); if (!el || !S.root || !S.root.contains(el)) return;
    var a = el.getAttribute('data-m4'), v = el.getAttribute('data-v'), k = el.getAttribute('data-k');
    if (a === 'tab') goTab(v);
    else if (a === 'recalc') run(true);
    else if (a === 'clear') { var r = PWH.freq.defaultRange(S.d); S.from = r.from; S.to = r.to; S.product = ''; S.q = ''; S.prodView = null; S.plantPick = {}; run(); }
    else if (a === 'open') { if (e.target.closest('button') && e.target.closest('button') !== el) return; S.open = S.open === v ? null : v; render(); }
    else if (a === 'sort') { S.sort = v; render(); }
    else if (a === 'more') { S.partsMax += 60; render(); }
    else if (a === 'prod') { S.prodView = S.prodView === v ? null : v; S.prodRound = 0; render(); var pv = $('#m4pv'); if (pv) pv.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    else if (a === 'onmap') { e.stopPropagation(); selectRackOf(v); }
    else if (a === 'gopart') { S.q = v; S.open = v; render(); var pt = $('#m4parts'); if (pt) pt.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    else if (a === 'gorecs') goTab('recs');
    else if (a === 'simA') { e.stopPropagation(); S.form = { a: v, ab: '', b: '', bb: '' }; goTab('sim'); }
    else if (a === 'hfloor') { S.hFloor = +v; S.root.querySelectorAll('[data-m4=hfloor]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-v') === v); }); Object.keys(S.kits).forEach(function (kk) { if (kk.indexOf('r-') === 0) return; var K = S.kits[kk]; if (K.M.canvas && document.body.contains(K.M.canvas)) { K.M.floor = S.hFloor; K.fit(); K.draw(); } }); }
    else if (a === 'hz') { var K = S.kits[k]; if (!K || !K.M.canvas) return; if (v === 'fit') { K.fit(); K.draw(); } else { var c = K.M.canvas; K.zoomAt(c.clientWidth / 2, c.clientHeight / 2, v === 'in' ? 1.25 : 0.8); } }
    else if (a === 'hfs') { var K2 = S.kits[k]; if (K2) { K2.toggleFs(el); setTimeout(function () { el.textContent = t(K2.M.fs ? 'm4.h.fsexit' : 'm4.h.fs'); }, 80); } }
    else if (a === 'ropen') { S.recOpen = S.recOpen === +v ? null : +v; S.view = null; render(); }
    else if (a === 'tosim') { var rr = S.recs.list[+v]; if (!S.sim.some(function (s) { return s.a.code === rr.a.code && s.b.code === rr.b.code; })) S.sim = [{ a: rr.a, b: rr.b, rules: PWH.freq.checkSwap(S.d, rr.a, rr.b) }]; S.simRes = null; S.view = null; goTab('sim'); if (!S.sim[0].rules.length) runSim(); }
    else if (a === 'simdel') { S.sim.splice(+v, 1); S.simRes = null; render(); }
    else if (a === 'simclear') { S.sim = []; S.simRes = null; S.simMsg = ''; S.view = null; render(); }
    else if (a === 'simrun') runSim();
    else if (a === 'sprod') { S.simProd = v; S.rp.before.floor = S.rp.after.floor = null; render(); var rp = $('#m4rp-before'); if (rp) rp.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    else if (a === 'rfloor') { S.rp[k].floor = +v; S.root.querySelectorAll('[data-m4=rfloor][data-k=' + k + ']').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-v') === v); }); var KF = S.kits['rp-' + k]; if (KF) { KF.M.floor = +v; KF.fit(); KF.draw(); } }
    else if (a === 'rmode') { S.rp[k].mode = v; S.root.querySelectorAll('[data-m4=rmode][data-k=' + k + ']').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-v') === v); }); var KM = S.kits['rp-' + k]; if (KM) { KM.M.mode = v; KM.fit(); KM.draw(); } }
    else if (a === 'rz') { var KZ = S.kits['rp-' + k]; if (!KZ || !KZ.M.canvas) return; if (v === 'fit') { KZ.fit(); KZ.draw(); } else { var cz = KZ.M.canvas; KZ.zoomAt(cz.clientWidth / 2, cz.clientHeight / 2, v === 'in' ? 1.25 : 0.8); } }
    else if (a === 'rfs') { var KS = S.kits['rp-' + k]; if (KS) { KS.toggleFs(el); setTimeout(function () { el.textContent = t(KS.M.fs ? 'm4.h.fsexit' : 'm4.h.fs'); }, 80); } }
    else if (a === 'mode') { if (S.view) { S.view.mode = v; S.root.querySelectorAll('[data-m4=mode]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-v') === v); }); drawRoute(S.view.kind); } }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var el = e.target.closest && e.target.closest('tr[data-m4]'); if (!el || !S.root || !S.root.contains(el)) return;
    e.preventDefault(); el.click();
  });
  function mount(root) {
    S.root = root; S.kits = {}; S.slots = null;
    if (S.d) {
      // coming back: keep the range, filters and the swap list; recalculate only when the data changed
      render();
      PWH.freq.keyNow().then(function (k) { if (k !== S.d.key) run(true); });
      return;
    }
    render(); run(true);
  }
  // called by the app after data changed: the result on screen is marked out of date until it is recalculated
  function refresh() {
    if (!S.root || !document.body.contains(S.root) || !S.d) return;
    PWH.freq.keyNow().then(function (k) { if (k !== S.d.key && !S.stale) { S.stale = true; render(); } });
  }
  PWH.m4 = { mount: mount, refresh: refresh };
})(window);
