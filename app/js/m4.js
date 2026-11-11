/* Module 4: pick frequency and heatmap, swap advice, swap simulation (spec of 07/11/2026).
 * Numbers come from PWH.freq (see freq.js for the agreed rules). Nothing here changes stored data. */
(function (g) {
  var PWH = g.PWH, t = PWH.t;
  var S = {
    root: null, d: null, base: null, tab: 'freq', from: '', to: '', product: '', q: '', sort: 'plan', open: null, partsMax: 60, idleMax: 60, idleG: 'all', idleQ: '',
    prodView: null, prodRound: 0, hFloor: 0, hSel: {}, hq: '', kits: {}, recs: null, recOpen: null, sim: [], simMsg: '', simRes: null,
    simProd: null, view: null, busy: null, plantPick: {}, rp: { before: { floor: null, mode: '2d' }, after: { floor: null, mode: '2d' }, pv: { floor: null, mode: '2d' } }, recProd: null, stale: false, runId: 0, err: '', form: { a: '', ab: '', b: '', bb: '' }
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
  function statusChip(pk) { return pk.status === 'ok' ? chip('ok', t('m4.st.ok')) : chip('warn', PWH.freq.locText(pk)); }
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
    var p = reload || !S.d ? PWH.freq.load().then(function (d) { if (id !== S.runId) return; S.d = d; S.stale = false; S.plantPick = Object.assign({}, d.plantPick); fixRange(); }) : Promise.resolve();
    return p.then(function () {
      if (id !== S.runId || !ready()) { if (id === S.runId) { S.busy = null; render(); } return; }
      setBusy('rounds'); render();
      return PWH.freq.analyze(S.d, { from: S.from, to: S.to, product: S.product, plantPick: S.plantPick, progress: function (i, n) { if (id === S.runId) setBusy('route', i, n); } }).then(function (base) {
        if (id !== S.runId) return;
        S.base = base; S.recs = null; S.simRes = null; S.busy = null;
        S.sim.forEach(function (s) { s.a = partObj(s.a.code, s.a.pick.bin); s.b = partObj(s.b.code, s.b.pick.bin); s.rules = PWH.freq.checkSwap(S.d, s.a, s.b); });
        PWH.freq.storeDays(S.d, base);   // the dashboard reads the same per-day results
        render();
        if (S.tab === 'recs') runRecs();
        if (S.focusPart && S.tab === 'freq' && $('#m4parts')) { S.focusPart = false; setTimeout(function () { var pt = $('#m4parts'); if (pt) pt.scrollIntoView({ block: 'start' }); }, 50); }
        if (S.focusIss) { S.focusIss = false; var is = $('#m4iss'); if (is) { is.querySelectorAll('details').forEach(function (x) { x.open = true; }); setTimeout(function () { is.scrollIntoView({ block: 'start' }); }, 50); } }
        if (S.tab === 'sim' && S.autoSim) { S.autoSim = false; if (S.sim.length && !S.sim.some(function (x) { return x.rules.length; })) runSim(); }
      });
    }).catch(function (e) { if (id === S.runId) { S.busy = null; S.err = String(e && e.message || e); render(); } });
  }
  function runRecs() {
    if (!S.base || S.recs || S.busy || S.base.products.some(function (p) { return p.needPlant; })) return;
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
      '<p class="sub2">' + esc(t('m4.scope.note')) + (B ? ' · ' + esc(t('m4.scope.at', { t: fmtTime(B.at) })) : '') + (B && ambiguous().some(function (p) { return p.how === 'user'; }) && !B.products.some(function (p) { return p.needPlant; }) ? ' · <button type="button" class="linkbtn" data-m4="pchange">' + esc(t('m4.pp.change', { n: ambiguous().length })) + '</button>' : '') + '</p>' +
      '<details class="m4files"><summary>' + esc(t('m4.scope.files')) + '</summary><ul>' + fl.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></details></div>';
  }

  // ---------- 1. frequency ----------
  function kpis() {
    var B = S.base;
    function k(label, val, sub, cls) { return '<div class="m4k' + (cls ? ' ' + cls : '') + '"><span class="k">' + esc(label) + '</span><span class="v">' + val + '</span>' + (sub ? '<span class="s">' + sub + '</span>' : '') + '</div>'; }
    var gs = issueGroups(), nIss = gs.reduce(function (n, gp) { return n + gp.items.length; }, 0);
    var prods = new Set(), jobs = new Set(); B.rounds.forEach(function (r) { jobs.add(r.job); r.products.forEach(function (p) { prods.add(p); }); });
    var withBin = B.parts.filter(function (p) { return p.pick.status === 'ok'; }).length;
    var withRoute = B.identified.filter(function (r) { return r.m > 0; }).length;   // the divisor of the average, as on the dashboard
    var issSub = gs.map(function (gp) { return esc(t('m4.issshort.' + gp.why)) + ' ' + nf(gp.items.length); }).join(' · ');
    return '<div class="m4kpis m4k5">' +
      k(t('m4.k.rounds'), nf(B.rounds.length), esc(t('m4.k.rounds_sub3', { j: nf(jobs.size), p: nf(prods.size) })) + repeatNote(B)) +
      k(t('m4.k.parts'), nf(B.parts.length), esc(t('m4.k.parts_sub2', { a: nf(withBin), b: nf(B.parts.length - withBin) }))) +
      k(t('m4.k.picks'), nf(B.routeFreq), esc(notCounted(B))) +
      k(t('m4.k.dist'), mm(B.totalM), esc(t('m4.k.dist_sub4', { m: nf(withRoute ? B.totalM / withRoute : 0, 1), n: nf(withRoute), h: hrs(B.totalSec) }))) +
      '<button type="button" class="m4k m4kbtn' + (nIss ? ' warnv' : '') + '" data-m4="goiss"><span class="k">' + esc(t('m4.k.issues')) + '</span><span class="v">' + nf(nIss) + '</span><span class="s">' + (issSub || esc(t('m4.none'))) + '</span></button></div>' +
      (B.consistent ? '' : '<div class="msg bad" role="status"><span>' + esc(t('m4.err.heatsum', { h: nf(B.heatSum), r: nf(B.routeFreq) })) + '</span></div>');
  }
  // why rounds can outnumber JOBs: a round is date + U-line + JOB, so a JOB planned on several days (or lines) is several rounds
  function repeatNote(B) {
    var days = new Map(), lines = new Map();
    B.rounds.forEach(function (r) { var d = days.get(r.job) || new Set(); d.add(r.date); days.set(r.job, d); var k = r.job + '|' + r.date, l = lines.get(k) || new Set(); l.add(r.line); lines.set(k, l); });
    var nd = 0, nl = new Set(); days.forEach(function (d) { if (d.size > 1) nd++; }); lines.forEach(function (l, k) { if (l.size > 1) nl.add(k.split('|')[0]); });
    var bits = []; if (nd) bits.push(t('m4.k.rep_days', { n: nf(nd) })); if (nl.size) bits.push(t('m4.k.rep_lines', { n: nf(nl.size) }));
    return bits.length ? '<br>' + esc(bits.join(' · ')) : '';
  }
  // planned picks that are not counted, by reason
  function notCounted(B) {
    var by = {}; B.parts.forEach(function (p) { var miss = p.n - p.nRoute; if (miss > 0) { var k = p.pick.status === 'ok' ? 'unreach' : p.pick.status; by[k] = (by[k] || 0) + miss; } });
    var parts = ['noloc', 'special', 'notonlayout', 'unreach'].filter(function (k) { return by[k]; }).map(function (k) { return t('m4.nc.' + k, { n: nf(by[k]) }); });
    return parts.length ? t('m4.nc.head', { list: parts.join(' · ') }) : t('m4.nc.none');
  }
  function hrs(sec) { var mn = Math.round(sec / 60); return mn < 60 ? t('m3.kpi.min', { n: mn }) : t('m4.hm', { h: Math.floor(mn / 60), m: mn % 60 }); }
  function matchQ(p) { var q = S.q.trim().toUpperCase(); return !q || p.code.toUpperCase().indexOf(q) >= 0 || (p.name || '').toUpperCase().indexOf(q) >= 0; }
  function partsTable() {
    var B = S.base, rows = B.parts.filter(matchQ).slice().sort(function (a, b) { return b.nRoute - a.nRoute || b.n - a.n || (a.code < b.code ? -1 : 1); });
    var top = Math.max(1, rows.reduce(function (s, p) { return Math.max(s, p.nRoute); }, 0)), shown = rows.slice(0, S.partsMax);
    var body = shown.map(function (p, i) {
      var open = S.open === p.code, prods = Array.from(p.products.entries()).sort(function (a, b) { return b[1] - a[1]; });
      var bins = (p.pick.bins || []), onl = bins.filter(function (b) { return b.loc.kind === 'rack'; });
      var tr = '<tr class="m4r' + (open ? ' open' : '') + '" data-m4="open" data-v="' + esc(p.code) + '" tabindex="0" aria-expanded="' + open + '">' +
        '<td class="num m4rank">' + (i + 1) + '</td><td class="m4pn"><span class="code">' + esc(p.code) + '</span><div class="sub2">' + esc(p.name || '–') + '</div></td>' +
        '<td class="num">' + (p.pick.status === 'ok' ? nbar(p.nRoute, top) : '<span class="m4nc">–</span><div class="sub2">' + esc(t('m4.nocount')) + '</div>') + '</td>' +
        '<td>' + (p.pick.status === 'ok' ? locTag(p.pick.bin) + '<div class="sub2">' + esc(floorTxt(p.pick.floor)) + '</div>' : '–') + '</td>' +
        '<td>' + statusChip(p.pick) + '</td>' +
        '<td class="m4act">' + (p.pick.status === 'ok' ? '<button type="button" class="btn sm" data-m4="onmap" data-v="' + esc(p.code) + '">' + esc(t('m4.act.map')) + '</button>' : '') +
        '<button type="button" class="btn sm" data-m4="simA" data-v="' + esc(p.code) + '">' + esc(t('m4.act.sim')) + '</button></td></tr>';
      if (open) tr += '<tr class="m4det"><td></td><td colspan="5"><div class="m4dgrid"><div><div class="m4dh">' + esc(t('m4.det.products', { code: p.code })) + '</div><div class="m4bars">' +
        prods.map(function (e) { return '<div class="m4bar"><span><span class="code">' + esc(e[0]) + '</span><span class="sub2"> ' + esc(prodName(e[0])) + '</span></span><span class="m4bt"><i style="width:' + Math.max(4, e[1] / p.n * 100) + '%"></i></span><b>' + nf(e[1]) + '</b></div>'; }).join('') + '</div></div>' +
        '<div><div class="m4dh">' + esc(t('m4.det.bins')) + '</div>' + (bins.length ? '<ul class="m4binl">' + bins.map(function (b) {
          var chosen = p.pick.status === 'ok' && b.bin === p.pick.bin;
          return '<li' + (chosen ? ' class="on"' : '') + '>' + locTag(b.bin) + '<span class="sub2">' + esc(b.loc.kind === 'rack' ? floorTxt(b.loc.floor) + ' · ' + t('m4.level', { n: b.loc.level }) : t('m4.binkind.' + b.loc.kind)) + ' · ' + esc(t('m4.stock', { n: nf(b.stock) })) + '</span>' + (chosen ? chip('info', t('m4.det.chosen')) : '') + '</li>';
        }).join('') + '</ul>' : '<p class="sub">' + esc(t('m4.loc.noloc')) + '</p>') + '</div></div></td></tr>';
      return tr;
    }).join('');
    return '<section class="panel m4card" id="m4parts"><div class="chd"><div class="chd-l"><h2>' + esc(t('m4.parts.title')) + ' <span class="chip info">' + nf(rows.length) + '</span></h2><p class="sub">' + esc(t('m4.parts.sub2')) + '</p></div></div>' +
      '<div class="m4ptool"><input id="m4q" type="search" placeholder="' + esc(t('m4.q.part')) + '" value="' + esc(S.q) + '" aria-label="' + esc(t('m4.q.part')) + '"><span class="sub2">' + esc(t('m4.q.note')) + '</span></div>' +
      (rows.length ? '<div class="tablebox m4tb"><table class="m4pt"><thead><tr><th class="num">#</th><th>' + esc(t('m4.col.part')) + '</th><th class="num">' + esc(t('m4.col.plan')) + '</th><th>' + esc(t('m4.col.chosen')) + '</th><th>' + esc(t('m4.col.status')) + '</th><th></th></tr></thead><tbody>' + body + '</tbody></table></div>' +
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
  function distCell(p) {
    if (p.status === 'plant') return '<span class="sub2">' + esc(t('m4.pt.chooseplant')) + '</span>';
    if (p.status === 'nobom' || p.status === 'noparts') return '<span class="sub2">' + esc(t('m4.ps.nobom')) + '</span>';
    if (!p.routedParts) return '<span class="sub2">' + esc(t('m4.pt.nobin')) + '</span>';
    return '<b>' + mm(p.m / Math.max(1, p.rounds)) + '</b> <span class="sub2">' + esc(t('m4.pt.per')) + '</span>' +
      '<div class="sub2">' + esc(t('m4.pt.total', { m: m(p.m), n: p.rounds })) + (p.how === 'user' ? ' · Plant ' + esc(p.plant) + ' ' + esc(t('m4.ps.own')) : '') + '</div>' +
      (p.parts > p.routedParts ? '<div class="m4lo sub2">' + esc(t('m4.pt.skip', { n: p.parts - p.routedParts, of: p.parts })) + '</div>' : '');
  }
  function prodsTable() {
    var B = S.base, rows = B.products.slice().sort(function (a, b) { return b.rounds - a.rounds || b.m - a.m; });
    var body = rows.slice(0, 200).map(function (p) {
      var on = S.prodView === p.product, ok = p.status === 'ok' || p.status === 'partial';
      return '<tr class="m4r' + (on ? ' open' : '') + '"' + (ok ? ' data-m4="prod" data-v="' + esc(p.product) + '" tabindex="0"' : '') + '><td class="m4pn"><span class="code">' + esc(p.product) + '</span><div class="sub2">' + esc(prodName(p.product) || '–') + '</div></td>' +
        '<td class="num">' + nf(p.rounds) + '</td><td class="num m4dist">' + distCell(p) + '</td></tr>';
    }).join('');
    return '<section class="panel m4card" id="m4prodt"><div class="chd"><div class="chd-l"><h2>' + esc(t('m4.prods.title2')) + ' <span class="chip info">' + nf(rows.length) + '</span></h2><p class="sub">' + esc(t('m4.prods.sub4')) + '</p></div></div>' +
      (rows.length ? '<div class="tablebox m4tb"><table class="m4prt"><thead><tr><th>' + esc(t('m4.col.product')) + '</th><th class="num">' + esc(t('m4.col.jobs')) + '</th><th class="num">' + esc(t('m4.col.dist')) + '</th></tr></thead><tbody>' + body + '</tbody></table></div>' +
        (rows.length > 200 ? '<p class="sub">' + esc(t('m4.more', { n: 200, t: rows.length })) + '</p>' : '') : '<p class="empty-note">' + esc(t('m4.none')) + '</p>') +
      (S.prodView ? prodView() : '') + '</section>';
  }
  // Products whose BOM is in more than one Plant: the person chooses the Plant before the results are shown
  function ambiguous() { return S.base ? S.base.products.filter(function (p) { return p.needPlant || p.how === 'user' || (S.plantPick[p.product] && p.plants.length > 1); }) : []; }
  function plantRefresh() {
    var box = $('#m4plant'); if (!box) return;
    var list = ambiguous(), D = S.plantDraft, n = list.filter(function (p) { return D[p.product]; }).length;
    box.querySelectorAll('[data-m4=pdraft]').forEach(function (b) { b.setAttribute('aria-pressed', String(D[b.getAttribute('data-k')] === b.getAttribute('data-v'))); });
    var ap = box.querySelector('[data-m4=papply]'); ap.disabled = n !== list.length; ap.textContent = t('m4.pp.apply', { n: n, of: list.length });
    var need = box.querySelector('.m4ppneed'); if (need) need.hidden = n === list.length;
    box.querySelectorAll('[data-m4=pall]').forEach(function (b) { var v = b.getAttribute('data-v'); b.classList.toggle('primary', n === list.length && list.every(function (p) { return D[p.product] === v || p.plants.indexOf(v) < 0; })); });
  }
  function plantPanel(gate) {
    var list = ambiguous(); if (!list.length) return '';
    var plants = []; list.forEach(function (p) { p.plants.forEach(function (x) { if (plants.indexOf(x) < 0) plants.push(x); }); }); plants.sort();
    var D = S.plantDraft = S.plantDraft || {};
    list.forEach(function (p) { if (!D[p.product] && S.plantPick[p.product]) D[p.product] = S.plantPick[p.product]; });
    var rows = list.map(function (p) {
      return '<div class="m4ppr"><span class="m4pn"><span class="code">' + esc(p.product) + '</span><span class="sub2"> ' + esc(prodName(p.product)) + ' · ' + esc(t('m4.pt.jobs', { n: p.rounds })) + '</span></span>' +
        seg(p.plants.map(function (x) { return [x, x]; }), D[p.product] || '', 'pdraft', ' data-k="' + esc(p.product) + '"') + '</div>';
    }).join('');
    var n = list.filter(function (p) { return D[p.product]; }).length;
    return '<section class="panel m4plant" id="m4plant"><div class="chd"><div class="chd-l"><h2>' + esc(t(gate ? 'm4.pp.title' : 'm4.pp.title2', { n: list.length })) + '</h2><p class="sub">' + esc(t('m4.pp.sub2')) + '</p></div>' + (gate ? '' : '<button type="button" class="btn sm" data-m4="pclose">' + esc(t('m4.close')) + '</button>') + '</div>' +
      '<div class="m4ppall"><span class="sub2">' + esc(t('m4.pp.all')) + '</span>' + plants.map(function (x) { return '<button type="button" class="btn' + (list.every(function (p) { return D[p.product] === x || p.plants.indexOf(x) < 0; }) && n === list.length ? ' primary' : '') + '" data-m4="pall" data-v="' + esc(x) + '">' + esc(t('m4.pp.use', { p: x })) + '</button>'; }).join('') + '</div>' +
      '<details class="m4ppl"' + (list.length <= 12 || S.ppOpen ? ' open' : '') + '><summary>' + esc(t('m4.pp.each', { n: list.length })) + '</summary><div class="m4pplist">' + rows + '</div></details>' +
      '<div class="m4acts"><button type="button" class="btn primary" data-m4="papply"' + (n === list.length ? '' : ' disabled') + '>' + esc(t('m4.pp.apply', { n: n, of: list.length })) + '</button>' + '<span class="sub2 m4ppneed"' + (n === list.length ? ' hidden' : '') + '>' + esc(t('m4.pp.need')) + '</span></div></section>';
  }

  // a Product: its route as the pick route page shows it, and the pick order
  function prodView() {
    var B = S.base, P = B.products.filter(function (x) { return x.product === S.prodView; })[0]; if (!P || !P.plant) return '';
    if (!S.pvRoute || S.pvRoute.key !== P.product || S.pvRoute.base !== B) { S.pvRoute = { key: P.product, base: B, sd: sideRoute(P.product, P.plant, null) }; S.rp.pv.floor = null; }
    var sd = S.pvRoute.sd;
    var codes = sd.codes.slice().sort(function (a, b) { return (sd.seq[a] || 999) - (sd.seq[b] || 999); });
    var rows = codes.map(function (c) {
      var pk = sd.picks[c], q = sd.seq[c];
      return '<tr' + (q ? '' : ' class="m4re"') + '><td class="num"><b>' + (q || '–') + '</b></td><td class="m4pn"><span class="code">' + esc(c) + '</span><div class="sub2">' + esc(partName(c) || '–') + '</div></td><td>' + (pk.status === 'ok' ? locTag(pk.bin) + ' <span class="sub2">' + esc(floorTxt(pk.floor) + ' · ' + t('m4.level', { n: pk.level })) + '</span>' : chip('warn', PWH.freq.locText(pk))) + '</td></tr>';
    }).join('');
    return '<div class="m4pv" id="m4pv"><div class="m4pvh"><div><h3>' + esc(t('m4.pv.title', { p: P.product })) + '</h3><p class="sub">' + esc(prodName(P.product)) + ' · Plant ' + esc(P.plant) + ' · ' + esc(t('m4.pt.jobs', { n: P.rounds })) + ' · ' + esc(t('m4.pt.total', { m: m(P.m), n: P.rounds })) + '</p></div><div class="m4pvb">' + (S.product ? '' : '<button type="button" class="btn sm" data-m4="hist" data-v="' + esc(P.product) + '">' + esc(t('m4.hist.btn')) + '</button>') + '<button type="button" class="btn sm" data-m4="prod" data-v="' + esc(P.product) + '">' + esc(t('m4.close')) + '</button></div></div>' +
      '<div class="m4pvg">' + routeCard('pv', sd, null) +
      '<div><div class="m4dh">' + esc(t('m4.pv.order')) + (P.parts > P.routedParts ? ' · <span class="m4lo">' + esc(t('m4.pt.skip', { n: P.parts - P.routedParts, of: P.parts })) + '</span>' : '') + '</div><div class="tablebox m4tb"><table class="m4ord"><thead><tr><th class="num">#</th><th>' + esc(t('m4.col.part')) + '</th><th>Bin</th></tr></thead><tbody>' + rows + '</tbody></table></div></div></div></div>';
  }
  // ---------- heatmap ----------
  // one continuous colour ramp from 1 pick to the highest count in the range (no fixed steps)
  var HEAT = ['#2b6c9e', '#2a9d8f', '#8ab84a', '#f2b705', '#f0603a'], ZERO = '#4d4766', NODATA = '#2a2540';
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
    return '<section class="panel m4card"><div class="chd"><div class="chd-l"><h2>' + esc(t('m4.h.title')) + '</h2><p class="sub">' + esc(t('m4.h.sub2', { n: nf(B.heatSum), x: nf(B.planFreq - B.routeFreq) })) + '</p></div></div>' + heatBox('f', '', S.slots.f.br, true) + '</section>';
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
    var html = '<div class="m4hsh"><div class="m4hsh1"><h3>' + esc(t('m4.h.rack', { r: rid })) + '</h3><span class="m4hsn"><b>' + nf(h ? h.n : 0) + '</b> ' + esc(t('m4.h.times')) + '</span></div>' +
      '<p class="sub2">' + esc((rk ? floorTxt(rk.floor) + ' · ' + t('m4.h.levels', { n: rk.levels }) + ' · ' : '') + t('m4.h.parts', { n: rows.length })) + '</p></div>';
    if (rows.length) html += '<ul class="m4hlist">' + rows.map(function (r) {
      var p = pmap.get(r.code), prods = p ? Array.from(p.products.entries()).sort(function (a, b) { return b[1] - a[1]; }) : [], nm = partName(r.code) || '–';
      var pc = prods.slice(0, 3).map(function (e) { return '<span class="m4pc"><span>' + esc(e[0]) + '</span><i>×' + e[1] + '</i></span>'; }).join('') + (prods.length > 3 ? '<span class="m4pc more" title="' + esc(prods.slice(3).map(function (e) { return e[0] + ' ×' + e[1]; }).join('\n')) + '">' + esc(t('m4.h.more', { n: prods.length - 3 })) + '</span>' : '');
      return '<li><div class="m4hl1"><span class="code">' + esc(r.code) + '</span><span class="m4hn"><b>' + nf(r.n) + '</b> ' + esc(t('m4.h.times')) + '</span></div><div class="m4hnm" title="' + esc(nm) + '">' + esc(nm) + '</div>' +
        '<dl class="m4hmeta"><dt>' + esc(t('m4.h.bin')) + '</dt><dd>' + locTag(r.bin) + '<span class="sub2">' + esc(t('m4.level', { n: r.level })) + '</span></dd>' +
        (prods.length ? '<dt>' + esc(t('m4.h.prod')) + '</dt><dd class="m4pcs">' + pc + '</dd>' : '') + '</dl>' +
        (slot.id === 'f' ? '<div class="m4hl3"><button type="button" class="btn sm" data-m4="gopart" data-v="' + esc(r.code) + '">' + esc(t('m4.act.part')) + '</button><button type="button" class="btn sm" data-m4="simA" data-v="' + esc(r.code) + '">' + esc(t('m4.act.sim')) + '</button><button type="button" class="btn sm" data-m4="gorecs">' + esc(t('m4.act.recs')) + '</button></div>' : '') + '</li>';
    }).join('') + '</ul>';
    var idle = stored.filter(function (s) { return !rows.some(function (r) { return r.code === s.code && r.bin === s.bin; }); });
    if (idle.length) html += '<details class="m4idle"' + (rows.length ? '' : ' open') + '><summary>' + esc(t('m4.h.idle', { n: idle.length })) + '</summary><ul class="m4hlist">' + idle.map(function (s) { var nm = partName(s.code) || '–'; return '<li><div class="m4hl1"><span class="code">' + esc(s.code) + '</span><span class="m4hn"><b>0</b> ' + esc(t('m4.h.times')) + '</span></div><div class="m4hnm" title="' + esc(nm) + '">' + esc(nm) + '</div><dl class="m4hmeta"><dt>' + esc(t('m4.h.bin')) + '</dt><dd>' + locTag(s.bin) + '<span class="sub2">' + esc(t('m4.level', { n: s.level })) + '</span></dd></dl></li>'; }).join('') + '</ul></details>';
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
      c.save(); c.font = '600 11px "Anuphan", "IBM Plex Sans Thai", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
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
  // ---------- Product history: when and on which U-line one Product was planned ----------
  // Read straight from the daily plans in the range. 1 round = date + U-line + JOB (the same count as the rest of Module 4).
  function histData(p) {
    var by = new Map(), lines = new Map(), days = new Set(), keys = new Set(), qty = 0;
    S.d.days.forEach(function (day) {
      if (day.date < S.from || day.date > S.to) return;
      day.rows.forEach(function (r) {
        var job = String(r[0] == null ? '' : r[0]).trim(), prod = String(r[1] == null ? '' : r[1]).trim();
        if (!job || prod !== p) return;
        var line = String(r[4] == null ? '' : r[4]).trim(), q = +r[3] || 0, rk = day.date + '|' + line + '|' + job;
        var g = by.get(day.date + '|' + line);
        if (!g) by.set(day.date + '|' + line, (g = { date: day.date, line: line, jobs: [], qty: 0 }));
        if (g.jobs.indexOf(job) < 0) g.jobs.push(job);
        g.qty += q; qty += q; days.add(day.date);
        var L = lines.get(line); if (!L) lines.set(line, (L = { line: line, n: 0, last: '' }));
        if (!keys.has(rk)) { keys.add(rk); L.n++; }
        if (day.date > L.last) L.last = day.date;
      });
    });
    var rows = Array.from(by.values()).sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : a.line < b.line ? -1 : a.line > b.line ? 1 : 0; });
    var ls = Array.from(lines.values()).sort(function (a, b) { return b.n - a.n || (a.line < b.line ? -1 : 1); });
    return { rows: rows, lines: ls, rounds: keys.size, days: days.size, qty: qty };
  }
  function histCard() {
    if (!S.product) return '';
    var p = S.product, H = histData(p), noline = t('m4.hist.noline');
    var head = '<div class="chd"><div class="chd-l"><h2>' + esc(t('m4.hist.title', { p: p })) + '</h2><p class="sub">' + esc([prodName(p), t('m4.scope.range', { from: fmtDate(S.from), to: fmtDate(S.to) }), t('m4.hist.rule')].filter(Boolean).join(' · ')) + '</p></div></div>';
    if (!H.rounds) return '<section class="panel m4card" id="m4hist">' + head + '<p class="empty-note">' + esc(t('m4.hist.none')) + '</p></section>';
    var stats = [[t('m4.hist.rounds'), H.rounds], [t('m4.hist.days'), H.days], [t('m4.hist.lines'), H.lines.length], [t('m4.hist.qty'), H.qty]];
    return '<section class="panel m4card" id="m4hist">' + head +
      '<div class="m4hs">' + stats.map(function (x) { return '<div class="m4hst"><span class="sub2">' + esc(x[0]) + '</span><b>' + nf(x[1]) + '</b></div>'; }).join('') + '</div>' +
      '<ul class="m4hl">' + H.lines.map(function (L) { return '<li><span class="code">' + esc(L.line || noline) + '</span><b>' + esc(t('m4.hist.n', { n: nf(L.n) })) + '</b><span class="sub2">' + esc(t('m4.hist.last', { d: fmtDate(L.last) })) + '</span></li>'; }).join('') + '</ul>' +
      '<div class="tablebox m4tb"><table class="m4ht"><thead><tr><th>' + esc(t('m4.col.date')) + '</th><th>U-Line</th><th>JOB</th><th class="num">' + esc(t('m4.hist.rounds')) + '</th><th class="num">' + esc(t('m4.hist.qty')) + '</th></tr></thead><tbody>' +
      H.rows.map(function (g) { return '<tr><td><button type="button" class="m4hd" data-m4="histday" data-v="' + esc(g.date) + '" title="' + esc(t('m4.hist.open')) + '">' + esc(fmtDate(g.date)) + '</button></td><td>' + esc(g.line || noline) + '</td><td class="code">' + esc(g.jobs.join(', ')) + '</td><td class="num">' + nf(g.jobs.length) + '</td><td class="num">' + nf(g.qty) + '</td></tr>'; }).join('') +
      '</tbody></table></div></section>';
  }
  // ---------- Idle Parts: stored in a bin but not used by any planned round in the range ----------
  // Plan based (not actual issues). Last use comes from every daily plan imported, not only the range.
  var IDLE = { key: null, last: null, inBom: null };
  function idleBase() {
    var d = S.d; if (IDLE.key === d.key && IDLE.last) return IDLE;
    var last = new Map(), inBom = new Set();
    if (d.index) d.index.byPlant.forEach(function (pm) { pm.forEach(function (kids) { kids.forEach(function (q, c) { inBom.add(c); }); }); });
    d.days.forEach(function (day) {
      var seen = new Set();
      day.rows.forEach(function (r) {
        var job = String(r[0] == null ? '' : r[0]).trim(), prod = String(r[1] == null ? '' : r[1]).trim(), k = job + '|' + prod;
        if (!job || !prod || seen.has(k)) return; seen.add(k);
        var pp = PWH.freq.plantOf(d, job, prod), plants = pp.plant ? [pp.plant] : (pp.plants || []);
        plants.forEach(function (pl) { PWH.freq.partsOf(d, prod, pl).forEach(function (c) { var x = last.get(c); if (!x || day.date > x) last.set(c, day.date); }); });
      });
    });
    IDLE = { key: d.key, last: last, inBom: inBom }; return IDLE;
  }
  function idleRows() {
    var d = S.d, I = idleBase(), used = new Set(), out = [];
    S.base.parts.forEach(function (p) { if (p.n > 0) used.add(p.code); });
    d.bins.forEach(function (list, code) {
      if (used.has(code)) return;
      var g = I.inBom.has(code) ? 'plan' : 'bom', last = I.last.get(code) || '';
      list.forEach(function (b) {
        var pt = PWH.freq.pointOf(d, b.bin);
        out.push({ code: code, bin: b.bin, stock: +b.stock || 0, g: g, last: last, idle: last ? dayDiff(last, S.to) : null, pt: pt });
      });
    });
    return out.sort(function (a, b) { return (a.g === b.g ? 0 : a.g === 'bom' ? -1 : 1) || ((b.idle == null ? 1e9 : b.idle) - (a.idle == null ? 1e9 : a.idle)) || b.stock - a.stock || (a.code < b.code ? -1 : a.code > b.code ? 1 : 0); });
  }
  function dayDiff(a, b) { return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 864e5); }
  function idleCard() {
    if (S.product || !S.d.bins || !S.d.bins.size) return '';
    var all = idleRows(), cnt = function (g) { return nf(new Set(all.filter(function (r) { return !g || r.g === g; }).map(function (r) { return r.code; })).size); }, q = S.idleQ.trim().toLowerCase();
    var rows = all.filter(function (r) { return (S.idleG === 'all' || r.g === S.idleG) && (!q || r.code.toLowerCase().indexOf(q) >= 0 || r.bin.toLowerCase().indexOf(q) >= 0 || (partName(r.code) || '').toLowerCase().indexOf(q) >= 0); });
    var span = dayDiff(S.from, S.to) + 1, shown = rows.slice(0, S.idleMax);
    var parts = new Set(all.map(function (r) { return r.code; })).size;
    var head = '<div class="chd"><div class="chd-l"><h2>' + esc(t('m4.idle.title')) + ' <span class="chip info">' + nf(parts) + '</span></h2><p class="sub">' + esc(t('m4.idle.sub', { from: fmtDate(S.from), to: fmtDate(S.to) })) + '</p></div></div>';
    var warn = span < 30 ? '<p class="m4iwarn">' + esc(t('m4.idle.short', { n: span })) + '</p>' : '';
    var segs = seg([['all', t('m4.idle.g.all', { n: cnt('') })], ['plan', t('m4.idle.g.plan', { n: cnt('plan') })], ['bom', t('m4.idle.g.bom', { n: cnt('bom') })]], S.idleG, 'idleg');
    var tool = '<div class="m4itool">' + segs + '<input id="m4iq" type="search" placeholder="' + esc(t('m4.idle.q')) + '" value="' + esc(S.idleQ) + '" aria-label="' + esc(t('m4.idle.q')) + '"></div>';
    if (!all.length) return '<section class="panel m4card" id="m4idle">' + head + '<p class="empty-note">' + esc(t('m4.idle.none')) + '</p></section>';
    var body = shown.map(function (r) {
      var pt = r.pt, where = pt.status === 'ok' || pt.status === 'unreach' ? floorTxt(pt.floor) + ' · ' + t('m4.level', { n: pt.level }) : t('m4.idle.offmap');
      return '<tr><td class="m4pn"><span class="code">' + esc(r.code) + '</span><div class="sub2">' + esc(partName(r.code) || '–') + '</div></td>' +
        '<td>' + locTag(r.bin) + '<div class="sub2">' + esc(where) + '</div></td>' +
        '<td class="num">' + nf(r.stock) + '</td>' +
        '<td>' + chip(r.g === 'bom' ? 'warn' : 'info', t('m4.idle.g.' + r.g + '1')) + '</td>' +
        '<td>' + (r.last ? esc(fmtDate(r.last)) : '<span class="sub2">' + esc(t('m4.idle.never')) + '</span>') + '</td>' +
        '<td class="num">' + (r.idle == null ? '–' : esc(t('m4.idle.days', { n: nf(Math.max(0, r.idle)) }))) + '</td>' +
        '<td class="m4act">' + (pt.status === 'ok' ? '<button type="button" class="btn sm" data-m4="idlemap" data-v="' + esc(pt.rack) + '" data-k="' + esc(pt.floor) + '">' + esc(t('m4.act.map')) + '</button>' : '') + '</td></tr>';
    }).join('');
    return '<section class="panel m4card" id="m4idle">' + head + warn + tool +
      (rows.length ? '<div class="tablebox m4tb"><table class="m4it"><thead><tr><th>' + esc(t('m4.col.part')) + '</th><th>Bin</th><th class="num">' + esc(t('m4.idle.stock')) + '</th><th>' + esc(t('m4.idle.group')) + '</th><th>' + esc(t('m4.idle.last')) + '</th><th class="num">' + esc(t('m4.idle.still')) + '</th><th></th></tr></thead><tbody>' + body + '</tbody></table></div>' +
        (rows.length > S.idleMax ? '<div class="m4more"><span class="sub2">' + esc(t('m4.more', { n: S.idleMax, t: rows.length })) + '</span><button type="button" class="btn sm" data-m4="idlemore">' + esc(t('m4.more.btn')) + '</button></div>' : '')
        : '<p class="empty-note">' + esc(t('m4.none.q')) + '</p>') + '</section>';
  }
  function freqTab() {
    var B = S.base;
    if (!B.rounds.length) return '<section class="panel"><p class="empty-note">' + esc(t(S.product ? 'm4.empty.product' : 'm4.empty.range')) + '</p></section>' + issuesCard();
    return kpis() + histCard() + heatSection() + partsTable() + idleCard() + prodsTable() + issuesCard();
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
  function prodCmp(byProd) {
    if (!byProd.length) return '<p class="sub">' + esc(t('m4.sim.nochange')) + '</p>';
    var tb = 0, ta = 0, sb = 0, sa = 0;
    var rows = byProd.map(function (x) {
      tb += x.before; ta += x.after; sb += x.secBefore || 0; sa += x.secAfter || 0;
      return cmpRow('<span class="code">' + esc(x.product) + '</span><div class="sub2">' + esc(prodName(x.product) || '–') + '</div>', x.rounds, x.before, x.after, x.secBefore || 0, x.secAfter || 0, x.product);
    }).join('');
    return '<div class="tablebox m4tb"><table class="m4cmpt"><thead><tr><th>' + esc(t('m4.col.product')) + '</th><th class="num">' + esc(t('m4.col.rounds')) + '</th><th class="num">' + esc(t('m4.before')) + '</th><th class="num">' + esc(t('m4.after')) + '</th><th class="num">' + esc(t('m4.col.change')) + '</th><th class="num">%</th><th class="num">' + esc(t('m4.rc.time')) + '</th></tr></thead><tbody>' + rows + '</tbody>' +
      '<tfoot>' + cmpRow('<b>' + esc(t('m4.cmp.total')) + '</b>', null, tb, ta, sb, sa) + '</tfoot></table></div>';
  }
  function cmpRow(label, rounds, b, a, sb, sa, prod) {
    var d = b - a, up = d < -0.5, ds = sb - sa;
    return '<tr' + (prod ? ' class="m4r" data-m4="cprod" data-v="' + esc(prod) + '" tabindex="0"' : '') + '><td class="m4pn">' + label + '</td><td class="num">' + (rounds == null ? '' : nf(rounds)) + '</td><td class="num">' + mm(b) + '</td><td class="num">' + mm(a) + '</td>' +
      '<td class="num ' + (up ? 'up' : Math.abs(d) < 0.5 ? '' : 'good') + '"><b>' + diffTxt(b, a) + '</b></td><td class="num">' + pct(b > 0 ? d / b * 100 : null) + '</td>' +
      '<td class="num">' + esc(t('m3.kpi.min', { n: Math.round(sb / 60) })) + ' → ' + esc(t('m3.kpi.min', { n: Math.round(sa / 60) })) + '<div class="sub2 ' + (ds < 0 ? 'up' : 'good') + '">' + (Math.abs(ds) < 30 ? esc(t('m4.same')) : esc(t(ds > 0 ? 'm4.tdown' : 'm4.tup', { n: Math.max(1, Math.round(Math.abs(ds) / 60)) }))) + '</div></td></tr>';
  }
  function recsTab() {
    var R = S.recs, B = S.base;
    var scope = '<div class="m4note">' + esc(t('m4.recs.scope2', { c: nf(B.identified.length), n: nf(B.rounds.length), p: nf(B.partial.length), x: nf(B.rounds.length - B.identified.length) })) + (S.product ? ' ' + esc(t('m4.recs.only', { p: S.product })) : ' ' + esc(t('m4.recs.all'))) + '</div>';
    if (!R) return scope + '<section class="panel"><p class="empty-note">' + esc(t('m4.busy.recs')) + '</p></section>';
    if (!R.list.length) return scope + '<section class="panel"><h2>' + esc(t('m4.norec.title')) + '</h2><p>' + esc(t('m4.norec.' + (R.why || 'nogain'), { c: nf(R.candidates), f: nf(R.failed), n: nf(R.tried) })) + '</p></section>';
    var sum = R.list.reduce(function (s, r) { return s + r.save; }, 0);
    var nfix = R.list.filter(function (r) { return r.fix; }).length;
    var head = scope + (R.misplaced ? '<div class="msg warn m4mis" role="status"><span>' + esc(t('m4.recs.misplaced', { n: nf(R.misplaced), f: nfix })) + '</span></div>' : '') + '<div class="m4note m4rhead"><span>' + esc(t('m4.recs.head2', { n: R.list.length, m: m(sum) })) + '</span><button type="button" class="btn primary" data-m4="simall">' + esc(t('m4.recs.simall', { n: R.list.length })) + '</button></div>';
    function side(p) { return '<span class="code">' + esc(p.code) + '</span><div class="sub2">' + esc(p.name || partName(p.code) || '–') + '</div><div class="m4swl">' + locTag(p.pick.bin) + '<span class="sub2">' + esc(floorTxt(p.pick.floor)) + ' · ' + esc(t('m4.times', { n: nf(p.n || 0) })) + '</span></div>'; }
    var detail = '';
    var rows = R.list.map(function (r, i) {
      var open = S.recOpen === i, sim = r.sim; sim.pairs = sim.pairs || [{ a: r.a, b: r.b }];
      var topA = Array.from(r.a.products.entries()).sort(function (x, y) { return y[1] - x[1]; }).slice(0, 2);
      var reason = r.fix ? t('m4.recs.reasonfix', { a: r.a.code, why: r.fix.map(function (w) { return PWH.rules.ruleText(w.rule); }).join(' / '), b: r.b.code }) : t('m4.recs.reason2', { a: r.a.code, na: nf(r.a.n), prods: topA.map(function (e) { return e[0] + ' (' + e[1] + ')'; }).join(', ') || '–', ca: m(r.a.c), b: r.b.code, nb: nf(r.b.n), cb: m(r.b.c) });
      var tr = '<tr class="m4r' + (open ? ' open' : '') + '" data-m4="ropen" data-v="' + i + '" tabindex="0" aria-expanded="' + open + '"><td class="num m4rank">' + (i + 1) + '</td><td class="m4pn"><span class="m4tag a">A</span>' + side(r.a) + '</td><td class="m4pn"><span class="m4tag b">B</span>' + side(r.b) + '</td>' +
        '<td><b>' + esc(t('m4.rc.affect', { n: sim.byProd.length })) + '</b><div class="sub2">' + esc(t('m4.k.updown', { a: sim.better.length, b: sim.worse.length })) + '</div></td>' +
        '<td>' + (r.rules && r.rules.length ? chip('error', t('m4.rule.fail')) : chip('ok', '✓ ' + t('m4.rule.ok'))) + (r.fix ? '<div class="m4fixc">' + chip('warn', t('m4.recs.fixchip')) + '</div>' : '') + '</td>' +
        '<td class="m4act"><button type="button" class="btn sm primary" data-m4="tosim" data-v="' + i + '">' + esc(t('m4.btn.tosim2')) + '</button></td></tr>';
      if (open) detail = '<section class="panel m4card m4recdp" id="m4recd"><div class="chd"><div class="chd-l"><h2>' + esc(t('m4.rc.detail', { n: i + 1, a: r.a.code, b: r.b.code })) + '</h2></div><button type="button" class="btn sm" data-m4="ropen" data-v="' + i + '">' + esc(t('m4.close')) + '</button></div><div class="m4recd"><p class="m4why">' + esc(reason) + '</p>' + ruleBlock(r.rules) +
        '<h3>' + esc(t('m4.cmp.byprod')) + '</h3><p class="sub2">' + esc(t('m4.recs.used_v', { u: nf(sim.roundsUsed), x: nf(sim.roundsOut) })) + ' · ' + esc(t('m4.cmp.click')) + '</p>' + prodCmp(sim.byProd) +
        routePair(sim, 'rec') + '</div></section>';
      return tr;
    }).join('');
    return head + '<section class="panel m4card"><div class="tablebox m4tb"><table class="m4rect"><thead><tr><th class="num">#</th><th>' + esc(t('m4.rc.a')) + '</th><th>' + esc(t('m4.rc.b')) + '</th><th>' + esc(t('m4.rc.effect')) + '</th><th>' + esc(t('m4.rc.rule')) + '</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div><p class="sub2">' + esc(t('m4.rc.note')) + '</p></section>' + detail;
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
          c.strokeStyle = 'rgba(56,189,248,0.25)'; c.lineWidth = 8; c.stroke(); c.strokeStyle = '#38bdf8'; c.lineWidth = 2.4; c.stroke();
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
        c.fillStyle = '#0d0b18'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(txt, q[0], q[1] - 20);
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
      '<fieldset><legend>Part A</legend><label class="m4f"><span>' + esc(t('m4.col.part')) + '</span><span class="m4sugw"><input id="m4a" value="' + esc(F.a) + '" placeholder="' + esc(t('m4.sim.ph2')) + '" autocomplete="off" role="combobox" aria-expanded="false" aria-controls="m4sug-a" required><span class="m4sug" id="m4sug-a" role="listbox" hidden></span></span></label><label class="m4f"><span>' + esc(t('m4.sim.bin')) + '</span><select id="m4ab">' + (F.a && S.d.bins.has(F.a) ? binOpts(F.a, F.ab) : '<option value="">' + esc(t('m4.sim.pickfirst')) + '</option>') + '</select></label></fieldset>' +
      '<span class="m4x" aria-hidden="true">⇄</span>' +
      '<fieldset><legend>Part B</legend><label class="m4f"><span>' + esc(t('m4.col.part')) + '</span><span class="m4sugw"><input id="m4b" value="' + esc(F.b) + '" placeholder="' + esc(t('m4.sim.ph2')) + '" autocomplete="off" role="combobox" aria-expanded="false" aria-controls="m4sug-b" required><span class="m4sug" id="m4sug-b" role="listbox" hidden></span></span></label><label class="m4f"><span>' + esc(t('m4.sim.bin')) + '</span><select id="m4bb">' + (F.b && S.d.bins.has(F.b) ? binOpts(F.b, F.bb) : '<option value="">' + esc(t('m4.sim.pickfirst')) + '</option>') + '</select></label></fieldset>' +
      '<button class="btn" type="submit">' + esc(t('m4.sim.add')) + '</button></form>' +
      (S.simMsg ? '<div class="msg bad" role="status"><span>' + esc(S.simMsg) + '</span></div>' : '');
    if (S.sim.length) {
      form += '<div class="m4pairs">' + S.sim.map(function (s, i) { return '<div class="m4pr">' + pairHtml(s.a, s.b) + ruleBlock(s.rules) + '<button type="button" class="btn sm danger" data-m4="simdel" data-v="' + i + '">' + esc(t('m4.sim.del')) + '</button></div>'; }).join('') + '</div>';
    } else form += '<p class="empty-note">' + esc(t('m4.sim.empty')) + '</p>';
    var bad = S.sim.some(function (s) { return s.rules.length; });
    form += '<div class="m4acts"><button type="button" class="btn primary" data-m4="simrun"' + (!S.sim.length || bad ? ' disabled' : '') + '>' + esc(t('m4.sim.run2')) + '</button><button type="button" class="btn" data-m4="simclear"' + (S.sim.length || S.simRes ? '' : ' disabled') + '>' + esc(t('m4.sim.reset')) + '</button>' + (bad ? '<span class="sub2">' + esc(t('m4.sim.blocked')) + '</span>' : '') + '</div></section>';
    var R = S.simRes;
    if (R) form += simResult(R);
    return form + savedList();
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
      (R.sameFreq ? '' : '<div class="msg bad" role="status"><span>' + esc(t('m4.err.freq')) + '</span></div>') + saveBox(R);
    if (R.byProd.length) {
      html += '<h3>' + esc(t('m4.sim.byprod')) + '</h3><p class="sub2">' + esc(t('m4.cmp.click')) + '</p>' + prodCmp(R.byProd);
      html += routePair(R, 'sim');
    } else html += noChange(R);
    return html + '</section>';
  }

  // ---------- saved scenarios (read by the dashboard) ----------
  function defName() { var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; }; return t('m4.sv.def', { d: p(d.getDate()) + '/' + p(d.getMonth() + 1), t: fmtTime(Date.now()) }); }
  function saveBox(R) {
    if (R.savedId) return '<div class="m4save"><span class="chip ok">' + esc(t('m4.sv.done', { name: R.savedName })) + '</span><span class="sub2">' + esc(t('m4.sv.done2')) + '</span></div>';
    return '<form class="m4save" id="m4save" autocomplete="off"><label class="m4f"><span>' + esc(t('m4.sv.name')) + '</span><input id="m4svname" maxlength="60" value="' + esc(defName()) + '"></label>' +
      '<button type="submit" class="btn primary">' + esc(t('m4.sv.btn')) + '</button><span class="sub2">' + esc(t('m4.sv.sub')) + '</span></form>';
  }
  function saveScenario(name) {
    var R = S.simRes; if (!R) return;
    var sc = { id: 's' + Date.now().toString(36), name: name || defName(), from: S.from, to: S.to, product: S.product || '', at: Date.now(), key: S.d.key,
      pairs: R.pairs.map(function (x) { return { a: { code: x.a.code, bin: x.a.pick.bin }, b: { code: x.b.code, bin: x.b.pick.bin } }; }),
      before: R.before, after: R.after, save: R.save, pct: R.pct, roundsUsed: R.roundsUsed, roundsOut: R.roundsOut, roundsPartial: R.roundsPartial,
      nProd: R.byProd.length, better: R.better.length, worse: R.worse.length, plantPick: Object.keys(S.plantPick || {}).length > 0 };
    PWH.freq.saveScenario(sc).then(function (l) { R.savedId = sc.id; R.savedName = sc.name; S.saved = l; render(); });
  }
  function savedList() {
    var L = S.saved || []; if (!L.length) return '';
    return '<section class="panel"><div class="chd"><div class="chd-l"><h2>' + esc(t('m4.sv.list', { n: L.length })) + '</h2><p class="sub">' + esc(t('m4.sv.listsub')) + '</p></div></div><div class="tablebox"><table class="m4tb m4svt"><thead><tr><th>' + esc(t('m4.sv.col.name')) + '</th><th>' + esc(t('m4.sv.col.range')) + '</th><th class="num">' + esc(t('m4.sv.col.pairs')) + '</th><th class="num">' + esc(t('m4.sv.col.diff')) + '</th><th>' + esc(t('m4.sv.col.state')) + '</th><th></th></tr></thead><tbody>' +
      L.map(function (x) {
        var old = x.key !== S.d.key;
        return '<tr><td><b>' + esc(x.name) + '</b><div class="sub2">' + esc(t('m4.sv.at', { d: fmtDate(new Date(x.at).toISOString().slice(0, 10)), t: fmtTime(x.at) })) + '</div></td><td>' + esc(fmtDate(x.from) + ' – ' + fmtDate(x.to)) + (x.product ? '<div class="sub2">' + esc(x.product) + '</div>' : '') + '</td><td class="num">' + nf(x.pairs.length) + '</td>' +
          '<td class="num">' + (Math.abs(x.save) < 0.5 ? esc(t('m4.same')) : esc(t(x.save > 0 ? 'm4.down' : 'm4.up', { m: m(Math.abs(x.save)) }))) + '<div class="sub2">' + pct(x.pct == null ? null : Math.abs(x.pct)) + '</div></td>' +
          '<td>' + (old ? chip('warn', t('m4.sv.old')) : chip('ok', t('m4.sv.cur'))) + '</td>' +
          '<td class="m4act"><button type="button" class="btn sm" data-m4="svload" data-v="' + esc(x.id) + '">' + esc(t('m4.sv.load')) + '</button><button type="button" class="btn sm danger" data-m4="svdel" data-v="' + esc(x.id) + '">' + esc(t('m4.sv.del')) + '</button></td></tr>';
      }).join('') + '</tbody></table></div></section>';
  }
  function loadScenario(sc) {
    if (!sc) return;
    S.from = sc.from; S.to = sc.to; S.product = sc.product || ''; S.prodView = null; S.tab = 'sim'; S.view = null; S.simRes = null;
    S.sim = sc.pairs.map(function (x) { return { a: { code: x.a.code, pick: { bin: x.a.bin } }, b: { code: x.b.code, pick: { bin: x.b.bin } }, rules: [] }; });
    S.autoSim = true; run();
  }

  // ---------- simulation: before / after routes side by side, like the pick route page ----------
  // the route of one round of a Product, as the pick route page draws it (ov = the swap scenario, or none)
  function sideRoute(product, plant, ov) {
    var codes = PWH.freq.partsOf(S.d, product, plant), picks = {}, items = [];
    codes.forEach(function (c) { var pk = PWH.freq.pickOf(S.d, c, ov); picks[c] = pk; if (pk.status === 'ok') items.push({ key: c, cands: [{ bin: pk.bin, rack: pk.rack, level: pk.level, floor: pk.floor, stock: 1 }] }); });
    var res = items.length ? PWH.route.plan(S.d.L, items) : { order: [], legs: [], total: 0, unreachable: [] };
    var seq = {}, runs = [];
    res.order.forEach(function (o, i) { seq[o.key] = i + 1; var f = picks[o.key].floor, last = runs[runs.length - 1]; if (last && last.floor === f) last.n++; else runs.push({ floor: f, n: 1 }); });
    var cur = res.start ? res.start.floor : null, lifts = 0; runs.forEach(function (r) { if (cur && r.floor !== cur) lifts++; cur = r.floor; }); if (res.drop && cur !== res.drop.floor) lifts++;
    return { res: res, picks: picks, seq: seq, runs: runs, lifts: lifts, codes: codes, swapped: {}, time: PWH.freq.timeOf(res.total || 0, res.order.length, lifts) };
  }
  function pairRoutes(R, prod) {
    var P = S.base.products.filter(function (x) { return x.product === prod; })[0]; if (!P || !P.plant) return null;
    if (S.rcache && S.rcache.key === prod && S.rcache.R === R) return S.rcache;
    var out = { key: prod, R: R, plant: P.plant, rounds: P.rounds }, sw = {};
    R.pairs.forEach(function (s) { sw[s.a.code] = '#f2b705'; sw[s.b.code] = '#22d3ee'; });
    out.before = sideRoute(prod, P.plant, null); out.after = sideRoute(prod, P.plant, R.ov);
    out.before.swapped = out.after.swapped = sw;
    S.rcache = out; return out;
  }
  function mins(sec) { return Math.max(1, Math.round(sec / 60)); }
  function flowLine(sd) {
    var res = sd.res; if (!res.start) return '<div class="m3flow m4flow"></div>';
    var h = [], cur = res.start.floor, df = res.drop.floor;
    function st(c, tx) { return '<span class="m3st ' + c + '"><i aria-hidden="true"></i>' + esc(tx) + '</span>'; }
    function lift(a, b) { return t(+fnum(b) > +fnum(a) ? 'm3.flow.up' : 'm3.flow.down'); }
    h.push(st('end', t('m2.mk.start')));
    sd.runs.forEach(function (r) { if (r.floor !== cur) h.push(st('lift', lift(cur, r.floor))); cur = r.floor; h.push(st('floor', t('m3.flow.step2', { n: fnum(r.floor), c: r.n }))); });
    if (cur !== df) h.push(st('lift', lift(cur, df)));
    h.push(st('end', t('m2.mk.drop')));
    return '<div class="m3flow m4flow" role="list" aria-label="' + esc(t('m3.flow.title')) + '">' + h.join('<span class="m3ln" aria-hidden="true"></span>') + '</div>';
  }
  function routeCard(side, sd, other, hint) {
    var V = S.rp[side], fl = S.d.L.floors, first = hint || (sd.runs.length ? sd.runs[0].floor : fl[0].id), fi = V.floor == null ? Math.max(0, fl.map(function (f) { return f.id; }).indexOf(first)) : V.floor;
    V.floor = fi;
    var dm = other ? sd.res.total - other.res.total : 0, dt = other ? sd.time.sec - other.time.sec : 0;
    var delta = other && side === 'before' ? '<span class="m4dl none">' + esc(t('m4.rp.base')) + '</span>' : other && side === 'after' && (Math.abs(dm) >= 0.5) ? '<span class="m4dl ' + (dm < 0 ? 'good' : 'up') + '">' + esc(t(dm < 0 ? 'm4.down' : 'm4.up', { m: m(Math.abs(dm)) })) + ' · ' + esc(t(dt < 0 ? 'm4.tdown' : 'm4.tup', { n: Math.max(1, Math.round(Math.abs(dt) / 60)) })) + '</span>' : '';
    return '<div class="m4rp" id="m4rp-' + side + '"><div class="m2mapcard m4rpbox" data-fsbox>' +
      '<div class="m4rph">' + (side === 'pv' ? '' : '<div class="m4rph1"><b class="m4rpt">' + esc(t(side === 'before' ? 'm4.before' : 'm4.after')) + '</b>' + delta + '</div>') +
      '<div class="m4rph2"><span class="m4rpk"><span class="k">' + esc(t('m3.kpi.dist')) + '</span><span class="v">' + mm(sd.res.total || 0) + '</span></span>' +
      '<span class="m4rpk" title="' + esc(t('m3.kpi.time_tip', { w: mins(sd.time.walk), n: sd.res.order.length, p: PWH.SIM.pick, l: sd.lifts, ls: PWH.SIM.lift, v: PWH.SIM.walk })) + '"><span class="k">' + esc(t('m4.simtime')) + '</span><span class="v">' + esc(t('m3.kpi.min', { n: mins(sd.time.sec) })) + '</span><span class="s">' + esc(t('m3.kpi.split', { w: mins(sd.time.walk), p: mins(sd.time.pick + sd.time.lift) })) + '</span></span></div></div>' +
      flowLine(sd) +
      '<div class="m4htool">' + seg(fl.map(function (f, i) { return [String(i), floorTxt(f.id)]; }), String(fi), 'rfloor', ' data-k="' + side + '"') + seg([['2d', '2D'], ['3d', '3D']], V.mode, 'rmode', ' data-k="' + side + '"') +
      '<span class="grow"></span><button type="button" class="btn sm" data-m4="rz" data-k="' + side + '" data-v="out" aria-label="' + esc(t('m4.h.zout')) + '">−</button><button type="button" class="btn sm" data-m4="rz" data-k="' + side + '" data-v="in" aria-label="' + esc(t('m4.h.zin')) + '">+</button><button type="button" class="btn sm" data-m4="rz" data-k="' + side + '" data-v="fit">' + esc(t('m4.h.fit')) + '</button><button type="button" class="btn sm" data-m4="rfs" data-k="' + side + '">' + esc(t('m4.h.fs')) + '</button></div>' +
      '<div class="m2canvas" id="m2wrap"><canvas id="m2cv" tabindex="0" aria-label="' + esc(t('m4.map.aria')) + '"></canvas><div id="m2tip" class="m2tip" hidden></div></div></div></div>';
  }
  function routePair(R, which) {
    var list = R.byProd.map(function (x) { return x.product; }); if (!list.length) return '';
    var key = which + 'Prod'; if (list.indexOf(S[key]) < 0) S[key] = list[0];
    var X = pairRoutes(R, S[key]); if (!X) return '';
    var hint = X.before.runs.length ? X.before.runs[0].floor : null;   // both maps open on the same floor
    var html = '<h3>' + esc(t('m4.rp.title')) + '</h3><div class="m4mbar"><label class="m4f"><span>' + esc(t('m4.map.product')) + '</span><select id="m4sprod" data-w="' + which + '">' + list.map(function (p) { return '<option value="' + esc(p) + '"' + (p === S[key] ? ' selected' : '') + '>' + esc(p + (prodName(p) ? ' · ' + prodName(p) : '')) + '</option>'; }).join('') + '</select></label><span class="sub2">' + esc(t('m4.rp.note', { n: X.rounds })) + '</span></div>' +
      '<div class="m4rpair">' + routeCard('before', X.before, X.after, hint) + routeCard('after', X.after, X.before, hint) + '</div>';
    // order of the picks before and after, A / B and changed rows marked
    var swapped = {}; R.pairs.forEach(function (s) { swapped[s.a.code] = 'A'; swapped[s.b.code] = 'B'; });
    var codes = X.before.codes.slice().sort(function (a, b) { return (X.after.seq[a] || 999) - (X.after.seq[b] || 999); });
    html += '<h3>' + esc(t('m4.rp.order')) + '</h3><div class="tablebox m4tb"><table class="m4ord"><thead><tr><th>' + esc(t('m4.col.part')) + '</th><th class="num">' + esc(t('m4.rp.seq_b')) + '</th><th>' + esc(t('m4.rp.bin_b')) + '</th><th class="num">' + esc(t('m4.rp.seq_a')) + '</th><th>' + esc(t('m4.rp.bin_a')) + '</th><th></th></tr></thead><tbody>' +
      codes.map(function (c) {
        var b = X.before.picks[c], a = X.after.picks[c], sb = X.before.seq[c], sa = X.after.seq[c], tag = swapped[c];
        var moved = b.bin !== a.bin, re = sb !== sa;
        var note = tag ? chip(tag === 'A' ? 'warn' : 'info', t('m4.rp.swapped', { t: tag })) : moved ? chip('info', t('m4.rp.moved')) : re ? chip('info', t('m4.rp.reorder')) : '';
        function binTxt(pk) { return pk.status === 'ok' ? locTag(pk.bin) + ' <span class="sub2">' + esc(floorTxt(pk.floor)) + '</span>' : chip('warn', PWH.freq.locText(pk)); }
        return '<tr class="' + (tag ? 'm4sw' + tag : re ? 'm4re' : '') + '"><td class="m4pn"><span class="code">' + esc(c) + '</span><div class="sub2">' + esc(partName(c) || '–') + '</div></td><td class="num">' + (sb || '–') + '</td><td>' + binTxt(b) + '</td><td class="num"><b>' + (sa || '–') + '</b></td><td>' + binTxt(a) + '</td><td>' + note + '</td></tr>';
      }).join('') + '</tbody></table></div>';
    return html;
  }
  // no Product route changed: say why, and still show where the Parts sit before and after the swap
  function noChange(R) {
    var B = S.base, pm = new Map(); B.parts.forEach(function (p) { pm.set(p.code, p); });
    var many = R.pairs.length > 1, labels = {}, before = { res: { order: [], legs: [], total: 0 }, picks: {}, labels: labels, swapped: {} }, after = { res: { order: [], legs: [], total: 0 }, picks: {}, labels: labels, swapped: {} };
    var lines = [], hint = null, anyIn = false;
    R.pairs.forEach(function (s, i) {
      [['A', s.a, s.b], ['B', s.b, s.a]].forEach(function (x) {
        var tag = x[0] + (many ? i + 1 : ''), code = x[1].code, own = x[1].pick, to = x[2].pick, p = pm.get(x[1].code);
        var n = p ? Array.from(p.products.values()).reduce(function (a, b) { return a + b; }, 0) : 0;
        labels[code] = tag; before.swapped[code] = after.swapped[code] = x[0] === 'A' ? '#f2b705' : '#22d3ee';
        before.picks[code] = own; after.picks[code] = { status: 'ok', bin: to.bin, rack: to.rack, level: to.level, floor: to.floor };
        before.res.order.push({ key: code }); after.res.order.push({ key: code });
        if (!hint) hint = own.floor; if (n) anyIn = true;
        lines.push('<li><span class="m4tag ' + x[0].toLowerCase() + '">' + esc(tag) + '</span><span class="code">' + esc(code) + '</span> ' + locTag(own.bin) + ' <span aria-hidden="true">→</span> ' + locTag(to.bin) + ' <span class="sub2">' + esc(n ? t('m4.nc.inrounds', { n: nf(n) }) : t('m4.nc.norounds')) + '</span></li>');
      });
    });
    S.rcache = { key: '\u0000loc', R: R, before: before, after: after };
    return '<div class="msg warn m4nc" role="status"><span>' + esc(t(anyIn ? 'm4.nc.same' : S.product ? 'm4.nc.why_p' : 'm4.nc.why', { n: nf(R.roundsUsed), p: S.product || '' })) + '</span></div>' +
      '<h3>' + esc(t('m4.nc.title')) + '</h3><ul class="m4nclist">' + lines.join('') + '</ul>' +
      '<div class="m4rpair">' + locCard('before', before, hint) + locCard('after', after, hint) + '</div>';
  }
  function locCard(side, sd, hint) {
    var V = S.rp[side], fl = S.d.L.floors, fi = V.floor == null ? Math.max(0, fl.map(function (f) { return f.id; }).indexOf(hint)) : V.floor;
    V.floor = fi;
    return '<div class="m4rp" id="m4rp-' + side + '"><div class="m2mapcard m4rpbox" data-fsbox><div class="m4rph"><div class="m4rph1"><b class="m4rpt">' + esc(t(side === 'before' ? 'm4.before' : 'm4.after')) + '</b><span class="m4dl none">' + esc(t(side === 'before' ? 'm4.nc.now' : 'm4.nc.swapped')) + '</span></div></div>' +
      '<div class="m4htool">' + seg(fl.map(function (f, i) { return [String(i), floorTxt(f.id)]; }), String(fi), 'rfloor', ' data-k="' + side + '"') + seg([['2d', '2D'], ['3d', '3D']], V.mode, 'rmode', ' data-k="' + side + '"') +
      '<span class="grow"></span><button type="button" class="btn sm" data-m4="rz" data-k="' + side + '" data-v="out" aria-label="' + esc(t('m4.h.zout')) + '">−</button><button type="button" class="btn sm" data-m4="rz" data-k="' + side + '" data-v="in" aria-label="' + esc(t('m4.h.zin')) + '">+</button><button type="button" class="btn sm" data-m4="rz" data-k="' + side + '" data-v="fit">' + esc(t('m4.h.fit')) + '</button><button type="button" class="btn sm" data-m4="rfs" data-k="' + side + '">' + esc(t('m4.h.fs')) + '</button></div>' +
      '<div class="m2canvas" id="m2wrap"><canvas id="m2cv" tabindex="0" aria-label="' + esc(t('m4.map.aria')) + '"></canvas><div id="m2tip" class="m2tip" hidden></div></div></div></div>';
  }
  function drawPair(side) {
    var root = $('#m4rp-' + side), sd = side === 'pv' ? S.pvRoute && S.pvRoute.sd : S.rcache && S.rcache[side]; if (!root || !sd) return;
    var V = S.rp[side], res = sd.res, swapped = sd.swapped || {};
    var K = S.kits['rp-' + side] || (S.kits['rp-' + side] = PWH.mapKit('pwh-m4rp'));
    K.M.root = root; K.M.canvas = null; K.M.layout = S.d.L; K.M.match = S.d.match; K.M.names = true; K.M.rackTint = null; K.M.noDim = false; K.M.noNums = true;
    K.M.mode = V.mode; K.M.floor = V.floor; K.M.sel = null; K.M.hl = null; K.M.onSelect = function () {};
    var racks = new Set(); res.order.forEach(function (o) { var pk = sd.picks[o.key]; if (pk.rack) racks.add(pk.rack); }); K.M.focus = racks;
    K.M.overlay = function (c, Pj, f, o) {
      c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
      (res.legs || []).forEach(function (l) {
        if (l.floor !== f.id || l.pts.length < 2) return;
        c.beginPath(); l.pts.forEach(function (p, i) { var q = Pj(p[0], p[1], 0); if (i) c.lineTo(q[0], q[1]); else c.moveTo(q[0], q[1]); });
        c.strokeStyle = 'rgba(56,189,248,0.25)'; c.lineWidth = 8; c.stroke(); c.strokeStyle = '#38bdf8'; c.lineWidth = 2.4; c.stroke();
      });
      // numbered stops: grouped per rack so the badge reads e.g. "6,8,9"
      var byRack = {}; res.order.forEach(function (o, i) { var pk = sd.picks[o.key]; if (!pk.rack || pk.floor !== f.id) return; (byRack[pk.rack] = byRack[pk.rack] || []).push({ n: i + 1, code: o.key }); });
      c.font = '600 12px "Anuphan", "IBM Plex Sans Thai", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      var placed = [];   // badges of neighbouring racks must not cover each other
      Object.keys(byRack).sort(function (x, y) { return byRack[x][0].n - byRack[y][0].n; }).forEach(function (rid) {
        var r = S.d.match.rackById.get(rid); if (!r) return;
        var H = o.d3 ? r.levels * o.lp : 0, q = Pj(r.x + r.w / 2, r.y + r.h / 2, H), list = byRack[rid], txt = list.map(function (x) { return sd.labels ? sd.labels[x.code] : x.n; }).join(','), col = null;
        list.forEach(function (x) { if (swapped[x.code]) col = swapped[x.code]; });
        var w = Math.max(22, c.measureText(txt).width + 12), ax = q[0], ay = q[1], tries = 0;
        function hit() { return placed.some(function (b) { return Math.abs(b[0] - q[0]) < (b[2] + w) / 2 + 2 && Math.abs(b[1] - q[1]) < 24; }); }
        while (hit() && tries < 8) { tries++; q = [ax + (tries % 2 ? 1 : -1) * Math.ceil(tries / 2) * 0, ay - Math.ceil(tries / 2) * 24 * (tries % 2 ? 1 : -1)]; }
        if (tries) { c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = 1; c.beginPath(); c.moveTo(ax, ay); c.lineTo(q[0], q[1]); c.stroke(); }
        placed.push([q[0], q[1], w]);
        c.fillStyle = col || '#ffffff'; c.strokeStyle = col ? '#0d0b18' : '#38bdf8'; c.lineWidth = 2;
        c.beginPath(); if (c.roundRect) c.roundRect(q[0] - w / 2, q[1] - 11, w, 22, 11); else c.rect(q[0] - w / 2, q[1] - 11, w, 22); c.fill(); c.stroke();
        c.fillStyle = '#0d0b18'; c.fillText(txt, q[0], q[1] + 0.5);
      });
      c.restore();
    };
    K.wireMap(); K.resize(); K.fit(); K.draw();
  }

  // ---------- page ----------
  function render() {
    var R = S.root; if (!R) return;
    var d = S.d;
    var head = '<div class="ph"><div class="ph-l">' + (S.fromDash ? '<button type="button" class="linkbtn m4back" data-m4="todash">' + esc(t('m4.backdash')) + '</button>' : '') + '<h1>' + esc(t('nav.m4')) + '</h1><p class="lede">' + esc(t('m4.intro2')) + '</p></div></div>';
    if (!d) { R.innerHTML = head + busyHtml() + (S.err ? '<div class="msg bad"><span>' + esc(t('m4.err.run', { e: S.err })) + '</span></div>' : ''); return; }
    var miss = []; ['daily', 'bom', 'matloc', 'layout'].forEach(function (k) { if (!d.have[k]) miss.push(t('m4.need.' + k)); });
    if (miss.length) { R.innerHTML = head + '<section class="panel"><h2>' + esc(t('m4.need.title')) + '</h2><p class="sub">' + esc(t('m4.need.list', { list: miss.join(', ') })) + '</p></section>'; return; }
    var note = d.have.monthly ? '' : '<div class="banner" style="margin:0 0 12px">' + esc(t('m4.warn.monthly')) + '</div>';
    var stale = S.stale ? '<div class="m3banner m4stale" role="status"><span>' + esc(t('m4.stale')) + '</span><button type="button" class="btn sm primary" data-m4="recalc">' + esc(t('m4.f.recalc')) + '</button></div>' : '';
    var err = S.err ? '<div class="msg bad" role="status"><span>' + esc(t('m4.err.run', { e: S.err })) + '</span><button type="button" class="btn sm" data-m4="recalc">' + esc(t('m4.retry')) + '</button></div>' : '';
    S.slots = null;
    var gate = S.base && S.base.products.some(function (p) { return p.needPlant; });
    var body = !S.base ? '' : gate ? plantPanel(true) : (S.showPlant ? plantPanel(false) : '') + (S.tab === 'freq' ? freqTab() : S.tab === 'recs' ? recsTab() : simTab());
    var heldWin = window.scrollY;
    R.innerHTML = head + note + stale + toolbar() + scopeLine() + busyHtml() + err + '<div class="m4body' + (S.busy && S.base ? ' m4old' : '') + (S.stale ? ' m4old' : '') + '">' + body + '</div>';
    window.scrollTo(0, heldWin);
    wire();
    if (S.base && S.slots) Object.keys(S.slots).forEach(function (k) { if ($('#m4h-' + k)) mountHeat(S.slots[k]); });
    if ($('#m4rp-before')) { drawPair('before'); drawPair('after'); }
    if ($('#m4rp-pv')) drawPair('pv');
  }
  function wire() {
    var f1 = $('#m4from'), f2 = $('#m4to');
    function dates() { var a = f1.value, b = f2.value; if (!a || !b) return; if (b < a) { var x = a; a = b; b = x; } S.from = a; S.to = b; S.prodView = null; run(); }
    if (f1) f1.addEventListener('change', dates); if (f2) f2.addEventListener('change', dates);
    var pf = $('#m4prodf'); if (pf) pf.addEventListener('change', function () { var v = pf.value.trim(); if (v === S.product) return; S.product = v; S.prodView = null; run(); });
    wireQ(); wireIQ();
    S.root.querySelectorAll('.m4hq').forEach(function (inp) {
      inp.addEventListener('input', function () { S.hq = inp.value; var K = S.kits.f; if (K) { K.M.hl = heatMatches(S.hq); K.draw(); } });
      inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { var K = S.kits.f, set = heatMatches(inp.value); if (K && set && set.size) K.zoomToRacks(Array.from(set)); } });
    });
    var ppl = S.root.querySelector('.m4ppl'); if (ppl) ppl.addEventListener('toggle', function () { S.ppOpen = ppl.open; });
    var rs = $('#m4round'); if (rs) rs.addEventListener('change', function () { S.prodRound = +rs.value; render(); });
    var spd = $('#m4sprod'); if (spd) spd.addEventListener('change', function () { S[spd.getAttribute('data-w') + 'Prod'] = spd.value; S.rp.before.floor = S.rp.after.floor = null; render(); });
    var rp = $('#m4rprod'); if (rp) rp.addEventListener('change', function () { S.view.prod = rp.value; if (S.view.kind === 's') S.simProd = rp.value; drawRoute(S.view.kind); });
    var sv = $('#m4save'); if (sv) sv.addEventListener('submit', function (e) { e.preventDefault(); saveScenario(($('#m4svname').value || '').trim()); });
    var add = $('#m4add');
    if (add) {
      add.addEventListener('submit', function (e) { e.preventDefault(); addSim(); });
      ['a', 'b'].forEach(function (k) {
        var inp = $('#m4' + k), box = $('#m4sug-' + k), hits = [];
        function choose(code) { S.form[k] = code; S.form[k + 'b'] = ''; render(); var nx = $('#m4' + k + 'b'); if (nx) nx.focus(); }
        function show() {
          hits = partHits(inp.value);
          box.innerHTML = hits.length ? hits.map(function (h, i) { return '<span class="m4sgi" role="option" data-i="' + i + '"><span class="code">' + esc(h.code) + '</span><span class="sub2">' + esc(h.name || '–') + '</span><span class="sub2">' + esc(h.info) + '</span></span>'; }).join('') : (inp.value.trim() ? '<span class="m4sgn">' + esc(t('m4.sim.nohit')) + '</span>' : '');
          box.hidden = !box.innerHTML; inp.setAttribute('aria-expanded', String(!box.hidden));
        }
        inp.addEventListener('input', show);
        inp.addEventListener('focus', function () { if (inp.value.trim() && inp.value.trim().toUpperCase() !== S.form[k]) show(); });
        inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); if (hits.length) choose(hits[0].code); } else if (e.key === 'Escape') { box.hidden = true; } });
        inp.addEventListener('blur', function () { setTimeout(function () { if (!document.body.contains(box)) return; box.hidden = true; var v = inp.value.trim().toUpperCase(); if (v && v !== S.form[k] && S.d.bins.has(v)) choose(v); }, 150); });
        box.addEventListener('mousedown', function (e) { var it = e.target.closest('[data-i]'); if (!it) return; e.preventDefault(); choose(hits[+it.getAttribute('data-i')].code); });
        var sel = $('#m4' + k + 'b'); sel.addEventListener('change', function () { S.form[k + 'b'] = sel.value; });
      });
    }
  }
  // the Part search redraws only the table; the new search box gets the same listener, so typing keeps filtering
  function wireQ() {
    var q = $('#m4q'); if (!q || q.dataset.w) return; q.dataset.w = 1;
    q.addEventListener('input', function () { S.q = q.value; var pos = q.selectionStart; var sec = $('#m4parts'); if (sec) { var tmp = document.createElement('div'); tmp.innerHTML = partsTable(); sec.replaceWith(tmp.firstChild); var q2 = $('#m4q'); q2.focus(); q2.setSelectionRange(pos, pos); wireQ(); } });
  }
  function wireIQ() {
    var q = $('#m4iq'); if (!q || q.dataset.w) return; q.dataset.w = 1;
    q.addEventListener('input', function () { S.idleQ = q.value; S.idleMax = 60; var pos = q.selectionStart; var sec = $('#m4idle'); if (sec) { var tmp = document.createElement('div'); tmp.innerHTML = idleCard(); sec.replaceWith(tmp.firstChild); var q2 = $('#m4iq'); q2.focus(); q2.setSelectionRange(pos, pos); wireIQ(); } });
  }
  // Part search for the swap form: any part of the code (e.g. 11236) or of the name; Parts with a bin first
  function partHits(q) {
    q = String(q || '').trim().toUpperCase(); if (q.length < 2) return [];
    var freq = new Map(); S.base.parts.forEach(function (p) { freq.set(p.code, p); });
    var out = [];
    S.d.bins.forEach(function (bins, code) {
      var name = partName(code), C = code.toUpperCase(), at = C.indexOf(q), nm = at < 0 && name.toUpperCase().indexOf(q) >= 0;
      if (at < 0 && !nm) return;
      var f = freq.get(code), pk = f ? f.pick : PWH.freq.pickOf(S.d, code);
      out.push({ code: code, name: name, rank: (at === 0 ? 0 : at > 0 ? 1 : 2) * 1e6 - (f ? f.nRoute : 0), info: pk.status === 'ok' ? pk.bin + ' · ' + t('m4.times', { n: nf(f ? f.nRoute : 0) }) : t('m4.loc.' + pk.status) });
    });
    return out.sort(function (a, b) { return a.rank - b.rank || (a.code < b.code ? -1 : 1); }).slice(0, 12);
  }
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
    else if (a === 'clear') { var r = PWH.freq.defaultRange(S.d); S.from = r.from; S.to = r.to; S.product = ''; S.q = ''; S.prodView = null; S.plantDraft = {}; run(); }
    else if (a === 'open') { if (e.target.closest('button') && e.target.closest('button') !== el) return; S.open = S.open === v ? null : v; render(); }
    else if (a === 'sort') { S.sort = v; render(); }
    else if (a === 'pdraft') { S.plantDraft[k] = v; plantRefresh(); }
    else if (a === 'pall') { ambiguous().forEach(function (p) { if (p.plants.indexOf(v) >= 0) S.plantDraft[p.product] = v; }); plantRefresh(); }
    else if (a === 'papply') { Object.keys(S.plantDraft || {}).forEach(function (p) { S.plantPick[p] = S.plantDraft[p]; }); S.plantDraft = {}; S.showPlant = false; PWH.freq.savePlantPicks(S.plantPick).then(function () { run(true); }); }
    else if (a === 'pchange') { S.showPlant = true; S.plantDraft = {}; render(); var pp = $('#m4plant'); if (pp) pp.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    else if (a === 'pclose') { S.showPlant = false; S.plantDraft = {}; render(); }
    else if (a === 'more') { S.partsMax += 60; render(); }
    else if (a === 'idlemore') { S.idleMax += 60; render(); }
    else if (a === 'idleg') { S.idleG = v; S.idleMax = 60; render(); }
    else if (a === 'idlemap') { var fi2 = S.d.L.floors.map(function (f) { return f.id; }).indexOf(k); if (fi2 >= 0) S.hFloor = fi2; S.hSel.f = v; render(); var sec2 = $('#m4h-f'); if (sec2) sec2.scrollIntoView({ behavior: 'smooth', block: 'center' }); var K3 = S.kits.f; if (K3) K3.zoomToRacks([v]); }
    else if (a === 'prod') { S.prodView = S.prodView === v ? null : v; S.prodRound = 0; render(); var pv = $('#m4pv'); if (pv) pv.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    else if (a === 'onmap') { e.stopPropagation(); selectRackOf(v); }
    else if (a === 'gopart') { S.q = v; S.open = v; render(); var pt = $('#m4parts'); if (pt) pt.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    else if (a === 'gorecs') goTab('recs');
    else if (a === 'simA') { e.stopPropagation(); S.form = { a: v, ab: '', b: '', bb: '' }; goTab('sim'); }
    else if (a === 'hfloor') { S.hFloor = +v; S.root.querySelectorAll('[data-m4=hfloor]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-v') === v); }); Object.keys(S.kits).forEach(function (kk) { if (kk.indexOf('r-') === 0) return; var K = S.kits[kk]; if (K.M.canvas && document.body.contains(K.M.canvas)) { K.M.floor = S.hFloor; K.fit(); K.draw(); } }); }
    else if (a === 'hz') { var K = S.kits[k]; if (!K || !K.M.canvas) return; if (v === 'fit') { K.fit(); K.draw(); } else { var c = K.M.canvas; K.zoomAt(c.clientWidth / 2, c.clientHeight / 2, v === 'in' ? 1.25 : 0.8); } }
    else if (a === 'hfs') { var K2 = S.kits[k]; if (K2) { K2.toggleFs(el); setTimeout(function () { el.textContent = t(K2.M.fs ? 'm4.h.fsexit' : 'm4.h.fs'); }, 80); } }
    else if (a === 'ropen') { if (e.target.closest('button') && e.target.closest('button') !== el) return; S.recOpen = S.recOpen === +v ? null : +v; S.rcache = null; S.recProd = null; S.rp.before.floor = S.rp.after.floor = null; render(); var rd = $('#m4recd'); if (rd) rd.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    else if (a === 'simall') { S.sim = S.recs.list.map(function (r) { return { a: r.a, b: r.b, rules: PWH.freq.checkSwap(S.d, r.a, r.b) }; }); S.simRes = null; S.rcache = null; goTab('sim'); if (!S.sim.some(function (x) { return x.rules.length; })) runSim(); }
    else if (a === 'goiss') { var is = $('#m4iss'); if (is) { is.querySelectorAll('details').forEach(function (d) { d.open = true; }); is.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }
    else if (a === 'tosim') { e.stopPropagation(); S.rcache = null; var rr = S.recs.list[+v]; if (!S.sim.some(function (s) { return s.a.code === rr.a.code && s.b.code === rr.b.code; })) S.sim = [{ a: rr.a, b: rr.b, rules: PWH.freq.checkSwap(S.d, rr.a, rr.b) }]; S.simRes = null; S.view = null; goTab('sim'); if (!S.sim[0].rules.length) runSim(); }
    else if (a === 'simdel') { S.sim.splice(+v, 1); S.simRes = null; render(); }
    else if (a === 'simclear') { S.sim = []; S.simRes = null; S.simMsg = ''; S.view = null; render(); }
    else if (a === 'simrun') runSim();
    else if (a === 'svload') loadScenario((S.saved || []).filter(function (x) { return x.id === v; })[0]);
    else if (a === 'svdel') PWH.freq.deleteScenario(v).then(function (l) { S.saved = l; render(); });
    else if (a === 'todash') PWH.app.go(6);
    else if (a === 'histday') { var A = PWH.app, fd = A.activeFiles('daily').filter(function (x) { return x.planDate === v; })[0]; if (fd) { A.state.tab = 'daily'; A.state.sel.daily = fd.id; } A.go(1); }
    else if (a === 'hist') { S.product = v; S.prodView = null; run(); setTimeout(function () { var h = $('#m4hist'); if (h) h.scrollIntoView({ block: 'start' }); }, 60); }
    else if (a === 'cprod') { S[S.tab === 'recs' ? 'recProd' : 'simProd'] = v; S.rcache = null; S.rp.before.floor = S.rp.after.floor = null; render(); var rpp = $('#m4rp-before'); if (rpp) rpp.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
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
    PWH.freq.scenarios().then(function (l) { S.saved = l; if (S.tab === 'sim' && S.base && document.body.contains(root)) render(); });
    var G = S.pending; S.pending = null; S.fromDash = !!G;
    if (G) {
      // opened from the dashboard: its range, Product and tab
      if (G.tab) S.tab = G.tab;
      if (G.scenario) { S.d ? loadScenario(G.scenario) : (S.from = G.scenario.from, S.to = G.scenario.to, S.product = G.scenario.product || '', S.pendingSc = G.scenario); }
      else { if (G.from) { S.from = G.from; S.to = G.to; } S.product = G.product || ''; S.prodView = null; S.q = G.part || ''; S.open = G.part || null; S.focusPart = !!G.part; S.focusIss = !!G.issues; }
      if (S.d && !G.scenario) { render(); run(); return; }
      if (!S.d) { render(); run(true).then(function () { if (S.pendingSc) { var sc = S.pendingSc; S.pendingSc = null; loadScenario(sc); } }); return; }
      return;
    }
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
  PWH.m4 = { mount: mount, refresh: refresh, base: function () { return S.base; }, go: function (o) { S.pending = o || {}; }, _s: function () { return S; } };
})(window);
