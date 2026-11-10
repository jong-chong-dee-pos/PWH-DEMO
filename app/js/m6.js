/* Module 6: dashboard (spec of 10/11/2026).
 * Reads the per-day results that Module 4 keeps (PWH.freq.days) and the swap scenarios saved in Module 4.
 * It never counts anything in its own way: every number is a sum of those day results.
 * Nothing here changes stored data except calculating days that have no result yet. */
(function (g) {
  var PWH = g.PWH, t = PWH.t;
  var CUR = '#1f5fd1', PREV = '#b58a3c';   // the period shown / the period before it (checked for colour-blind separation)
  var S = {
    root: null, d: null, view: 'day', day: { from: '', to: '' }, month: { y: 0, a: 1, b: 12 }, year: { a: 0, b: 0 },
    cmp: false, mL: 'rounds', mR: 'total', top: 'total', scen: '', stack: [], cur: null, prev: null, scList: [],
    busy: null, err: '', runId: 0, statusOpen: false, tips: {}, dirty: false
  };
  try { var sv = JSON.parse(localStorage.getItem('pwh-m6') || '{}'); ['cmp', 'mL', 'mR', 'top'].forEach(function (k) { if (sv[k] != null) S[k] = sv[k]; }); } catch (e) {}
  function cmpOn() { return S.cmp && !!S.prev; }
  function keep() { try { localStorage.setItem('pwh-m6', JSON.stringify({ cmp: S.cmp, mL: S.mL, mR: S.mR, top: S.top })); } catch (e) {} }

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function nf(n, dg) { return n.toLocaleString('en-US', { minimumFractionDigits: dg || 0, maximumFractionDigits: dg || 0 }); }
  function $(s) { return S.root && S.root.querySelector(s); }
  function F() { return PWH.freq; }
  function addDays(iso, n) { return F().addDays(iso, n); }
  function p2(n) { return (n < 10 ? '0' : '') + n; }
  function lastDay(y, m) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }
  function fmtTime(ms) { var d = new Date(ms); return p2(d.getHours()) + ':' + p2(d.getMinutes()); }

  // ---------- dates in words (Thai: Buddhist year) ----------
  function yoff() { return +t('m6.yoff') || 0; }
  function mon(m) { return t('m6.mon').split(',')[m - 1]; }
  function yr(y) { return String(y + yoff()); }
  function dTxt(iso, withYear) { var y = +iso.slice(0, 4), m = +iso.slice(5, 7), d = +iso.slice(8, 10); return d + ' ' + mon(m) + (withYear ? ' ' + yr(y) : ''); }
  function rangeTxt(P) {
    if (!P) return '';
    if (P.view === 'year') return P.from.slice(0, 4) === P.to.slice(0, 4) ? yr(+P.from.slice(0, 4)) : yr(+P.from.slice(0, 4)) + '–' + yr(+P.to.slice(0, 4));
    if (P.view === 'month') {
      var y1 = +P.from.slice(0, 4), y2 = +P.to.slice(0, 4), m1 = +P.from.slice(5, 7), m2 = +P.to.slice(5, 7);
      if (y1 === y2) return m1 === m2 ? mon(m1) + ' ' + yr(y1) : mon(m1) + '–' + mon(m2) + ' ' + yr(y1);
      return mon(m1) + ' ' + yr(y1) + ' – ' + mon(m2) + ' ' + yr(y2);
    }
    if (P.from === P.to) return dTxt(P.from, true);
    if (P.from.slice(0, 7) === P.to.slice(0, 7)) return +P.from.slice(8, 10) + '–' + dTxt(P.to, true);
    if (P.from.slice(0, 4) === P.to.slice(0, 4)) return dTxt(P.from) + ' – ' + dTxt(P.to, true);
    return dTxt(P.from, true) + ' – ' + dTxt(P.to, true);
  }
  function bucketTxt(b, view, short) { return view === 'year' ? yr(+b.from.slice(0, 4)) : view === 'month' ? mon(+b.from.slice(5, 7)) + (short ? '' : ' ' + yr(+b.from.slice(0, 4))) : dTxt(b.from, !short); }

  // ---------- periods ----------
  function period() {
    if (S.view === 'month') return { view: 'month', from: S.month.y + '-' + p2(S.month.a) + '-01', to: S.month.y + '-' + p2(S.month.b) + '-' + p2(lastDay(S.month.y, S.month.b)) };
    if (S.view === 'year') return { view: 'year', from: S.year.a + '-01-01', to: S.year.b + '-12-31' };
    return { view: 'day', from: S.day.from, to: S.day.to };
  }
  function buckets(P) {
    var out = [];
    if (P.view === 'day') { for (var x = P.from, i = 0; x <= P.to && i < 400; x = addDays(x, 1), i++) out.push({ from: x, to: x }); }
    else if (P.view === 'month') {
      var y = +P.from.slice(0, 4), m = +P.from.slice(5, 7);
      while ((y + '-' + p2(m)) <= P.to.slice(0, 7)) { out.push({ from: y + '-' + p2(m) + '-01', to: y + '-' + p2(m) + '-' + p2(lastDay(y, m)) }); if (++m > 12) { m = 1; y++; } }
    } else for (var yy = +P.from.slice(0, 4); yy <= +P.to.slice(0, 4); yy++) out.push({ from: yy + '-01-01', to: yy + '-12-31' });
    return out;
  }
  // the period just before, with the same number of days / months / years
  function prevOf(P) {
    var n = buckets(P).length;
    if (P.view === 'day') return { view: 'day', from: addDays(P.from, -n), to: addDays(P.from, -1) };
    if (P.view === 'month') {
      var y = +P.from.slice(0, 4), m = +P.from.slice(5, 7) - n; while (m < 1) { m += 12; y--; }
      var ey = +P.from.slice(0, 4), em = +P.from.slice(5, 7) - 1; if (em < 1) { em = 12; ey--; }
      return { view: 'month', from: y + '-' + p2(m) + '-01', to: ey + '-' + p2(em) + '-' + p2(lastDay(ey, em)) };
    }
    var a = +P.from.slice(0, 4) - n; return { view: 'year', from: a + '-01-01', to: (+P.from.slice(0, 4) - 1) + '-12-31' };
  }
  function latest() { var ds = S.d && S.d.dates; return ds && ds.length ? ds[ds.length - 1] : ''; }
  function years() { var s = {}; (S.d ? S.d.dates : []).forEach(function (x) { s[+x.slice(0, 4)] = 1; }); var l = Object.keys(s).map(Number).sort(); return l.length ? l : [new Date().getFullYear()]; }
  function setLast3() { var l = latest(); S.view = 'day'; S.day = { from: l ? addDays(l, -2) : '', to: l }; }
  function setLastMonth() { var l = latest(); if (!l) return; S.view = 'month'; S.month = { y: +l.slice(0, 4), a: +l.slice(5, 7), b: +l.slice(5, 7) }; }
  function setLastYear() { var l = latest(); if (!l) return; S.view = 'year'; S.year = { a: +l.slice(0, 4), b: +l.slice(0, 4) }; }
  function snapshot() { return { view: S.view, day: Object.assign({}, S.day), month: Object.assign({}, S.month), year: Object.assign({}, S.year) }; }
  function restore(x) { S.view = x.view; S.day = x.day; S.month = x.month; S.year = x.year; }

  // ---------- adding up day results ----------
  function emptyAgg() { return { days: 0, plan: 0, done: 0, stale: 0, rounds: 0, ident: 0, complete: 0, freq: 0, m: 0, prods: {}, iss: {}, staleRounds: 0, at: 0 }; }
  function addDay(A, x) {
    A.days++; if (!x.plan) return; A.plan++;
    var s = x.sum; if (!s) return;
    A.done++; if (x.stale) { A.stale++; A.staleRounds += s.rounds; }
    A.rounds += s.rounds; A.ident += s.ident; A.complete += s.complete; A.freq += s.freq; A.m += s.m; A.at = Math.max(A.at, s.at || 0);
    Object.keys(s.prods).forEach(function (p) { var P = A.prods[p] || (A.prods[p] = { r: 0, c: 0, m: 0 }), q = s.prods[p]; P.r += q.r; P.c += q.c; P.m += q.m; });
    Object.keys(s.iss).forEach(function (k) { var I = A.iss[k] || (A.iss[k] = { ids: {}, rk: {} }); Object.assign(I.ids, s.iss[k].ids); Object.assign(I.rk, s.iss[k].rk); });
  }
  function aggregate(P, dayList) {
    var by = {}; dayList.forEach(function (x) { by[x.date] = x; });
    var all = emptyAgg(), bs = buckets(P).map(function (b) {
      var A = emptyAgg(); A.from = b.from; A.to = b.to;
      for (var x = b.from, i = 0; x <= b.to && i < 400; x = addDays(x, 1), i++) { var e = by[x] || { date: x, plan: false }; addDay(A, e); addDay(all, e); }
      return A;
    });
    all.buckets = bs; all.P = P; return all;
  }
  function has(A) { return A && A.done > 0; }

  // ---------- running ----------
  function run(reload) {
    var id = ++S.runId; S.err = ''; S.busy = { step: 'load' }; render();
    var p = reload || !S.d ? F().load().then(function (d) { if (id !== S.runId) return; S.d = d; if (!S.day.to) setLast3(); if (!S.month.y) { var l0 = latest() || '2026-01-01'; S.month = { y: +l0.slice(0, 4), a: +l0.slice(5, 7), b: +l0.slice(5, 7) }; } if (!S.year.a) { var y = years(); S.year = { a: y[y.length - 1], b: y[y.length - 1] }; } }) : Promise.resolve();
    return p.then(function () {
      if (id !== S.runId) return;
      return F().scenarios().then(function (l) { S.scList = l; });
    }).then(function () {
      if (id !== S.runId || !ready()) { if (id === S.runId) { S.busy = null; render(); } return; }
      var P = period(), Q = prevOf(P), lo = S.cmp ? Q.from : P.from;
      return F().days(S.d, lo, P.to).then(function (r) {
        if (id !== S.runId) return;
        if (!r.missing.length) return r;
        S.busy = { step: 'calc', done: 0, total: r.missing.length }; render();
        return F().computeDays(S.d, r.missing, function (i, n) { if (id !== S.runId) return; S.busy = { step: 'calc', done: Math.floor(i), total: n }; var el = $('#m6busy'); if (el) el.outerHTML = busyHtml(); })
          .then(function () { return F().days(S.d, lo, P.to); });
      }).then(function (r) {
        if (id !== S.runId || !r) return;
        S.cur = aggregate(P, r.list.filter(function (x) { return x.date >= P.from; }));
        S.prev = S.cmp ? aggregate(Q, r.list.filter(function (x) { return x.date <= Q.to; })) : null;
        S.missingLeft = r.missing.length; S.busy = null; render();
      });
    }).catch(function (e) { if (id === S.runId) { S.busy = null; S.err = String(e && e.message || e); render(); } });
  }
  function recalcStale() {
    var id = ++S.runId, P = period(), Q = prevOf(P), lo = S.cmp ? Q.from : P.from;
    S.busy = { step: 'load' }; render();
    F().load().then(function (d) { S.d = d; return F().days(d, lo, P.to); }).then(function (r) {
      var list = r.stale.concat(r.missing); S.busy = { step: 'calc', done: 0, total: list.length }; render();
      return F().computeDays(S.d, list, function (i, n) { if (id !== S.runId) return; S.busy = { step: 'calc', done: Math.floor(i), total: n }; var el = $('#m6busy'); if (el) el.outerHTML = busyHtml(); });
    }).then(function () { if (id === S.runId) run(); }).catch(function (e) { if (id === S.runId) { S.busy = null; S.err = String(e && e.message || e); render(); } });
  }
  function ready() { var h = S.d && S.d.have; return h && h.daily && h.bom && h.matloc && h.layout; }
  function busyHtml() {
    var B = S.busy; if (!B) return '<div id="m6busy" hidden></div>';
    var pc = B.total ? Math.round(B.done / B.total * 100) : null;
    return '<div id="m6busy" class="m4busy" role="status"><span class="m4spin" aria-hidden="true"></span><span>' + esc(t('m6.step.' + B.step)) + (B.total ? ' ' + nf(B.done) + '/' + nf(B.total) + ' ' + esc(t('m6.days')) : '') + '</span>' + (pc != null ? '<span class="m4prog"><i style="width:' + pc + '%"></i></span>' : '') + '</div>';
  }

  // ---------- A: period ----------
  function seg(items, cur, act) { return '<div class="seg" role="group">' + items.map(function (i) { return '<button type="button" data-m6="' + act + '" data-v="' + esc(i[0]) + '" aria-pressed="' + (cur === i[0]) + '">' + esc(i[1]) + '</button>'; }).join('') + '</div>'; }
  function opts(list, cur) { return list.map(function (x) { return '<option value="' + esc(x[0]) + '"' + (String(x[0]) === String(cur) ? ' selected' : '') + '>' + esc(x[1]) + '</option>'; }).join(''); }
  function periodBar() {
    var ys = years(), yl = [], months = [];
    for (var y = ys[0] - 1; y <= ys[ys.length - 1]; y++) yl.push([y, yr(y)]);
    for (var m = 1; m <= 12; m++) months.push([m, mon(m)]);
    var pick = S.view === 'day'
      ? '<label class="m6f"><span>' + esc(t('m6.from')) + '</span><input type="date" id="m6from" value="' + esc(S.day.from) + '"></label><label class="m6f"><span>' + esc(t('m6.to')) + '</span><input type="date" id="m6to" value="' + esc(S.day.to) + '"></label>'
      : S.view === 'month'
        ? '<label class="m6f"><span>' + esc(t('m6.year')) + '</span><select id="m6my">' + opts(yl, S.month.y) + '</select></label><label class="m6f"><span>' + esc(t('m6.from')) + '</span><select id="m6ma">' + opts(months, S.month.a) + '</select></label><label class="m6f"><span>' + esc(t('m6.to')) + '</span><select id="m6mb">' + opts(months, S.month.b) + '</select></label>'
        : '<label class="m6f"><span>' + esc(t('m6.from')) + '</span><select id="m6ya">' + opts(yl, S.year.a) + '</select></label><label class="m6f"><span>' + esc(t('m6.to')) + '</span><select id="m6yb">' + opts(yl, S.year.b) + '</select></label>';
    var l = latest(), P = period();
    function sc(act, label, P2) { return '<button type="button" class="m6sc" data-m6="' + act + '"' + (l ? '' : ' disabled') + '><b>' + esc(label) + '</b><span>' + esc(l ? rangeTxt(P2) : '–') + '</span></button>'; }
    var lm = l ? { view: 'month', from: l.slice(0, 8) + '01', to: l.slice(0, 8) + p2(lastDay(+l.slice(0, 4), +l.slice(5, 7))) } : null;
    var ly = l ? { view: 'year', from: l.slice(0, 4) + '-01-01', to: l.slice(0, 4) + '-12-31' } : null;
    var stale = S.cur && S.cur.stale + (S.prev ? S.prev.stale : 0);
    return '<section class="panel m6per">' +
      '<div class="m6row">' + seg([['day', t('m6.v.day')], ['month', t('m6.v.month')], ['year', t('m6.v.year')]], S.view, 'view') + '<div class="m6pick">' + pick + '</div>' +
      '<label class="m6sw"><input type="checkbox" id="m6cmp"' + (S.cmp ? ' checked' : '') + '><span>' + esc(t('m6.cmp')) + '</span></label>' +
      '<span class="grow"></span>' + (stale ? '<button type="button" class="btn primary" data-m6="recalc">' + esc(t('m6.recalc', { n: stale })) + '</button>' : '<button type="button" class="btn" data-m6="reload" title="' + esc(t('m6.reload.t')) + '">' + esc(t('m6.reload')) + '</button>') + '</div>' +
      '<div class="m6row m6row2">' + sc('last3', t('m6.sc.3'), l ? { view: 'day', from: addDays(l, -2), to: l } : null) + sc('lastm', t('m6.sc.m'), lm) + sc('lasty', t('m6.sc.y'), ly) +
      '<span class="grow"></span><div class="m6range">' + (S.stack.length ? '<button type="button" class="btn sm" data-m6="back">' + esc(t('m6.back')) + '</button>' : '') +
      '<span>' + esc(t('m6.range')) + ' <b>' + esc(rangeTxt(P)) + '</b>' + (S.cmp ? ' ' + esc(t('m6.vs')) + ' <b>' + esc(rangeTxt(prevOf(P))) + '</b>' : '') + '</span></div></div>' +
      (S.view === 'day' && buckets(P).length > 93 ? '<p class="sub2 m6hint">' + esc(t('m6.toolong')) + '</p>' : '') +
      '</section>';
  }

  // ---------- B: is the data ready ----------
  function statusBar() {
    var A = S.cur; if (!A) return '';
    var lvl = !A.done ? 'gray' : (A.stale || A.plan < A.days || A.complete < A.rounds || A.done < A.plan) ? 'yellow' : 'green';
    var parts = [t('m6.st.plan', { a: A.plan, b: A.days }), t('m6.st.route', { a: nf(A.complete), b: nf(A.rounds) })];
    if (A.at) parts.push(t('m6.st.at', { t: fmtTime(A.at) }));
    if (A.stale) parts.push(t('m6.st.stale', { n: A.stale }));
    return '<div class="m6st m6st-' + lvl + '" role="status"><i class="m6dot" aria-hidden="true"></i><span class="m6stt">' + esc(t('m6.st.' + lvl)) + '</span><span>' + esc(parts.join(' · ')) + '</span>' +
      '<button type="button" class="linkbtn" data-m6="status" aria-expanded="' + S.statusOpen + '">' + esc(t(S.statusOpen ? 'm6.st.hide' : 'm6.st.show')) + '</button></div>' + (S.statusOpen ? statusPanel() : '');
  }
  function fileTxt(f) { return f ? f.name + ' · ' + t('m6.st.imported', { d: dTxt(new Date(f.activatedAt || f.uploadedAt).toISOString().slice(0, 10), true) }) : t('m6.st.nofile'); }
  function statusPanel() {
    var d = S.d, A = S.cur, P = A.P, noPlan = [], withPlan = [];
    for (var x = P.from, i = 0; x <= P.to && i < 3700; x = addDays(x, 1), i++) (d.dates.indexOf(x) >= 0 ? withPlan : noPlan).push(x);
    function list(a) { return a.length > 12 ? a.slice(0, 12).map(function (x) { return dTxt(x); }).join(', ') + ' ' + t('m6.st.more', { n: a.length - 12 }) : a.map(function (x) { return dTxt(x); }).join(', '); }
    var rl = (d.rules.log || []).reduce(function (a, x) { return Math.max(a, x.at || 0); }, 0);
    var rows = [
      [t('m6.st.daily'), (withPlan.length ? t('m6.st.with', { l: list(withPlan) }) : t('m6.st.none')) + (noPlan.length ? ' · ' + t('m6.st.without', { l: list(noPlan) }) : '')],
      ['BOM', fileTxt(d.files.bom)], ['Material–Location', fileTxt(d.files.matloc)],
      [t('m6.st.layout'), d.L ? (d.L.source || '') + ' · ' + t('m6.st.imported', { d: dTxt(new Date(d.L.importedAt || 0).toISOString().slice(0, 10), true) }) : t('m6.st.nofile')],
      [t('m6.st.rules'), t('m6.st.rulesn', { n: (d.rules.rules || []).filter(function (r) { return !r.off; }).length }) + (rl ? ' · ' + t('m6.st.edited', { d: dTxt(new Date(rl).toISOString().slice(0, 10), true), t: fmtTime(rl) }) : '')],
      [t('m6.st.result'), A.stale ? t('m6.st.res.stale', { n: A.stale }) : A.done ? t('m6.st.res.ok') : t('m6.st.res.none')]
    ];
    return '<div class="m6stp"><table class="m6stt2"><tbody>' + rows.map(function (r) { return '<tr><th scope="row">' + esc(r[0]) + '</th><td>' + esc(r[1]) + '</td></tr>'; }).join('') + '</tbody></table>' +
      '<div class="m6acts"><button type="button" class="btn sm" data-m6="go1">' + esc(t('m6.go1')) + '</button></div></div>';
  }

  // ---------- C: four numbers ----------
  function km(mtr) { return mtr >= 1000 ? { v: nf(mtr / 1000, 1), u: t('m6.u.km'), full: nf(mtr, 1) + ' ' + t('m6.u.m') } : { v: nf(mtr, 1), u: t('m6.u.m'), full: '' }; }
  function deltaTxt(cur, prev, dg, unit, arrowOnly) {
    if (!cmpOn()) return '';
    if (prev == null || cur == null) return '<span class="m6d">' + esc(t('m6.d.na')) + '</span>';
    var dl = cur - prev, pc = prev ? dl / prev * 100 : null, arrow = Math.abs(dl) < Math.pow(10, -(dg || 0)) / 2 ? '=' : dl > 0 ? '▲' : '▼';
    return '<span class="m6d"><i aria-hidden="true">' + arrow + '</i>' + (dl > 0 ? '+' : dl < 0 ? '−' : '') + esc(nf(Math.abs(dl), dg || 0)) + (unit ? ' ' + esc(unit) : '') + ' <span>(' + (pc == null ? '—' : (pc > 0 ? '+' : pc < 0 ? '−' : '') + nf(Math.abs(pc), 1) + '%') + ')</span></span>';
  }
  function card(id, label, info, val, unit, full, sub, dl) {
    return '<div class="m6k"><div class="m6kh"><span class="k">' + esc(label) + '</span><button type="button" class="m6i" aria-label="' + esc(info) + '" data-tip-text="' + esc(info) + '">i</button></div>' +
      (val == null ? '<span class="v na">' + esc(t('m6.nodata')) + '</span>' : '<span class="v"' + (full ? ' title="' + esc(full) + '"' : '') + '>' + esc(val) + (unit ? '<small>' + esc(unit) + '</small>' : '') + '</span>') +
      (sub ? '<span class="s">' + sub + '</span>' : '') + (dl || '') + '</div>';
  }
  function cards() {
    var A = S.cur, B = S.prev, h = has(A), hb = has(B);
    var avg = h && A.complete ? A.m / A.complete : null, avgB = hb && B.complete ? B.m / B.complete : null;
    var dist = h && A.complete ? km(A.m) : null;
    var dUnit = dist && dist.u === t('m6.u.km') ? t('m6.u.km') : t('m6.u.m');
    var dl3 = cmpOn() ? (hb && B.complete && h && A.complete ? (dUnit === t('m6.u.km') ? deltaTxt(A.m / 1000, B.m / 1000, 1, dUnit) : deltaTxt(A.m, B.m, 1, dUnit)) : deltaTxt(null)) : '';
    var cmpNote = cmpOn() ? '<div class="m6cmpn">' + esc(t('m6.vs2', { p: rangeTxt(B.P) })) + (B.plan < B.days || A.plan < A.days ? ' <span class="chip warn">' + esc(t('m6.partial')) + '</span>' : '') + '</div>' : '';
    return '<section class="m6cards" aria-label="' + esc(t('m6.c.title')) + '">' +
      card('rounds', t('m6.c.rounds'), t('m6.c.rounds.i'), h ? nf(A.rounds) : null, t('m6.u.round'), '', h ? esc(t('m6.c.rounds.s', { n: A.plan })) : '', cmpOn() ? deltaTxt(h ? A.rounds : null, hb ? B.rounds : null) : '') +
      card('freq', t('m6.c.freq'), t('m6.c.freq.i'), h ? nf(A.freq) : null, t('m6.u.times'), '', h ? (A.ident < A.rounds ? '<span class="m6warn">' + esc(t('m6.c.freq.part', { a: nf(A.ident), b: nf(A.rounds) })) + '</span>' : esc(t('m6.c.freq.s'))) : '', cmpOn() ? deltaTxt(h ? A.freq : null, hb ? B.freq : null) : '') +
      card('dist', t('m6.c.dist'), t('m6.c.dist.i'), dist ? dist.v : null, dist ? dist.u : '', dist ? dist.full : '', h ? esc(t('m6.c.dist.s', { a: nf(A.complete), b: nf(A.rounds) })) : '', dl3) +
      card('avg', t('m6.c.avg'), t('m6.c.avg.i'), avg != null ? nf(avg, 1) : null, t('m6.u.mr'), '', avg != null ? esc(t('m6.c.avg.s')) : '', cmpOn() ? deltaTxt(avg, avgB, 1, t('m6.u.m')) : '') +
      '</section>' + cmpNote;
  }

  // ---------- D: two trend charts (drawn after the page is on screen, to its real width) ----------
  function trends() {
    return '<section class="m6two">' +
      '<div class="panel m6ch"><div class="chd"><div class="chd-l"><h2>' + esc(t('m6.d.load')) + '</h2><p class="sub">' + esc(t('m6.d.load.s')) + '</p></div>' + seg([['rounds', t('m6.d.rounds')], ['freq', t('m6.d.freq')]], S.mL, 'mL') + '</div>' + legend() + '<div class="m6svg" id="m6cl" role="img" aria-label="' + esc(t('m6.d.load')) + '"></div></div>' +
      '<div class="panel m6ch"><div class="chd"><div class="chd-l"><h2>' + esc(t('m6.d.dist')) + '</h2><p class="sub">' + esc(t('m6.d.dist.s')) + '</p></div>' + seg([['total', t('m6.d.total')], ['avg', t('m6.d.avg')]], S.mR, 'mR') + '</div>' + legend() + '<div class="m6svg" id="m6cr" role="img" aria-label="' + esc(t('m6.d.dist')) + '"></div></div>' +
      '</section>';
  }
  function legend() {
    if (!cmpOn()) return '<p class="m6leg sub2">' + esc(t('m6.d.click.' + S.view)) + '</p>';
    return '<p class="m6leg"><span><i style="background:' + CUR + '"></i>' + esc(rangeTxt(S.cur.P)) + '</span><span><i style="background:' + PREV + '"></i>' + esc(rangeTxt(S.prev.P)) + '</span><span class="sub2">' + esc(t('m6.d.click.' + S.view)) + '</span></p>';
  }
  // gridlines on a clean step (1, 2, 2.5 or 5 × 10^n), up to five of them, the top one just above the largest value
  function scale(v) {
    if (!(v > 0)) return { max: 4, step: 1 };
    var raw = v / 5, p = Math.pow(10, Math.floor(Math.log10(raw))), n = raw / p, st = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
    if (st < 1) st = 1;
    return { max: Math.ceil(v / st) * st, step: st };
  }
  function tick(v) { return v >= 10000 ? nf(v / 1000) + 'K' : nf(v, v < 10 && v % 1 ? 1 : 0); }
  function valL(A) { return S.mL === 'rounds' ? A.rounds : A.freq; }
  function valR(A) { return !A.complete ? null : S.mR === 'total' ? A.m : A.m / A.complete; }
  function tipHtml(A, kind) {
    var rows = kind === 'L'
      ? [[t('m6.tp.rounds'), nf(A.rounds)], [t('m6.tp.freq'), nf(A.freq)], [t('m6.tp.plan'), t('m6.tp.planv', { a: A.plan, b: A.days })], [t('m6.tp.part'), nf(A.rounds - A.complete)]]
      : [[t('m6.tp.dist'), A.complete ? nf(A.m, 1) + ' ' + t('m6.u.m') : '–'], [t('m6.tp.avg'), A.complete ? nf(A.m / A.complete, 1) + ' ' + t('m6.u.m') : '–'], [t('m6.tp.comp'), nf(A.complete)], [t('m6.tp.all'), nf(A.rounds)]];
    return rows;
  }
  function drawCharts() {
    ['L', 'R'].forEach(function (k) {
      var box = $(k === 'L' ? '#m6cl' : '#m6cr'); if (!box) return;
      var W = Math.max(200, box.clientWidth), H = 250, ml = 52, mr = 12, mt = 12, mb = 34, iw = W - ml - mr, ih = H - mt - mb;
      var cur = S.cur.buckets, prev = S.prev ? S.prev.buckets : null, n = cur.length, view = S.view;
      var val = k === 'L' ? valL : valR, vals = [];
      cur.forEach(function (A) { if (A.done) vals.push(val(A)); }); if (prev) prev.forEach(function (A) { if (A.done) vals.push(val(A)); });
      var sc = scale(Math.max.apply(null, vals.filter(function (v) { return v != null; }).concat([0]))), max = sc.max;
      var y = function (v) { return mt + ih - v / max * ih; }, slot = iw / n, cx = function (i) { return ml + slot * i + slot / 2; };
      var g = '';
      for (var j = 0; j * sc.step <= max + 1e-9; j++) { var tv = j * sc.step, yy = y(tv); g += '<line x1="' + ml + '" x2="' + (W - mr) + '" y1="' + yy + '" y2="' + yy + '" class="m6grid"/><text x="' + (ml - 8) + '" y="' + (yy + 4) + '" class="m6ax" text-anchor="end">' + tick(tv) + '</text>'; }
      var every = Math.max(1, Math.ceil(n / Math.floor(iw / (view === 'day' ? 58 : 64))));
      cur.forEach(function (A, i) {
        if (i % every === 0 || n <= 12) g += '<text x="' + cx(i) + '" y="' + (H - 14) + '" class="m6ax" text-anchor="middle">' + esc(bucketTxt(A, view, true)) + '</text>';
        if (!A.plan) g += '<text x="' + cx(i) + '" y="' + (y(0) - 6) + '" class="m6np" text-anchor="middle">' + esc(slot > 52 ? t('m6.noplan') : '–') + '</text>';
      });
      if (k === 'L') {
        var bw = Math.min(24, Math.max(3, (slot - 6) / (prev ? 2 : 1) - 2));
        cur.forEach(function (A, i) {
          var x0 = prev ? cx(i) + 1 : cx(i) - bw / 2;
          if (prev && prev[i] && prev[i].done) g += bar(cx(i) - bw - 1, bw, y(val(prev[i])), y(0), PREV);
          if (A.done) g += bar(x0, bw, y(val(A)), y(0), CUR);
        });
      } else {
        function line(list, col, dash) {
          var out = '', seg2 = [];
          list.forEach(function (A, i) { var v = A.done ? val(A) : null; if (v == null) { if (seg2.length) out += path(seg2); seg2 = []; } else seg2.push([cx(i), y(v)]); });
          if (seg2.length) out += path(seg2);
          function path(p) { return p.length > 1 ? '<polyline points="' + p.map(function (q) { return q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join(' ') + '" fill="none" stroke="' + col + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"' + (dash ? ' stroke-dasharray="5 4"' : '') + '/>' : ''; }
          list.forEach(function (A, i) { var v = A.done ? val(A) : null; if (v != null) out += '<circle cx="' + cx(i) + '" cy="' + y(v) + '" r="4.5" fill="' + col + '" stroke="var(--surface)" stroke-width="2"/>'; });
          return out;
        }
        if (prev) g += line(prev, PREV, true);
        g += line(cur, CUR, false);
      }
      g += '<line x1="' + ml + '" x2="' + (W - mr) + '" y1="' + y(0) + '" y2="' + y(0) + '" class="m6base"/>';
      g += '<line id="m6x' + k + '" class="m6cross" x1="0" x2="0" y1="' + mt + '" y2="' + y(0) + '" visibility="hidden"/>';
      cur.forEach(function (A, i) { g += '<rect class="m6hit" x="' + (ml + slot * i) + '" y="' + mt + '" width="' + slot + '" height="' + (ih + 22) + '" data-k="' + k + '" data-i="' + i + '"' + (A.plan || view !== 'day' ? ' tabindex="0"' : '') + '/>'; });
      box.innerHTML = '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '">' + g + '</svg>';
      box.querySelectorAll('.m6hit').forEach(function (r) {
        function show(e) {
          var i = +r.getAttribute('data-i'), A = cur[i], c = $('#m6x' + k);
          if (c && k === 'R') { c.setAttribute('x1', cx(i)); c.setAttribute('x2', cx(i)); c.setAttribute('visibility', 'visible'); }
          var html = '<b>' + esc(bucketTxt(A, view)) + '</b>' + (A.plan ? tipRows(tipHtml(A, k)) : '<div class="sub2">' + esc(t(view === 'day' ? 'm6.noplan2' : 'm6.noplan3')) + '</div>');
          if (prev && prev[i]) { var B = prev[i]; html += '<div class="m6tsep"><b>' + esc(bucketTxt(B, view)) + '</b>' + (B.plan ? tipRows(tipHtml(B, k).slice(0, 2)) : '<div class="sub2">' + esc(t('m6.noplan2')) + '</div>') + '</div>'; }
          if (A.plan || view !== 'day') html += '<div class="m6thint">' + esc(t('m6.d.click.' + view)) + '</div>';
          tip(html, e);
        }
        r.addEventListener('mousemove', show); r.addEventListener('focus', function () { var b = r.getBoundingClientRect(); show({ clientX: b.left + b.width / 2, clientY: b.top + 40 }); });
        r.addEventListener('mouseleave', hideTip); r.addEventListener('blur', hideTip);
        r.addEventListener('click', function () { drill(cur[+r.getAttribute('data-i')]); });
        r.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); drill(cur[+r.getAttribute('data-i')]); } });
      });
    });
  }
  // a bar with a 4px rounded end, square at the baseline
  function bar(x, w, y0, base, col) {
    var h = base - y0; if (h <= 0.5) return '';
    var r = Math.min(4, w / 2, h);
    return '<path d="M' + x + ',' + base + 'V' + (y0 + r) + 'Q' + x + ',' + y0 + ' ' + (x + r) + ',' + y0 + 'H' + (x + w - r) + 'Q' + (x + w) + ',' + y0 + ' ' + (x + w) + ',' + (y0 + r) + 'V' + base + 'Z" fill="' + col + '"/>';
  }
  function tipRows(rows) { return '<dl>' + rows.map(function (r) { return '<dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd>'; }).join('') + '</dl>'; }
  function tip(html, e) {
    var el = document.getElementById('m6tip'); if (!el) { el = document.createElement('div'); el.id = 'm6tip'; el.className = 'm6tip'; el.setAttribute('role', 'tooltip'); document.body.appendChild(el); }
    el.innerHTML = html; el.hidden = false;
    var w = el.offsetWidth, h = el.offsetHeight, x = e.clientX + 14, y = e.clientY + 14;
    if (x + w > window.innerWidth - 8) x = e.clientX - w - 14; if (y + h > window.innerHeight - 8) y = e.clientY - h - 14;
    el.style.left = Math.max(8, x) + 'px'; el.style.top = Math.max(8, y) + 'px';
  }
  function hideTip() { var el = document.getElementById('m6tip'); if (el) el.hidden = true; ['L', 'R'].forEach(function (k) { var c = $('#m6x' + k); if (c) c.setAttribute('visibility', 'hidden'); }); }
  // year -> its months, month -> its days, day -> Module 4 with that date
  function drill(A) {
    hideTip();
    if (S.view === 'year') { S.stack.push(snapshot()); var y = +A.from.slice(0, 4); S.view = 'month'; S.month = { y: y, a: 1, b: 12 }; run(); }
    else if (S.view === 'month') { S.stack.push(snapshot()); S.view = 'day'; S.day = { from: A.from, to: A.to }; run(); }
    else if (A.plan) openM4({ from: A.from, to: A.to, tab: 'freq' });
  }
  function openM4(o) { PWH.m4.go(o); PWH.app.go(4); }

  // ---------- E: Products with the most distance ----------
  function topProducts() {
    var A = S.cur, list = Object.keys(A.prods).map(function (p) { var x = A.prods[p]; return { p: p, r: x.r, c: x.c, m: x.m, avg: x.c ? x.m / x.c : null }; });
    var total = list.reduce(function (s, x) { return s + x.m; }, 0);
    list = S.top === 'total' ? list.filter(function (x) { return x.m > 0; }).sort(function (a, b) { return b.m - a.m; }) : list.filter(function (x) { return x.avg != null && x.avg > 0; }).sort(function (a, b) { return b.avg - a.avg; });
    list = list.slice(0, 5);
    var max = list.reduce(function (s, x) { return Math.max(s, S.top === 'total' ? x.m : x.avg); }, 0) || 1;
    S.tips.top = {};
    var rows = list.map(function (x, i) {
      var v = S.top === 'total' ? x.m : x.avg, name = S.d.desc.get(x.p) || '';
      S.tips.top[i] = '<b>' + esc(x.p) + '</b>' + (name ? '<div class="sub2">' + esc(name) + '</div>' : '') + tipRows([[t('m6.tp.planr'), nf(x.r)], [t('m6.tp.dist'), nf(x.m, 1) + ' ' + t('m6.u.m')], [t('m6.tp.avg'), x.avg != null ? nf(x.avg, 1) + ' ' + t('m6.u.m') : '–'], [t('m6.tp.share'), total ? nf(x.m / total * 100, 1) + '%' : '–'], [t('m6.tp.compl'), x.c === x.r ? t('m6.tp.full') : t('m6.tp.partv', { a: x.c, b: x.r })]]) + '<div class="m6thint">' + esc(t('m6.e.click')) + '</div>';
      return '<button type="button" class="m6tr" data-m6="topgo" data-v="' + esc(x.p) + '" data-tip="top:' + i + '"><span class="m6tn"><span class="code">' + esc(x.p) + '</span><span class="sub2">' + esc(name || '–') + '</span></span>' +
        '<span class="m6tb"><i style="width:' + Math.max(2, v / max * 100).toFixed(1) + '%"></i></span><span class="m6tv"><b>' + esc(nf(v, 1)) + '</b> ' + esc(t(S.top === 'total' ? 'm6.u.m' : 'm6.u.mr')) + '<span class="sub2">' + esc(t('m6.e.comp', { n: x.c })) + (x.c < x.r ? ' · ' + esc(t('m6.e.of', { n: x.r })) : '') + '</span></span></button>';
    }).join('');
    return '<section class="panel"><div class="chd"><div class="chd-l"><h2>' + esc(t('m6.e.title')) + '</h2><p class="sub">' + esc(t('m6.e.sub')) + '</p></div>' + seg([['total', t('m6.e.total')], ['avg', t('m6.e.avg')]], S.top, 'top') + '</div>' +
      (rows ? '<div class="m6top">' + rows + '</div>' : '<p class="empty-note">' + esc(t('m6.e.none')) + '</p>') + '</section>';
  }

  // ---------- F: a saved swap scenario ----------
  function scenario() {
    var L = S.scList || [], head = '<div class="chd"><div class="chd-l"><h2>' + esc(t('m6.f.title')) + '</h2><p class="sub">' + esc(t('m6.f.sub')) + '</p></div>';
    if (!L.length) return '<section class="panel">' + head + '</div><div class="m6empty"><p>' + esc(t('m6.f.none')) + '</p><p class="sub2">' + esc(t('m6.f.none2')) + '</p><button type="button" class="btn" data-m6="gosim">' + esc(t('m6.f.gosim')) + '</button></div></section>';
    var sc = L.filter(function (x) { return x.id === S.scen; })[0] || L[0];
    head += (L.length > 1 ? '<label class="m6f"><span>' + esc(t('m6.f.pick')) + '</span><select id="m6scen">' + L.map(function (x) { return '<option value="' + esc(x.id) + '"' + (x.id === sc.id ? ' selected' : '') + '>' + esc(x.name) + '</option>'; }).join('') + '</select></label>' : '') + '</div>';
    var st = sc.key !== S.d.key ? ['warn', t('m6.f.st.old')] : (sc.roundsOut || sc.roundsPartial) ? ['warn', t('m6.f.st.part')] : ['ok', t('m6.f.st.ok')];
    var P = { view: 'day', from: sc.from, to: sc.to }, same = S.view === 'day' && sc.from === S.cur.P.from && sc.to === S.cur.P.to;
    var dlt = sc.before - sc.after, max = Math.max(sc.before, sc.after) || 1, at = new Date(sc.at);
    return '<section class="panel">' + head +
      '<div class="m6sc1"><div class="m6sch"><b>' + esc(sc.name) + '</b><span class="chip ' + st[0] + '">' + esc(st[1]) + '</span>' + (sc.plantPick ? '<span class="chip info">' + esc(t('m6.f.plant')) + '</span>' : '') + '</div>' +
      '<p class="sub2">' + esc(t('m6.f.range', { r: rangeTxt(P) })) + (sc.product ? ' · ' + esc(t('m6.f.prod', { p: sc.product })) : '') + ' · ' + esc(t('m6.f.at', { d: dTxt(at.toISOString().slice(0, 10), true), t: fmtTime(sc.at) })) + '</p>' +
      (same ? '' : '<div class="m6diffr" role="note">' + esc(t('m6.f.other', { a: rangeTxt(P), b: rangeTxt(S.cur.P) })) + '</div>') +
      '<div class="m6sgrid"><div><span class="k">' + esc(t('m6.f.before')) + '</span><span class="v">' + esc(nf(sc.before, 1)) + '<small>' + esc(t('m6.u.m')) + '</small></span></div>' +
      '<div><span class="k">' + esc(t('m6.f.after')) + '</span><span class="v">' + esc(nf(sc.after, 1)) + '<small>' + esc(t('m6.u.m')) + '</small></span></div>' +
      '<div><span class="k">' + esc(t(Math.abs(dlt) < 0.5 ? 'm6.f.same' : dlt > 0 ? 'm6.f.down' : 'm6.f.up')) + '</span><span class="v">' + esc(nf(Math.abs(dlt), 1)) + '<small>' + esc(t('m6.u.m')) + '</small></span><span class="s">' + (sc.pct == null ? '—' : nf(Math.abs(sc.pct), 1) + '%') + '</span></div>' +
      '<div class="m6sbars" aria-hidden="true"><span>' + esc(t('m6.f.before')) + '</span><span class="m6sb"><i style="width:' + (sc.before / max * 100).toFixed(1) + '%;background:' + PREV + '"></i></span><span>' + esc(t('m6.f.after')) + '</span><span class="m6sb"><i style="width:' + (sc.after / max * 100).toFixed(1) + '%;background:' + CUR + '"></i></span></div></div>' +
      '<div class="m6sfoot"><span>' + esc(t('m6.f.foot', { p: sc.pairs.length, q: sc.nProd, r: nf(sc.roundsUsed) })) + '</span><button type="button" class="btn primary" data-m6="opensc" data-v="' + esc(sc.id) + '">' + esc(t('m6.f.open')) + '</button></div></div></section>';
  }

  // ---------- G: what needs attention ----------
  function issues() {
    var A = S.cur, I = A.iss, out = [];
    function n(k) { return I[k] ? Object.keys(I[k].ids).length : 0; }
    function r(k) { return I[k] ? Object.keys(I[k].rk).length : 0; }
    [['order', 'm6.g.order', 'm6.g.order.n'], ['nobom', 'm6.g.nobom', 'm6.g.nobom.n'], ['noloc', 'm6.g.noloc', 'm6.g.noloc.n'], ['layout', 'm6.g.layout', 'm6.g.layout.n'], ['rule', 'm6.g.rule', 'm6.g.rule.n']].forEach(function (x) {
      if (n(x[0])) out.push({ k: x[0], title: t(x[1]), n: t(x[2], { n: nf(n(x[0])) }), r: r(x[0]) });
    });
    if (A.stale) out.push({ k: 'stale', title: t('m6.g.stale'), n: t('m6.g.stale.n', { n: A.stale }), r: A.staleRounds });
    out.sort(function (a, b) { return b.r - a.r; }); out = out.slice(0, 5);
    function acts(k) {
      if (k === 'stale') return '<button type="button" class="btn sm primary" data-m6="recalc">' + esc(t('m6.g.recalc')) + '</button>';
      if (k === 'rule') return '<button type="button" class="btn sm" data-m6="go5">' + esc(t('m6.g.go5')) + '</button>';
      if (k === 'layout') return '<button type="button" class="btn sm" data-m6="goiss">' + esc(t('m6.g.detail')) + '</button><button type="button" class="btn sm" data-m6="go2">' + esc(t('m6.g.go2')) + '</button>';
      return '<button type="button" class="btn sm" data-m6="goiss">' + esc(t('m6.g.go4')) + '</button>';
    }
    return '<section class="panel"><div class="chd"><div class="chd-l"><h2>' + esc(t('m6.g.title')) + '</h2><p class="sub">' + esc(t('m6.g.sub')) + '</p></div></div>' +
      (out.length ? '<ul class="m6iss">' + out.map(function (x) { return '<li><div><b>' + esc(x.title) + '</b><span class="sub2">' + esc(x.n) + ' · ' + esc(t('m6.g.hit', { n: nf(x.r) })) + '</span></div><div class="m6acts">' + acts(x.k) + '</div></li>'; }).join('') + '</ul>' : '<p class="m6ok">' + esc(t('m6.g.none')) + '</p>') + '</section>';
  }

  // ---------- page ----------
  function skeleton() { return '<section class="m6cards">' + [0, 1, 2, 3].map(function () { return '<div class="m6k m6sk"><i></i><i></i><i></i></div>'; }).join('') + '</section><section class="m6two"><div class="panel m6sk m6skc"></div><div class="panel m6sk m6skc"></div></section>'; }
  function render() {
    var R = S.root; if (!R) return;
    hideTip();
    var head = '<div class="ph"><div class="ph-l"><h1>' + esc(t('m6.title')) + '</h1><p class="lede">' + esc(t('m6.lede')) + '</p></div></div>';
    if (!S.d) { R.innerHTML = head + busyHtml() + (S.err ? '<div class="msg bad"><span>' + esc(t('m6.err', { e: S.err })) + '</span></div>' : '') + skeleton(); return; }
    var miss = []; ['daily', 'bom', 'matloc', 'layout'].forEach(function (k) { if (!S.d.have[k]) miss.push(k); });
    if (miss.length) {
      R.innerHTML = head + '<section class="panel m6need"><h2>' + esc(t('m6.need.title')) + '</h2><p class="sub">' + esc(t('m6.need.sub', { list: miss.map(function (k) { return t('m4.need.' + k); }).join(', ') })) + '</p><div class="m6acts">' +
        (miss.some(function (k) { return k !== 'layout'; }) ? '<button type="button" class="btn primary" data-m6="go1">' + esc(t('m6.go1')) + '</button>' : '') + (miss.indexOf('layout') >= 0 ? '<button type="button" class="btn" data-m6="go2">' + esc(t('m6.g.go2')) + '</button>' : '') + '</div></section>';
      return;
    }
    var err = S.err ? '<div class="msg bad" role="status"><span>' + esc(t('m6.err', { e: S.err })) + '</span><button type="button" class="btn sm" data-m6="reload">' + esc(t('m6.retry')) + '</button></div>' : '';
    var body = !S.cur || (S.busy && !S.cur) ? skeleton() : cards() + trends() + topProducts() + scenario() + issues();
    var held = window.scrollY;
    R.innerHTML = head + periodBar() + busyHtml() + err + (S.cur ? statusBar() : '') + '<div class="m6body' + (S.busy && S.cur ? ' m4old' : '') + '">' + body + '</div>';
    window.scrollTo(0, held);
    wire();
    if (S.cur && !(S.busy && !S.cur)) drawCharts();
  }
  function wire() {
    function on(id, ev, fn) { var el = $(id); if (el) el.addEventListener(ev, fn); }
    function dayChange() { var a = $('#m6from').value, b = $('#m6to').value; if (!a || !b) return; if (b < a) { var x = a; a = b; b = x; } S.day = { from: a, to: b }; S.stack = []; run(); }
    on('#m6from', 'change', dayChange); on('#m6to', 'change', dayChange);
    function monChange() { var y = +$('#m6my').value, a = +$('#m6ma').value, b = +$('#m6mb').value; if (b < a) { var x = a; a = b; b = x; } S.month = { y: y, a: a, b: b }; S.stack = []; run(); }
    ['#m6my', '#m6ma', '#m6mb'].forEach(function (id) { on(id, 'change', monChange); });
    function yrChange() { var a = +$('#m6ya').value, b = +$('#m6yb').value; if (b < a) { var x = a; a = b; b = x; } S.year = { a: a, b: b }; S.stack = []; run(); }
    ['#m6ya', '#m6yb'].forEach(function (id) { on(id, 'change', yrChange); });
    on('#m6cmp', 'change', function () { S.cmp = $('#m6cmp').checked; keep(); run(); });
    on('#m6scen', 'change', function () { S.scen = $('#m6scen').value; render(); });
    S.root.querySelectorAll('[data-tip]').forEach(function (el) {
      var k = el.getAttribute('data-tip').split(':');
      function show(e) { var h = S.tips[k[0]] && S.tips[k[0]][k[1]]; if (h) tip(h, e); }
      el.addEventListener('mousemove', show); el.addEventListener('mouseleave', hideTip); el.addEventListener('blur', hideTip);
      el.addEventListener('focus', function () { var b = el.getBoundingClientRect(); show({ clientX: b.left + b.width * 0.6, clientY: b.bottom }); });
    });
    S.root.querySelectorAll('[data-tip-text]').forEach(function (el) {
      function show(e) { tip(esc(el.getAttribute('data-tip-text')), e); }
      el.addEventListener('mousemove', show); el.addEventListener('mouseleave', hideTip); el.addEventListener('blur', hideTip);
      el.addEventListener('focus', function () { var b = el.getBoundingClientRect(); show({ clientX: b.left, clientY: b.bottom }); });
    });
  }
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-m6]'); if (!el || !S.root || !S.root.contains(el)) return;
    var a = el.getAttribute('data-m6'), v = el.getAttribute('data-v'), P = S.cur ? S.cur.P : period();
    if (a === 'view') { if (S.view === v) return; S.view = v; S.stack = []; run(); }
    else if (a === 'last3') { S.stack = []; setLast3(); run(); }
    else if (a === 'lastm') { S.stack = []; setLastMonth(); run(); }
    else if (a === 'lasty') { S.stack = []; setLastYear(); run(); }
    else if (a === 'back') { var x = S.stack.pop(); if (x) { restore(x); run(); } }
    else if (a === 'reload') run(true);
    else if (a === 'recalc') recalcStale();
    else if (a === 'status') { S.statusOpen = !S.statusOpen; render(); }
    else if (a === 'mL' || a === 'mR' || a === 'top') { S[a] = v; keep(); render(); }
    else if (a === 'topgo') openM4({ from: P.from, to: P.to, product: v, tab: 'freq' });
    else if (a === 'goiss') openM4({ from: P.from, to: P.to, tab: 'freq', issues: true });
    else if (a === 'opensc') openM4({ tab: 'sim', scenario: (S.scList || []).filter(function (x) { return x.id === v; })[0] });
    else if (a === 'gosim') openM4({ from: P.view === 'day' ? P.from : '', to: P.view === 'day' ? P.to : '', tab: 'sim' });
    else if (a === 'go1') PWH.app.go(1);
    else if (a === 'go2') PWH.app.go(2);
    else if (a === 'go5') PWH.app.go(5);
  });
  var rz = null;
  window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(function () { if (S.root && document.body.contains(S.root) && S.cur && !S.busy) drawCharts(); }, 120); });
  function mount(root) {
    S.root = root;
    if (S.d && !S.dirty) {
      // coming back: keep every choice; re-read the results (Module 4 may have added or replaced days)
      render();
      F().keyNow().then(function (k) { run(k !== S.d.key); });
      return;
    }
    S.dirty = false; render(); run(true);
  }
  function refresh() { S.dirty = true; if (S.root && document.body.contains(S.root) && S.d) { S.dirty = false; run(true); } }
  PWH.m6 = { mount: mount, refresh: refresh, _s: function () { return S; } };
})(window);
