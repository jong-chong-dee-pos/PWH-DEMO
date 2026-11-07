/* Module 4 engine: pick frequency from the daily plans, simulated cart distance, 1:1 swap advice, swap simulation.
 *
 * Agreed counting rules
 *   round      = same plan date + same U-line + same JOB (several rows of one JOB on one day and line = one round)
 *   a JOB on several days counts once per day
 *   Part       = counted once per round (first level of the BOM; SUB-AS not broken down; BOM quantity ignored)
 *   location   = the bin the pick route would use (same rule as Module 3: on the layout, with stock, least stock)
 *   results    = planned frequency, not proof of picking
 * Swaps are 1:1: Part A moves to B's bin and Part B to A's bin; nothing else in those bins moves.
 * Nothing here changes stored data. */
(function (g) {
  var PWH = g.PWH;

  function natural(a, b) { return a < b ? -1 : a > b ? 1 : 0; }

  // ---------- data ----------
  function load() {
    var A = PWH.app;
    var bom = A.activeFile('bom'), ml = A.activeFile('matloc'), daily = A.activeFiles('daily'), monthly = A.activeFiles('monthly');
    return Promise.all([
      bom ? PWH.db.getRows(bom.id) : null, ml ? PWH.db.getRows(ml.id) : null,
      Promise.all(daily.map(function (f) { return PWH.db.getRows(f.id).then(function (r) { return { date: f.planDate, rows: r }; }); })),
      Promise.all(monthly.map(function (f) { return PWH.db.getRows(f.id); })),
      PWH.db.getMeta('layout').catch(function () { return null; }),
      PWH.db.getMeta('locks').catch(function () { return null; })
    ]).then(function (r) {
      var d = { have: { bom: !!r[0], matloc: !!r[1], daily: r[2].length > 0, monthly: r[3].length > 0, layout: !!r[4] },
        L: r[4] || null, bins: new Map(), text: new Map(), desc: new Map(), orderPlant: new Map(), days: [], locks: r[5] || { items: [], log: [] } };
      if (r[0]) {
        d.index = PWH.checks.buildIndex(r[0]);
        r[0].forEach(function (row) { if (row[3] && !d.text.has(row[2])) d.text.set(row[2], row[3]); });
      }
      if (r[1]) r[1].forEach(function (row) {
        if (!row[2]) return;
        var a = d.bins.get(row[2]); if (!a) d.bins.set(row[2], (a = [])); a.push({ bin: row[1], stock: row[4] });
      });
      r[3].forEach(function (rows) { rows.forEach(function (row) { d.orderPlant.set(String(row[2]), row[1]); if (row[4] && !d.desc.has(row[3])) d.desc.set(row[3], row[4]); }); });
      // newest upload of a date is the one in use (the app already keeps one active file per date)
      r[2].forEach(function (day) { d.days.push(day); day.rows.forEach(function (row) { if (row[2] && !d.desc.has(row[1])) d.desc.set(row[1], row[2]); }); });
      d.days.sort(function (a, b) { return natural(a.date, b.date); });
      d.dates = d.days.map(function (x) { return x.date; });
      d.match = d.L ? PWH.layout.match(d.L, r[1] || []) : null;
      return d;
    });
  }

  // ---------- locations ----------
  function locOf(d, bin) {
    if (!d.L || !d.match) return { kind: 'nolayout' };
    var bi = PWH.layout.binInfo(bin); if (!bi) return { kind: 'special' };
    var rack = d.match.rackById.get(bi.rack); if (!rack) return { kind: 'norack' };
    return { kind: 'rack', rack: bi.rack, level: bi.level, floor: rack.floor };
  }
  // the bin a pick route uses for a Part, or why there is none
  function pickOf(d, code) {
    var all = d.bins.get(code) || [];
    if (!all.length) return { status: 'noloc' };
    var bins = all.map(function (b) { return { bin: b.bin, stock: b.stock, loc: locOf(d, b.bin) }; });
    var rk = bins.filter(function (b) { return b.loc.kind === 'rack'; });
    if (!rk.length) return { status: bins.some(function (b) { return b.loc.kind === 'special'; }) && !bins.some(function (b) { return b.loc.kind === 'norack'; }) ? 'special' : 'notonlayout', bins: bins };
    var ws = rk.filter(function (b) { return b.stock > 0; }), pool = (ws.length ? ws : rk).slice().sort(function (a, b) { return ((a.stock || 0) - (b.stock || 0)) || natural(a.bin, b.bin); });
    // a rack with no cart aisle next to it on the layout (e.g. the back row K) cannot be walked to
    var acc = PWH.route.build(d.L).rackAccess.get(pool[0].loc.rack);
    if (!acc || !acc.length) return { status: 'unreach', bin: pool[0].bin, bins: bins };
    return { status: 'ok', bin: pool[0].bin, rack: pool[0].loc.rack, level: pool[0].loc.level, floor: pool[0].loc.floor, bins: bins };
  }

  // ---------- rounds ----------
  function plantOf(d, job, product) {
    var pl = d.orderPlant.get(String(job));
    var plants = []; if (d.index) d.index.byPlant.forEach(function (pm, p) { if (pm.has(product)) plants.push(p); });
    if (pl && plants.indexOf(pl) >= 0) return { plant: pl, how: 'job' };
    if (plants.length === 1) return { plant: plants[0], how: 'only' };
    if (!plants.length) return { plant: null, why: 'nobom' };
    return { plant: null, why: 'plant' };
  }
  function roundsIn(d, from, to) {
    var by = new Map();
    d.days.forEach(function (day) {
      if ((from && day.date < from) || (to && day.date > to)) return;
      day.rows.forEach(function (row) {
        var key = day.date + '|' + (row[4] || '') + '|' + row[0];
        var r = by.get(key); if (!r) by.set(key, (r = { date: day.date, line: row[4] || '', job: String(row[0]), products: [], qty: 0 }));
        if (r.products.indexOf(row[1]) < 0) r.products.push(row[1]);
        r.qty += +row[3] || 0;
      });
    });
    return Array.from(by.values()).sort(function (a, b) { return natural(a.date, b.date) || natural(a.line, b.line) || natural(a.job, b.job); });
  }
  function partsOf(d, product, plant) {
    var pm = d.index && d.index.byPlant.get(plant), kids = pm && pm.get(product);
    return kids ? Array.from(kids.keys()).sort(natural) : [];
  }

  // ---------- route distance of one Product (cached; a swap list changes the bins of the swapped Parts) ----------
  function makeRouter(d) {
    var cache = new Map();
    return function (parts, swapMap, key) {
      // only swaps that touch this Product's Parts change its route
      var own = swapMap ? parts.filter(function (p) { return swapMap.has(p.code); }).map(function (p) { return p.code + '>' + swapMap.get(p.code).bin; }).join(',') : '';
      var k = key + '|' + own;
      if (cache.has(k)) return cache.get(k);
      var items = [], racks = [];
      parts.forEach(function (p) {
        var pk = (swapMap && swapMap.get(p.code)) || p.pick;
        if (!pk || pk.status !== 'ok') return;
        items.push({ key: p.code, cands: [{ bin: pk.bin, rack: pk.rack, level: pk.level, floor: pk.floor, stock: 1 }] }); racks.push(pk.rack);
      });
      var res = !items.length || !d.L ? { m: 0, stops: 0 } : (function () { var r = PWH.route.plan(d.L, items, { noLegs: true }); return { m: r.total || 0, stops: r.order.length }; })();
      cache.set(k, res);
      return res;
    };
  }

  /* analyze(d, {from, to, swaps}) -> everything the 4.1 page shows */
  function analyze(d, opt) {
    opt = opt || {};
    var rounds = roundsIn(d, opt.from, opt.to), picks = new Map(), parts = new Map(), locs = new Map(), prods = new Map(), bad = [];
    var route = opt.router || makeRouter(d), swapMap = opt.swapMap || null;
    function pick(code) { if (!picks.has(code)) picks.set(code, pickOf(d, code)); return picks.get(code); }
    rounds.forEach(function (r) {
      r.parts = []; r.m = 0;
      r.products.forEach(function (prod) {
        var pp = plantOf(d, r.job, prod);
        if (!pp.plant) { bad.push({ round: r, product: prod, why: pp.why }); return; }
        var codes = partsOf(d, prod, pp.plant);
        if (!codes.length) { bad.push({ round: r, product: prod, why: 'noparts' }); return; }
        r.plant = pp.plant;
        var P = prods.get(prod); if (!P) prods.set(prod, (P = { product: prod, plant: pp.plant, rounds: 0, m: 0, parts: codes.length, plants: {} }));
        P.rounds++; P.plants[pp.plant] = 1;
        var list = codes.map(function (c) { return { code: c, pick: pick(c) }; });
        list.forEach(function (it) {
          if (r.parts.indexOf(it.code) >= 0) return;   // a Part counts once per round
          r.parts.push(it.code);
          var x = parts.get(it.code); if (!x) parts.set(it.code, (x = { code: it.code, name: d.text.get(it.code) || '', n: 0, products: new Map(), pick: it.pick }));
          x.n++; x.products.set(prod, (x.products.get(prod) || 0) + 1);
          if (it.pick.status === 'ok') locs.set(it.pick.bin, (locs.get(it.pick.bin) || 0) + 1);
        });
        var rt = route(list, swapMap, prod + '|' + pp.plant);
        r.m += rt.m; r.stops = (r.stops || 0) + rt.stops; P.m += rt.m;
      });
      if (r.parts.length) r.ok = true;
    });
    var okRounds = rounds.filter(function (r) { return r.ok; });
    return {
      from: opt.from, to: opt.to, rounds: rounds, okRounds: okRounds, bad: bad,
      parts: Array.from(parts.values()).sort(function (a, b) { return b.n - a.n || natural(a.code, b.code); }),
      locs: Array.from(locs.entries()).map(function (e) { var b = e[0], bi = PWH.layout.binInfo(b), rk = bi && d.match && d.match.rackById.get(bi.rack); return { bin: b, n: e[1], rack: bi && bi.rack, floor: rk && rk.floor }; }).sort(function (a, b) { return b.n - a.n || natural(a.bin, b.bin); }),
      products: Array.from(prods.values()).sort(function (a, b) { return b.rounds - a.rounds || natural(a.product, b.product); }),
      totalM: okRounds.reduce(function (s, r) { return s + r.m; }, 0),
      noLoc: Array.from(parts.values()).filter(function (p) { return p.pick.status !== 'ok'; }),
      router: route
    };
  }

  // ---------- locks (Module 5) ----------
  function lockedPart(d, code) { return d.locks.items.some(function (l) { return l.type === 'part' && l.code === code; }); }
  function lockedBin(d, bin) { return d.locks.items.some(function (l) { return l.type === 'bin' && (l.code === bin || PWH.layout.binInfo(bin) && l.code === PWH.layout.binInfo(bin).rack); }); }
  function checkSwap(d, a, b) {
    var why = [];
    if (!a.pick || a.pick.status !== 'ok') why.push({ code: 'a_noloc' });
    if (!b.pick || b.pick.status !== 'ok') why.push({ code: 'b_noloc' });
    if (lockedPart(d, a.code)) why.push({ code: 'part_locked', v: a.code });
    if (lockedPart(d, b.code)) why.push({ code: 'part_locked', v: b.code });
    if (a.pick && a.pick.bin && lockedBin(d, a.pick.bin)) why.push({ code: 'bin_locked', v: a.pick.bin });
    if (b.pick && b.pick.bin && lockedBin(d, b.pick.bin)) why.push({ code: 'bin_locked', v: b.pick.bin });
    if (a.pick && b.pick && a.pick.bin && a.pick.bin === b.pick.bin) why.push({ code: 'same_bin' });
    return why;
  }
  function swapMapOf(pairs) {
    var m = new Map(), sig = [];
    pairs.forEach(function (s) { m.set(s.a.code, s.b.pick); m.set(s.b.code, s.a.pick); sig.push(s.a.code + '>' + s.b.pick.bin, s.b.code + '>' + s.a.pick.bin); });
    m.sig = sig.sort().join(','); return m;
  }

  /* simulate(d, base, pairs) -> before / after / per Product */
  function simulate(d, base, pairs) {
    var sm = swapMapOf(pairs);
    var after = analyze(d, { from: base.from, to: base.to, swapMap: sm, router: base.router });
    var byProd = base.products.map(function (p) {
      var q = after.products.filter(function (x) { return x.product === p.product; })[0];
      return { product: p.product, rounds: p.rounds, before: p.m, after: q ? q.m : p.m };
    }).filter(function (x) { return Math.abs(x.after - x.before) > 0.01; }).sort(function (a, b) { return (a.after - a.before) - (b.after - b.before); });
    return { before: base.totalM, after: after.totalM, byProd: byProd, swapMap: sm };
  }

  /* recommend(d, base, n) -> best 1:1 swaps: a busy Part far from START/DROP with a quiet Part near them.
   * Candidates are ranked by an estimate (frequency gap x distance gap), the best ones are checked exactly
   * by re-routing every Product they touch over the analysed period. */
  function recommend(d, base, n) {
    n = n || 10;
    if (!d.L || !base.okRounds.length) return [];
    var costOf = new Map();
    function cost(rack) {
      if (costOf.has(rack)) return costOf.get(rack);
      var r = PWH.route.plan(d.L, [{ key: 'x', cands: [{ bin: rack, rack: rack, level: 1, floor: '', stock: 1 }] }], { noLegs: true });
      var c = r.unreachable && r.unreachable.length ? Infinity : (r.total || 0);
      costOf.set(rack, c); return c;
    }
    var freq = new Map(); base.parts.forEach(function (p) { freq.set(p.code, p); });
    // every Part with a bin on the layout can take part in a swap, also Parts not picked in this period
    var pool = [];
    d.bins.forEach(function (_, code) {
      var f = freq.get(code), pk = f ? f.pick : pickOf(d, code);
      if (pk.status !== 'ok' || lockedPart(d, code) || lockedBin(d, pk.bin) || !isFinite(cost(pk.rack))) return;
      pool.push({ code: code, n: f ? f.n : 0, pick: pk, c: cost(pk.rack), products: f ? f.products : new Map(), name: d.text.get(code) || '' });
    });
    var busy = pool.filter(function (p) { return p.n > 0; }).sort(function (a, b) { return b.n * b.c - a.n * a.c; }).slice(0, 40);
    var near = pool.slice().sort(function (a, b) { return a.c - b.c; }).slice(0, 160);
    var est = [];
    busy.forEach(function (a) {
      near.forEach(function (b) {
        if (a.code === b.code || a.pick.bin === b.pick.bin || b.n >= a.n || b.c >= a.c) return;
        est.push({ a: a, b: b, e: (a.n - b.n) * (a.c - b.c) });
      });
    });
    est.sort(function (x, y) { return y.e - x.e; });
    var tried = [], usedA = new Set(), usedB = new Set();
    for (var i = 0; i < est.length && tried.length < 30; i++) {
      var s = est[i]; if (usedA.has(s.a.code) || usedB.has(s.b.code) || usedB.has('bin:' + s.b.pick.bin)) continue;
      usedA.add(s.a.code); usedB.add(s.b.code); usedB.add('bin:' + s.b.pick.bin); tried.push(s);
    }
    var out = [];
    tried.forEach(function (s) {
      var sim = simulate(d, base, [s]);
      var save = sim.before - sim.after;
      if (save <= 0.5) return;
      out.push({ a: s.a, b: s.b, before: sim.before, after: sim.after, save: save, pct: sim.before ? save / sim.before * 100 : 0, byProd: sim.byProd, rules: checkSwap(d, s.a, s.b) });
    });
    out.sort(function (x, y) { return y.save - x.save; });
    // one Part in at most one suggestion
    var seen = new Set(), res = [];
    // one Part and one bin in at most one suggestion, so all suggestions can be applied together
    out.forEach(function (r) {
      var keys = [r.a.code, r.b.code, 'bin:' + r.a.pick.bin, 'bin:' + r.b.pick.bin];
      if (res.length >= n || keys.some(function (k) { return seen.has(k); })) return;
      keys.forEach(function (k) { seen.add(k); }); res.push(r);
    });
    return res;
  }

  PWH.freq = { load: load, analyze: analyze, simulate: simulate, recommend: recommend, checkSwap: checkSwap, pickOf: pickOf, lockedPart: lockedPart, lockedBin: lockedBin };
})(window);
