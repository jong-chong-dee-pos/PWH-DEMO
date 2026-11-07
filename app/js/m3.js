/* Module 3: pick navigation.
 * Search a Product (or a JOB number) -> every Part of its BOM with the bin to pick it from, in walking order,
 * and the route drawn on the warehouse map. Made to be read aloud or copied down by warehouse staff:
 * search box first, big list, no clicks needed to get the answer. */
(function (g) {
  var PWH = g.PWH, t = PWH.t;
  var D = null;            // data built from the files in use
  var K = null;            // map kit instance
  var P = { q: '', sug: [], act: -1, sel: null, plant: {}, result: null, calc: false, stop: null, stale: false, root: null, loading: false, flt: 'all' };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function nf(n) { return typeof n === 'number' ? n.toLocaleString('en-US', { maximumFractionDigits: 2 }) : esc(n); }
  function $(s) { return P.root && P.root.querySelector(s); }
  function fmtDate(iso) { return iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4) : ''; }

  // ---------- data ----------
  function keyNow() {
    var A = PWH.app, ids = function (ty) { return A.activeFiles(ty).map(function (f) { return f.id; }).sort().join(','); };
    return [ids('bom'), ids('matloc'), ids('daily'), ids('monthly')].join('|');
  }
  function load() {
    var A = PWH.app, key = keyNow();
    var bom = A.activeFile('bom'), ml = A.activeFile('matloc'), daily = A.activeFiles('daily'), monthly = A.activeFiles('monthly');
    P.loading = true;
    return Promise.all([
      bom ? PWH.db.getRows(bom.id) : null, ml ? PWH.db.getRows(ml.id) : null,
      Promise.all(daily.map(function (f) { return PWH.db.getRows(f.id).then(function (r) { return { date: f.planDate, rows: r }; }); })),
      Promise.all(monthly.map(function (f) { return PWH.db.getRows(f.id); })),
      PWH.db.getMeta('layout').catch(function () { return null; })
    ]).then(function (r) {
      var d = { key: key, have: { bom: !!r[0], matloc: !!r[1] }, L: r[4] || null, exp: {}, bins: new Map(), jobs: [], jobBy: new Map(), orderPlant: new Map(), tops: [], parents: null, text: new Map(), desc: new Map() };
      if (r[0]) {
        d.index = PWH.checks.buildIndex(r[0]); d.parents = d.index.parents;
        var comps = new Set();
        r[0].forEach(function (row) { comps.add(row[2]); if (row[3] && !d.text.has(row[2])) d.text.set(row[2], row[3]); });
        d.parents.forEach(function (v) {});
        d.index.parents.forEach(function (p) { if (!comps.has(p)) d.tops.push(p); });
        d.tops.sort();
      }
      if (r[1]) r[1].forEach(function (row) {
        if (!row[2]) return;
        var a = d.bins.get(row[2]); if (!a) d.bins.set(row[2], (a = [])); a.push({ bin: row[1], stype: row[0], stock: row[4] });
      });
      r[2].forEach(function (day) {
        day.rows.forEach(function (row) {
          var j = { job: String(row[0]), date: day.date, product: row[1], desc: row[2], qty: row[3] };
          d.jobs.push(j); var l = d.jobBy.get(j.job); if (!l) d.jobBy.set(j.job, (l = [])); l.push(j);
          if (row[2] && !d.desc.has(row[1])) d.desc.set(row[1], row[2]);
        });
      });
      d.jobs.sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : a.job < b.job ? -1 : 1; });
      r[3].forEach(function (rows) { rows.forEach(function (row) { d.orderPlant.set(String(row[2]), row[1]); if (row[4] && !d.desc.has(row[3])) d.desc.set(row[3], row[4]); }); });
      if (d.L && d.have.matloc) d.match = PWH.layout.match(d.L, r[1]);
      else if (d.L) d.match = PWH.layout.match(d.L, []);
      D = d; P.loading = false; P.stale = false;
      if (K) { K.M.layout = d.L; K.M.match = d.match || null; }
    });
  }

  // ---------- search ----------
  function suggest(q) {
    q = q.trim().toLowerCase(); if (!q || !D) return [];
    var out = [], i, digits = /^\d+$/.test(q);
    function pushJobs() {
      for (i = 0; i < D.jobs.length && out.length < 10; i++) {
        var j = D.jobs[i]; if (j.job.indexOf(q) === 0 || (q.length >= 4 && j.job.indexOf(q) > 0)) out.push({ kind: 'job', code: j.job, job: j, product: j.product });
      }
    }
    if (digits) pushJobs();
    var pre = [], mid = [];
    for (i = 0; i < D.tops.length && pre.length < 10; i++) {
      var c = D.tops[i], k = c.toLowerCase().indexOf(q);
      if (k === 0) pre.push(c); else if (k > 0 && mid.length < 10) mid.push(c);
    }
    pre.concat(mid).slice(0, 10 - out.length).forEach(function (c) { out.push({ kind: 'product', code: c, product: c }); });
    if (!digits && out.length < 10) pushJobs();
    return out;
  }
  function renderSug() {
    var el = $('#m3sug'), res = $('#m3res'); if (!el) return;
    var lv = $('#m3live'); if (lv) lv.textContent = P.q.trim() && !(P.sel && P.sel.label === P.q) ? t('m3.sug.found', { n: P.sug.length }) : '';
    var show = P.q.trim() && !(P.sel && P.sel.label === P.q);
    var inp0 = $('#m3q'); if (inp0) inp0.setAttribute('aria-expanded', show ? 'true' : 'false');
    if (!show) { el.hidden = true; el.innerHTML = ''; return; }
    el.hidden = false;
    if (!P.sug.length) { el.innerHTML = '<div class="m3none">' + esc(t('m3.sug.none')) + '</div>'; return; }
    el.innerHTML = '<div class="m3sh"><b>' + esc(t('m3.sug.found', { n: P.sug.length })) + '</b><span>' + esc(t('m3.sug.hint')) + '</span></div><div class="m3opts">' +
      P.sug.map(function (s, i) {
        var desc = D && D.desc.get(s.product), n = kidsN(s.product);
        var tag = s.kind === 'job' ? '<span class="m3tag job">' + esc(t('m3.kind.job')) + ' ' + esc(fmtDate(s.job.date)) + '</span>' : '<span class="m3tag">' + esc(t('m3.sug.product')) + '</span>';
        var sub = s.kind === 'job' ? '<span class="code">' + esc(s.product) + '</span>' + (desc ? ' · ' + esc(desc) : '') : (desc ? esc(desc) : '');
        return '<button class="m3o" role="option" data-m3="pick" data-i="' + i + '" aria-selected="' + (i === P.act) + '"><span class="m3oc code">' + esc(s.code) + '</span>' + tag + (sub ? '<span class="m3os">' + sub + '</span>' : '') + (n ? '<span class="m3on">' + esc(t('m3.sug.parts', { n: n })) + '</span>' : '') + '</button>';
      }).join('') + '</div>';
  }
  function kidsN(prod) { var n = 0; if (D && D.index) D.index.byPlant.forEach(function (pm) { var k = pm.get(prod); if (k && k.size > n) n = k.size; }); return n; }
  function choose(s) {
    P.sel = { kind: s.kind, product: s.product, job: s.job || null, label: s.code };
    P.q = s.code; var inp = $('#m3q'); if (inp) inp.value = s.code;
    P.sug = []; P.act = -1; P.stop = null; renderSug(); solve();
  }

  // ---------- result ----------
  function plantFor(sel) {
    var plants = D.parents && D.parents.has(sel.product) ? Array.from(D.index.byPlant.keys()).filter(function (p) { return D.index.byPlant.get(p).has(sel.product); }).sort() : [];
    var chosen = P.plant[sel.job ? sel.job.job + '|' + sel.product : sel.product];
    if (chosen && plants.indexOf(chosen) >= 0) return { plants: plants, plant: chosen, how: 'chosen' };
    if (plants.length === 1) return { plants: plants, plant: plants[0], how: 'only' };
    if (sel.job) {
      var pl = D.orderPlant.get(sel.job.job);
      if (pl && plants.indexOf(pl) >= 0) return { plants: plants, plant: pl, how: 'job' };
      return { plants: plants, plant: null, ask: 'job' };
    }
    return { plants: plants, plant: null, ask: 'both' };
  }
  function exploder(plant) { if (!D.exp[plant]) D.exp[plant] = PWH.checks.makeExploder(D.index, [plant]); return D.exp[plant]; }
  function binLoc(bin) {
    if (!D.L || !D.match) return { kind: 'nolayout' };
    var bi = PWH.layout.binInfo(bin); if (!bi) return { kind: 'special' };
    var rack = D.match.rackById.get(bi.rack); if (!rack) return { kind: 'norack' };
    return { kind: 'rack', rack: bi.rack, level: bi.level, floor: { id: rack.floor } };
  }
  function natural(a, b) { return a < b ? -1 : a > b ? 1 : 0; }

  function solve() {
    var sel = P.sel; if (!sel || !D) { P.result = null; renderResult(); return; }
    var pp = plantFor(sel);
    var R = { sel: sel, pp: pp, parts: [], routed: [], off: [], nobin: [], total: 0, legs: [], bridges: 0 };
    P.result = R;
    if (!D.parents.has(sel.product)) { R.nobom = true; renderResult(); drawMap(); return; }
    if (!pp.plant) { R.ask = pp.ask; renderResult(); drawMap(); return; }
    var qtyJob = sel.job ? sel.job.qty : null;
    var leaves = Array.from(exploder(pp.plant).leaves(sel.product).entries()).sort(function (a, b) { return natural(a[0], b[0]); });
    if (!leaves.length) { R.noparts = true; renderResult(); drawMap(); return; }
    var routable = [];
    leaves.forEach(function (e) {
      var code = e[0], bins = (D.bins.get(code) || []).map(function (b) { return { bin: b.bin, stock: b.stock, loc: binLoc(b.bin) }; });
      var part = { code: code, name: D.text.get(code) || '', per: e[1], total: qtyJob != null ? e[1] * qtyJob : null, bins: bins };
      R.parts.push(part);
      if (!bins.length) { R.nobin.push(part); return; }
      var rack = bins.filter(function (b) { return b.loc.kind === 'rack'; });
      if (rack.length) routable.push(part); else R.off.push(part);
    });
    if (!D.L) {
      // no layout: list by bin name only
      R.noLayout = true;
      var all = routable.concat(R.off); R.off = [];
      all.forEach(function (p) { p.pick = pickBin(p.bins, false); });
      all.sort(function (a, b) { return natural(a.pick.bin, b.pick.bin); });
      R.routed = all.map(function (p, i) { return { seq: i + 1, part: p, bin: p.pick }; });
      renderResult(); drawMap(); return;
    }
    P.calc = true; renderResult();
    setTimeout(function () {
      if (P.result !== R) return;
      routable.forEach(function (p) { p.pick = pickBin(p.bins, true); });
      var res = PWH.route.plan(D.L, routable.map(function (p) {
        var b = p.pick;
        return { key: p.code, cands: [{ bin: b.bin, rack: b.loc.rack, level: b.loc.level, floor: b.loc.floor.id, stock: b.stock }] };
      }));
      var byCode = {}; routable.forEach(function (p) { byCode[p.code] = p; });
      res.unreachable.forEach(function (k) { R.off.push(byCode[k]); });
      R.routed = res.order.map(function (o, i) {
        var p = byCode[o.key];
        return { seq: i + 1, part: p, bin: p.pick, from: o.from };
      });
      R.total = res.total; R.legs = res.legs; R.start = res.start; R.drop = res.drop; R.bridges = PWH.route.build(D.L).bridges;
      buildRuns(R);
      P.flt = 'all';
      P.calc = false; renderResult(); drawMap(true, true);
    }, 20);
  }

  // The Bin to pick from: the one with the least stock (bins with stock first; a bin with 0 is used only if every bin is 0)
  function pickBin(bins, onlyRack) {
    var pool = bins.filter(function (b) { return !onlyRack || b.loc.kind === 'rack'; });
    var withStock = pool.filter(function (b) { return b.stock > 0; });
    if (withStock.length) pool = withStock;
    return pool.slice().sort(function (a, b) { return ((a.stock || 0) - (b.stock || 0)) || natural(a.bin, b.bin); })[0];
  }
  // consecutive stops on the same floor form one step of the walk
  function buildRuns(R) {
    var runs = [];
    R.routed.forEach(function (it) {
      var f = it.bin.loc.kind === 'rack' ? it.bin.loc.floor.id : '';
      var last = runs[runs.length - 1];
      if (last && last.floor === f) last.items.push(it); else runs.push({ floor: f, items: [it] });
    });
    R.runs = runs;
    var sf = R.start && R.start.floor, df = R.drop && R.drop.floor;
    R.multiFloor = runs.length > 1 || (runs.length === 1 && (runs[0].floor !== sf || runs[0].floor !== df));
  }
  function fnum(id) { return String(id).replace(/^F/, ''); }
  function liftShort(from, to) { return t(+fnum(to) > +fnum(from) ? 'm3.flow.up' : 'm3.flow.down'); }
  function liftText(from, to) { return t(+fnum(to) > +fnum(from) ? 'm3.lift.up' : 'm3.lift.down', { n: fnum(to) }); }

  function binHtml(b) { return '<span class="m3bin big">' + esc(b.bin) + '</span>'; }
  function partRow(item, withSeq) {
    var p = item.part || item, b = item.bin || p.bins[0];
    var warn = '';   // no stock check on the pick list (agreed: navigation only)
    return '<div class="m3row' + (P.stop === p.code ? ' sel' : '') + '" data-m3="stop" data-code="' + esc(p.code) + '">' +
      (withSeq ? '<span class="m3n">' + item.seq + '</span>' : '<span class="m3n off">–</span>') +
      '<div class="m3code code">' + esc(p.code) + warn + '</div>' +
      '<div class="m3name">' + esc(p.name) + '</div>' +
      (b ? binHtml(b) : '') + '</div>';
  }
  function offRow(p) {
    return '<div class="m3row" data-m3="stop" data-code="' + esc(p.code) + '"><span class="m3n off">–</span><div class="m3code code">' + esc(p.code) + '</div><div class="m3name">' + esc(p.name) + '</div>' +
      (p.bins.length ? '<span class="m3bin">' + p.bins.map(function (b) { return esc(b.bin); }).join(', ') + '</span>' : '') + '</div>';
  }
  // the walk as one straight line: START — floor 1 · 19 stops — lift up — floor 2 · 2 stops — lift down — DROP
  function flowHtml(R) {
    var sf = R.start.floor, df = R.drop.floor, cur = sf, h = [];
    function st(c, tx) { return '<span class="m3st ' + c + '"><i aria-hidden="true"></i>' + tx + '</span>'; }
    h.push(st('end', esc(t('m2.mk.start'))));
    R.runs.forEach(function (r) {
      if (r.floor !== cur) h.push(st('lift', esc(liftShort(cur, r.floor)))); cur = r.floor;
      h.push(st('floor', esc(t('m3.flow.step2', { n: fnum(r.floor), c: r.items.length }))));
    });
    if (cur !== df) h.push(st('lift', esc(liftShort(cur, df))));
    h.push(st('end', esc(t('m2.mk.drop'))));
    return '<div class="m3flow" role="list" aria-label="' + esc(t('m3.flow.title')) + '">' + h.join('<span class="m3ln" aria-hidden="true"></span>') + '</div>';
  }
  function routeHtml(R) {
    var all = P.flt === 'all' || !R.multiFloor, cur = R.start ? R.start.floor : '', html = '';
    R.runs.forEach(function (r, k) {
      var fid = r.floor, fi = D.L ? D.L.floors.map(function (f) { return f.id; }).indexOf(fid) : -1;
      if (!all && String(fi) !== P.flt) { cur = fid; return; }
      var lf = all && R.multiFloor && fid !== cur ? '<span class="m3lf">' + esc(liftShort(cur, fid)) + '</span> ' : '';
      cur = fid;
      if (R.multiFloor) html += '<div class="m3gh"><span>' + lf + esc(t('m3.grp.step', { k: k + 1, n: fnum(fid) })) + '</span><small>' + esc(t('m3.res.stops', { n: r.items.length })) + '</small></div>';
      html += r.items.map(function (it) { return partRow(it, true); }).join('');
    });
    if (all && R.multiFloor && R.drop && cur !== R.drop.floor) html += '<div class="m3lift">' + esc(liftText(cur, R.drop.floor)) + '</div>';
    return '<div class="m3list">' + html + '</div>';
  }

  // ---------- simulation: distance and time of one pick trip (estimates, the factors are in SIM) ----------
  // walk speed pushing a pick cart, time to find + pick one Part, one lift ride (wait + travel + unload)
  var SIM = { walk: 0.8, pick: 25, lift: 90 };
  function simOf(R) {
    if (!R || !R.routed || !R.routed.length || R.noLayout) return null;
    var lifts = 0;
    if (R.runs) { var cur = R.start ? R.start.floor : null; R.runs.forEach(function (r) { if (cur && r.floor !== cur) lifts++; cur = r.floor; }); if (R.drop && cur !== R.drop.floor) lifts++; }
    var walk = (R.total || 0) / SIM.walk, pick = R.routed.length * SIM.pick, lift = lifts * SIM.lift;
    return { m: R.total || 0, walk: walk, pick: pick, lift: lift, lifts: lifts, sec: walk + pick + lift };
  }
  function mins(sec) { return Math.max(1, Math.round(sec / 60)); }
  function kpis() {
    var s = simOf(P.result), d = $('#m3dist'), tm = $('#m3time');
    if (d) { d.hidden = !s; if (s) d.innerHTML = '<span class="k">' + esc(t('m3.kpi.dist')) + '</span><span class="v">' + esc(t('m3.kpi.m', { m: nf(Math.round(s.m / 5) * 5) })) + '</span>'; }
    if (tm) {
      tm.hidden = !s;
      if (s) {
        tm.title = t('m3.kpi.time_tip', { w: mins(s.walk), n: P.result.routed.length, p: SIM.pick, l: s.lifts, ls: SIM.lift, v: SIM.walk });
        tm.innerHTML = '<span class="k">' + esc(t('m3.kpi.time')) + '</span><span class="v">' + esc(t('m3.kpi.min', { n: mins(s.sec) })) + '</span><span class="b">' + esc(t('m3.kpi.split', { w: mins(s.walk), p: mins(s.pick + s.lift) })) + '</span>';
      }
    }
    var fl = $('#m3flow'), R = P.result;
    if (fl) { var on = !!(R && R.runs && R.runs.length && !P.calc); fl.hidden = !on; fl.innerHTML = on ? flowHtml(R) : ''; }
  }

  // ---------- panel on the right: result, plant question, messages ----------
  function renderResult() {
    var el = $('#m3dock'); if (!el) return;
    var R = P.result, html = '';
    kpis();
    if (P.stale) html += '<div class="m3banner" role="status"><span>' + esc(t('m3.banner.new')) + '</span><button class="btn sm primary" data-m3="reload">' + esc(t('m3.banner.reload')) + '</button></div>';
    if (!D || !D.have.bom || !D.have.matloc) {
      var miss = []; if (!D || !D.have.bom) miss.push(t('need.bom')); if (!D || !D.have.matloc) miss.push(t('need.matloc'));
      return show(el, html + '<div class="m3msg"><b>' + esc(t('m3.need.title')) + '</b><p>' + esc(t('m3.need.missing', { list: miss.join(', ') })) + '</p></div>');
    }
    if (!D.L) html += '<div class="m3msg warn"><p>' + esc(t('m3.warn.nolayout')) + '</p></div>';
    if (!R) return show(el, html ? html : '', !html);
    var sel = R.sel, pp = R.pp;
    var head = '<div class="m3head"><div class="m3prod code">' + esc(sel.product) + '</div>' + (D.desc.get(sel.product) ? '<div class="m3pname">' + esc(D.desc.get(sel.product)) + '</div>' : '');
    if (sel.job) head += '<div class="m3pname">' + esc(t('m3.res.job', { job: sel.job.job, date: fmtDate(sel.job.date), qty: nf(sel.job.qty) })) + '</div>';
    if (pp.plant) {
      head += '<div class="m3plant"><span class="chip info">' + esc(pp.how === 'job' ? t('m3.plant.from_job', { plant: pp.plant }) : t('m3.plant.only', { plant: pp.plant })) + '</span>' +
        (pp.plants.length > 1 ? '<button class="btn sm" data-m3="replant">' + esc(t('m3.plant.change')) + '</button>' : '') +
        (R.parts.length ? '<span class="m3stats">' + esc(t('m3.res.parts', { n: R.parts.length })) + (R.routed.length && !R.noLayout ? ' · ' + esc(t('m3.res.stops', { n: R.routed.length })) : '') + '</span>' : '') + '</div>';
    }
    html += head + '</div>';
    if (R.nobom) return show(el, html + '<p class="empty-note">' + esc(t('m3.res.nobom', { plant: '–' })) + '</p>');
    if (R.ask || R.replant) {
      return show(el, html + '<div class="m3ask"><b>' + esc(t('m3.plant.ask')) + '</b><div class="sub" style="margin:0">' + esc(R.ask === 'job' ? t('m3.plant.why_job', { job: sel.job.job }) : t('m3.plant.why_both')) + '</div><div class="m3plants">' + pp.plants.map(function (p) { return '<button class="btn m3pbtn" data-m3="plant" data-p="' + esc(p) + '">' + esc(p) + '</button>'; }).join('') + '</div></div>');
    }
    if (R.noparts) return show(el, html + '<p class="empty-note">' + esc(t('m3.res.noparts')) + '</p>');
    if (P.calc) return show(el, html + '<p class="empty-note">' + esc(t('m3.res.calc')) + '</p>');
    html += '<div class="m3scroll">';
    if (R.runs) html += routeHtml(R);
    else html += '<div class="m3list">' + R.routed.map(function (it) { return partRow(it, true); }).join('') + '</div>';
    if (R.off.length) html += '<h3 class="m3h">' + esc(t('m3.group.off')) + '</h3><p class="sub">' + esc(t('m3.group.off_help')) + '</p><div class="m3list">' + R.off.map(offRow).join('') + '</div>';
    if (R.nobin.length) html += '<h3 class="m3h">' + esc(t('m3.group.nobin')) + '</h3><p class="sub">' + esc(t('m3.group.nobin_help')) + '</p><div class="m3list">' + R.nobin.map(offRow).join('') + '</div>';
    html += '</div>';
    show(el, html);
  }
  // the panel only takes room on the map while it has something to say
  function show(el, html, hide) {
    var was = !el.hidden;
    el.innerHTML = html || ''; el.hidden = !!hide || !html;
    var st = $('#m3map'); if (st) st.style.setProperty('--m3panel', el.hidden ? '0px' : (el.offsetWidth + 20) + 'px');
    if (K && K.M.canvas && was !== !el.hidden) setTimeout(function () { K.glideFit(); }, 0);
  }

  // ---------- map stage ----------
  function barHtml() {
    if (!D || !D.L) return '';
    var R = P.result, M = K.M, routed = R && R.routed ? R.routed : [];
    var floors = D.L.floors.map(function (f, i) {
      var n = routed.filter(function (it) { return it.bin.loc.kind === 'rack' && it.bin.loc.floor.id === f.id; }).length;
      return [String(i), t('m3.floor', { n: fnum(f.id) }) + (n ? ' (' + n + ')' : '')];
    });
    var multi = R && R.multiFloor, items = multi ? [['all', t('m3.floor.all') + ' (' + routed.length + ')']].concat(floors) : floors;
    var cur = multi && P.flt === 'all' ? 'all' : String(M.floor);
    return '<div class="seg" role="group">' + items.map(function (i) { return '<button data-m3="flt" data-v="' + i[0] + '" aria-pressed="' + (cur === i[0]) + '">' + esc(i[1]) + '</button>'; }).join('') + '</div>' +
      K.seg([['2d', t('m2.view.2d')], ['3d', t('m2.view.3d')]], M.mode, 'mode');
  }
  function renderMap() {
    var el = $('#m3mapbox'); if (!el) return;
    if (!D || !D.L) { el.innerHTML = '<div class="m3nomap">' + esc(t('m3.map.none')) + '</div>'; return; }
    var C = K.pal();
    el.innerHTML = '<div class="m2canvas m3canvas" id="m2wrap"><canvas id="m2cv" tabindex="0" aria-label="Warehouse map"></canvas><div id="m2tip" class="m2tip" hidden></div>' + K.rotCtl() +
      '<div class="m2legend m3legend" id="m2legend" title="' + esc(t('m3.scale', { px: D.L.scale })) + '"><span class="lg"><i class="m3sw"></i>' + esc(t('m3.legend.route')) + '</span><span class="lg"><i class="m3dot"></i>' + esc(t('m3.legend.stop')) + '</span><span class="lg"><i style="background:' + C.start + '"></i>' + esc(t('m2.mk.start')) + '</span><span class="lg"><i style="background:' + C.drop + '"></i>' + esc(t('m2.mk.drop')) + '</span><span class="m3note" id="m3note"></span></div></div>';
    var bar = $('#m3bar'); if (bar) bar.innerHTML = barHtml();
    K.wireMap(); K.resize(); K.fit(); K.draw();
  }
  function drawMap(refit, initial) {
    if (!K || !D || !D.L || !K.M.canvas || !document.body.contains(K.M.canvas)) { if (K && D && D.L && $('#m3map') && !$('#m2cv')) renderMap(); return; }
    var R = P.result;
    if (initial && R && R.routed && R.routed.length) {
      var first = R.routed.filter(function (it) { return it.bin.loc.kind === 'rack'; })[0];
      if (first) { var idx = D.L.floors.map(function (f) { return f.id; }).indexOf(first.bin.loc.floor.id); if (idx >= 0) K.M.floor = idx; }
    }
    var bar = $('#m3bar'); if (bar) bar.innerHTML = barHtml();
    var rc = $('#m2rot'); if (rc) rc.hidden = K.M.mode !== '3d';
    // racks on the route stay bright, the rest of the warehouse fades back
    K.M.focus = R && R.routed ? new Set(R.routed.filter(function (it) { return it.bin.loc.kind === 'rack'; }).map(function (it) { return it.bin.loc.rack; })) : null;
    kpis();
    var nt = $('#m3note'); if (nt) nt.textContent = R && R.bridges ? t('m3.warn.bridges', { n: R.bridges }) : '';
    if (refit) K.fit();
    K.draw();
  }
  function overlay(c, Pj, f, o) {
    var R = P.result; if (!R || !R.legs) return;
    var z = o.z, col = '#38a3ff';
    c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
    R.legs.forEach(function (l) {
      if (l.floor !== f.id || l.pts.length < 2) return;
      c.beginPath();
      l.pts.forEach(function (p, i) { var q = Pj(p[0], p[1], 0); if (i) c.lineTo(q[0], q[1]); else c.moveTo(q[0], q[1]); });
      c.strokeStyle = 'rgba(56,163,255,0.22)'; c.lineWidth = Math.max(8, 7 * z); c.stroke();
      c.save(); c.shadowColor = col; c.shadowBlur = 10; c.strokeStyle = col; c.lineWidth = Math.max(2.5, 2.4 * z); c.stroke(); c.restore();
      // direction chevrons
      for (var i = 1; i < l.pts.length; i++) {
        var a = Pj(l.pts[i - 1][0], l.pts[i - 1][1], 0), b = Pj(l.pts[i][0], l.pts[i][1], 0), dx = b[0] - a[0], dy = b[1] - a[1], len = Math.sqrt(dx * dx + dy * dy);
        if (len < 70) continue;
        var mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, ux = dx / len, uy = dy / len, s = 5;
        c.beginPath(); c.moveTo(mx + ux * s, my + uy * s); c.lineTo(mx - ux * s - uy * s, my - uy * s + ux * s); c.lineTo(mx - ux * s + uy * s, my - uy * s - ux * s); c.closePath(); c.fillStyle = col; c.fill();
      }
    });
    // numbered stops (one badge per rack; several parts in the same rack share it)
    var byRack = {};
    (R.routed || []).forEach(function (it) {
      if (it.bin.loc.kind !== 'rack' || it.bin.loc.floor.id !== f.id) return;
      (byRack[it.bin.loc.rack] = byRack[it.bin.loc.rack] || []).push(it);
    });
    var placed = [];
    function free(x, y, w, h) { return !placed.some(function (q) { return x < q[0] + q[2] + 3 && x + w + 3 > q[0] && y < q[1] + q[3] + 3 && y + h + 3 > q[1]; }); }
    Object.keys(byRack).sort(function (a, b) { return byRack[a][0].seq - byRack[b][0].seq; }).forEach(function (id) {
      var r = D.match.rackById.get(id); if (!r) return;
      var H = o.d3 ? r.levels * o.lp : 0, items = byRack[id], q = Pj(r.x + r.w / 2, r.y + r.h / 2, H), sel = items.some(function (it) { return it.part.code === P.stop; });
      var rp = [Pj(r.x, r.y, H), Pj(r.x + r.w, r.y, H), Pj(r.x + r.w, r.y + r.h, H), Pj(r.x, r.y + r.h, H)];
      c.beginPath(); rp.forEach(function (p, i) { if (i) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]); }); c.closePath();
      c.fillStyle = 'rgba(47,134,255,0.35)'; c.fill(); c.lineWidth = sel ? 3 : 1.5; c.strokeStyle = sel ? '#facc15' : col; c.stroke();
      var nums = items.map(function (it) { return it.seq; }), label = nums.length > 2 ? nums[0] + '–' + nums[nums.length - 1] : nums.join(','), w = Math.max(24, 12 + label.length * 8.5);
      var anchor = q, tries = [[0, 0], [0, -28], [0, 28], [w + 6, 0], [-(w + 6), 0], [0, -54], [w + 6, -28], [-(w + 6), -28], [0, 54]];
      for (var ti = 0; ti < tries.length; ti++) { if (free(anchor[0] + tries[ti][0] - w / 2, anchor[1] + tries[ti][1] - 12, w, 24)) { q = [anchor[0] + tries[ti][0], anchor[1] + tries[ti][1]]; break; } }
      placed.push([q[0] - w / 2, q[1] - 12, w, 24]);
      if (q !== anchor) { c.beginPath(); c.moveTo(anchor[0], anchor[1]); c.lineTo(q[0], q[1]); c.strokeStyle = sel ? '#facc15' : col; c.lineWidth = 1.5; c.stroke(); c.beginPath(); c.arc(anchor[0], anchor[1], 3, 0, 7); c.fillStyle = sel ? '#facc15' : col; c.fill(); }
      c.beginPath(); if (c.roundRect) c.roundRect(q[0] - w / 2, q[1] - 12, w, 24, 12); else c.rect(q[0] - w / 2, q[1] - 12, w, 24);
      c.save(); c.shadowColor = col; c.shadowBlur = 8; c.fillStyle = sel ? '#facc15' : '#ffffff'; c.fill(); c.restore(); c.lineWidth = 2; c.strokeStyle = col; c.stroke();
      c.fillStyle = '#0c1726'; c.font = '600 13.5px "IBM Plex Sans Thai", system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(label, q[0], q[1] + 0.5);
    });
    c.restore();
  }

  // ---------- mount ----------
  function skeleton() {
    return '<section class="m3stage m2mapcard" id="m3map" data-fsbox><div class="m3mapbox" id="m3mapbox"></div>' +
      '<div class="m2tool m3hud"><div class="m3r1"><div class="m3kpi" id="m3dist" hidden></div><div class="m3bar" id="m3bar"></div>' +
      '<div class="m3r1r"><div class="m2zoom"><button class="btn ic" data-m2="zout" aria-label="' + esc(t('m2.zout')) + '" title="' + esc(t('m2.zout')) + '">−</button><button class="btn ic" data-m2="zin" aria-label="' + esc(t('m2.zin')) + '" title="' + esc(t('m2.zin')) + '">+</button><button class="btn" data-m2="fit">' + esc(t('m2.fit')) + '</button></div><button class="btn primary" data-m2="fs">' + esc(t(K && K.M.fs ? 'm2.fs.exit' : 'm2.fs')) + '</button></div></div>' +
      '<div class="m3r2"><div class="m3flowbox" id="m3flow" hidden></div><div class="m3srch"><svg class="m3si" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="M20 20l-4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><input id="m3q" type="search" autocomplete="off" role="combobox" aria-expanded="false" aria-controls="m3sug" aria-label="' + esc(t('m3.search.label')) + '" placeholder="' + esc(t('m3.search.placeholder')) + '" value="' + esc(P.q) + '"><kbd class="m3kbd" aria-hidden="true">/</kbd><div id="m3sug" class="m3sug" role="listbox" hidden></div></div><div class="m3kpi time" id="m3time" hidden></div></div></div>' +
      '<aside class="m3dock" id="m3dock" hidden></aside><span class="sr-only" id="m3live" role="status" aria-live="polite"></span></section>';
  }
  function mount(root) {
    P.root = root;
    if (!K) { K = PWH.mapKit('pwh-m3mode'); K.M.overlay = overlay; K.M.rerender = function () { drawMap(true); }; K.M.onFs = function () { drawMap(true); }; }
    K.M.root = root; K.M.canvas = null; K.M.fs = false; document.documentElement.classList.remove('pwh-fs');
    root.innerHTML = skeleton();
    // opened from the menu: go straight to full screen (the browser allows it only right after a click)
    var ua = navigator.userActivation; if (!ua || ua.isActive) K.toggleFs();
    var inp = $('#m3q');
    inp.addEventListener('input', function () { P.q = inp.value; P.sel = null; P.result = null; P.stop = null; P.act = -1; P.sug = suggest(P.q); renderSug(); renderResult(); drawMap(); });
    inp.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); P.act = Math.min(P.sug.length - 1, P.act + 1); renderSug(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); P.act = Math.max(-1, P.act - 1); renderSug(); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        var s = P.act >= 0 ? P.sug[P.act] : P.sug.filter(function (x) { return x.code.toLowerCase() === P.q.trim().toLowerCase(); })[0] || P.sug[0];
        if (s) choose(s);
      } else if (e.key === 'Escape') { P.q = ''; P.sel = null; P.result = null; P.sug = []; inp.value = ''; renderSug(); renderResult(); drawMap(true); }
    });
    root.addEventListener('click', function (e) {
      var el = e.target.closest('[data-m3]'); if (!el) return;
      var a = el.getAttribute('data-m3');
      if (a === 'pick') choose(P.sug[+el.getAttribute('data-i')]);
      else if (a === 'plant') { var sel = P.sel; P.plant[sel.job ? sel.job.job + '|' + sel.product : sel.product] = el.getAttribute('data-p'); solve(); }
      else if (a === 'replant') { P.result.replant = true; P.result.ask = P.result.ask || 'both'; renderResult(); }
      else if (a === 'reload') { var keep = P.sel; load().then(function () { P.sel = keep; solve(); }); }
      else if (a === 'flt') { var v = el.getAttribute('data-v'); P.flt = v; if (v !== 'all') K.M.floor = +v; K.M.sel = null; renderResult(); drawMap(true); }
      else if (a === 'stop') {
        var code = el.getAttribute('data-code'); P.stop = P.stop === code ? null : code; focusStop(code); renderResult(); drawMap();
        var it = P.stop && P.result && P.result.routed ? P.result.routed.filter(function (x) { return x.part.code === code; })[0] : null;
        if (it && it.bin.loc.kind === 'rack') K.zoomToRacks([it.bin.loc.rack]); else if (!P.stop) K.glideFit();
      }
    });
    if (!P.keyHook) { P.keyHook = true; document.addEventListener('keydown', function (e) { if (e.key === '/' && P.root && document.body.contains(P.root) && !/^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName || '')) { e.preventDefault(); var i = $('#m3q'); if (i) i.focus(); } }); }
    renderResult(); renderMap();
    load().then(function () { renderResult(); renderMap(); if (P.sel) solve(); }).catch(function (e) { console.error(e); });
    setTimeout(function () { var i = $('#m3q'); if (i) i.focus(); }, 30);
  }
  function focusStop(code) {
    var R = P.result; if (!R || !R.routed || !D.L) return;
    var it = R.routed.filter(function (x) { return x.part.code === code; })[0];
    if (it && it.bin.loc.kind === 'rack') { var idx = D.L.floors.map(function (f) { return f.id; }).indexOf(it.bin.loc.floor.id); if (idx >= 0) K.M.floor = idx; }
  }
  // called by the app after data changed: new data never changes the result being read, it only offers a reload
  function refresh() {
    if (!P.root || !document.body.contains(P.root) || !D) return;
    if (keyNow() === D.key) return;
    if (P.sel) { P.stale = true; renderResult(); }
    else load().then(function () { renderResult(); renderMap(); });
  }

  PWH.m3 = { mount: mount, refresh: refresh };
})(window);
