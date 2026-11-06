/* PWH cross-file checks + BOM explosion.
 * Works on the datasets that are "in use" (latest BOM, latest Material-Location,
 * the effective daily plan per date, the effective monthly plan per month, the layout).
 * The same explode() is what Modules 3-4 will use to turn Product plans into Part demand.
 */
(function (g) {
  var PWH = (g.PWH = g.PWH || {});

  function buildIndex(bomRows) {
    var byPlant = new Map(), parents = new Set();
    for (var i = 0; i < bomRows.length; i++) {
      var r = bomRows[i], parent = r[1], comp = r[2], plant = r[4], q = r[5];
      var pm = byPlant.get(plant); if (!pm) byPlant.set(plant, (pm = new Map()));
      var kids = pm.get(parent); if (!kids) pm.set(parent, (kids = new Map()));
      kids.set(comp, (kids.get(comp) || 0) + q);   // same component listed twice = quantities add up
      parents.add(parent);
    }
    return { byPlant: byPlant, parents: parents };
  }

  // Part quantities needed per 1 unit of `mat`, expanded to the last level.
  function makeExploder(index, plantOrder) {
    var memo = new Map();
    var order = plantOrder.concat(Array.from(index.byPlant.keys()).filter(function (p) { return plantOrder.indexOf(p) < 0; }));
    function kidsOf(mat) {
      for (var i = 0; i < order.length; i++) {
        var pm = index.byPlant.get(order[i]);
        if (pm && pm.has(mat)) return { kids: pm.get(mat), plant: order[i] };
      }
      return null;
    }
    function leaves(mat, stack) {
      if (memo.has(mat)) return memo.get(mat);
      var found = kidsOf(mat), res = new Map();
      if (!found || stack.has(mat)) res.set(mat, 1);
      else {
        stack.add(mat);
        found.kids.forEach(function (q, c) {
          leaves(c, stack).forEach(function (lq, l) { res.set(l, (res.get(l) || 0) + q * lq); });
        });
        stack.delete(mat);
      }
      memo.set(mat, res);
      return res;
    }
    return { leaves: function (m) { return leaves(m, new Set()); }, kidsOf: kidsOf };
  }

  // Full lists (never cut): [{k: code, v: number|null, where: 'dates / months it appears in', why: label key}]
  function byValue(map, where) {
    return Array.from(map.entries()).sort(function (a, b) { return b[1] - a[1]; }).map(function (e) {
      return { k: e[0], v: Math.round(e[1] * 100) / 100, where: where ? Array.from(where.get(e[0]) || []).sort().join(', ') : '' };
    });
  }

  function run(ds, opts) {
    opts = opts || {};
    var plantOrder = opts.plantOrder || ['5212', '5213'];
    var items = [];
    var have = { bom: !!ds.bom, matloc: !!ds.matloc, daily: ds.daily.length > 0, monthly: ds.monthly.length > 0, layout: !!ds.layout };
    var result = { items: items, have: have, stats: {} };
    var index = ds.bom ? buildIndex(ds.bom) : null;
    var mlMats = new Set(), mlMulti = 0;
    if (ds.matloc) {
      var perMat = new Map();
      ds.matloc.forEach(function (r) {
        if (r[2]) { mlMats.add(r[2]); var s = perMat.get(r[2]); if (!s) perMat.set(r[2], (s = new Set())); s.add(r[1]); }
      });
      perMat.forEach(function (s) { if (s.size > 1) mlMulti++; });
    }

    // plan products and demand
    var planRows = [];
    ds.daily.forEach(function (d) { d.rows.forEach(function (r) { planRows.push({ src: 'daily', at: d.date, mat: r[1], qty: r[3] }); }); });
    ds.monthly.forEach(function (d) { d.rows.forEach(function (r) { planRows.push({ src: 'monthly', at: d.month, mat: r[3], qty: r[5] }); }); });

    if (index && planRows.length) {
      var notInBom = new Map(), productSet = new Set(), bothPlants = 0, productAt = new Map(), partAt = new Map();
      var ex = makeExploder(index, plantOrder);
      var partDemand = new Map();
      planRows.forEach(function (p) {
        productSet.add(p.mat);
        var pa = productAt.get(p.mat); if (!pa) productAt.set(p.mat, (pa = new Set())); pa.add(p.at);
        if (!index.parents.has(p.mat)) { notInBom.set(p.mat, (notInBom.get(p.mat) || 0) + p.qty); return; }
        ex.leaves(p.mat).forEach(function (q, part) {
          partDemand.set(part, (partDemand.get(part) || 0) + q * p.qty);
          var qa = partAt.get(part); if (!qa) partAt.set(part, (qa = new Set())); qa.add(p.at);
        });
      });
      productSet.forEach(function (m) {
        var inPlants = 0; index.byPlant.forEach(function (pm) { if (pm.has(m)) inPlants++; });
        if (inPlants > 1) bothPlants++;
      });
      result.stats.products = productSet.size;
      result.stats.parts = partDemand.size;
      items.push({
        id: 'plan_not_in_bom', level: notInBom.size ? 'error' : 'ok', count: notInBom.size, total: productSet.size,
        list: byValue(notInBom, productAt)
      });
      if (ds.matloc) {
        var missing = new Map(), totalQty = 0, missQty = 0;
        partDemand.forEach(function (q, part) {
          totalQty += q;
          if (!mlMats.has(part)) { missing.set(part, q); missQty += q; }
        });
        result.stats.partsMissing = missing.size;
        items.push({
          id: 'part_not_in_ml', level: missing.size ? 'warning' : 'ok', count: missing.size, total: partDemand.size,
          pct: totalQty ? Math.round((missQty / totalQty) * 1000) / 10 : 0,
          list: byValue(missing, partAt)
        });
      }
      items.push({ id: 'plant_both', level: 'info', count: bothPlants, total: productSet.size, plantOrder: plantOrder, list: [] });
    }

    if (index && ds.matloc) {
      var inBom = new Set(); ds.bom.forEach(function (r) { inBom.add(r[2]); });
      var notUsed = []; mlMats.forEach(function (m) { if (!inBom.has(m)) notUsed.push(m); });
      items.push({ id: 'ml_not_in_bom', level: notUsed.length ? 'info' : 'ok', count: notUsed.length, total: mlMats.size, list: notUsed.sort().map(function (m) { return { k: m }; }) });
      var stocked = []; mlMats.forEach(function (m) { if (index.parents.has(m)) stocked.push(m); });
      items.push({ id: 'ml_is_assembly', level: stocked.length ? 'info' : 'ok', count: stocked.length, total: mlMats.size, list: stocked.sort().map(function (m) { return { k: m }; }) });
    }
    if (ds.matloc) items.push({ id: 'ml_multi_bin', level: 'info', count: mlMulti, total: mlMats.size, list: [] });

    // daily plan continuity
    if (ds.daily.length > 1) {
      var dates = ds.daily.map(function (d) { return d.date; }).sort();
      var gaps = [], cur = new Date(dates[0] + 'T00:00:00Z'), end = new Date(dates[dates.length - 1] + 'T00:00:00Z');
      var set = new Set(dates);
      while (cur < end) {
        var iso = cur.toISOString().slice(0, 10);
        if (!set.has(iso)) gaps.push(iso);
        cur = new Date(cur.getTime() + 86400000);
      }
      items.push({ id: 'daily_gaps', level: gaps.length ? 'warning' : 'ok', count: gaps.length, total: dates.length, list: gaps.map(function (d) { return { k: d, date: true }; }) });
    }

    // stock bins vs the warehouse layout (Module 2)
    if (ds.matloc) {
      var stockBins = new Set(); ds.matloc.forEach(function (r) { if (r[2]) stockBins.add(r[1]); });
      if (ds.layout && PWH.layout) {
        var lm = PWH.layout.match(ds.layout, ds.matloc), st = lm.stat, off = st.stockBins - st.onLayout;
        var lst = st.special.map(function (k) { return { k: k, why: 'list.special' }; })
          .concat(Array.from(st.missing.entries()).map(function (e) { return { k: e[0], v: e[1], why: 'list.norack' }; }));
        items.push({ id: 'layout_match', level: off ? 'warning' : 'ok', count: off, total: st.stockBins, list: lst });
      } else items.push({ id: 'layout_pending', level: 'pending', count: stockBins.size, total: stockBins.size, list: [] });
    }
    return result;
  }

  PWH.checks = { run: run, buildIndex: buildIndex, makeExploder: makeExploder };
})(window);
