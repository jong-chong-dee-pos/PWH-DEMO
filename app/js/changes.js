/* PWH: what changed between a newly uploaded file and the version it replaces.
 * Returns { items: [[labelKey, count], ...], same: boolean }. Counts only; the files themselves are kept in full. */
(function (g) {
  var PWH = (g.PWH = g.PWH || {});

  function setOf(rows, f) { var s = new Set(); for (var i = 0; i < rows.length; i++) { var v = f(rows[i]); if (v) s.add(v); } return s; }
  function diffSets(a, b) { var add = 0, rem = 0; b.forEach(function (x) { if (!a.has(x)) add++; }); a.forEach(function (x) { if (!b.has(x)) rem++; }); return [add, rem]; }

  function matloc(prev, next) {
    // bins that hold stock, material -> set of bins, (material|bin) -> stock
    function scan(rows) {
      var bins = new Set(), mat = new Map(), pair = new Map();
      rows.forEach(function (r) {
        if (!r[2]) return;
        bins.add(r[1]);
        var s = mat.get(r[2]); if (!s) mat.set(r[2], (s = new Set())); s.add(r[1]);
        pair.set(r[2] + '\u0001' + r[1], r[4]);
      });
      return { bins: bins, mat: mat, pair: pair };
    }
    var a = scan(prev), b = scan(next), d = diffSets(a.bins, b.bins), moved = 0, stock = 0;
    b.mat.forEach(function (bins, m) {
      var old = a.mat.get(m); if (!old) return;
      var same = old.size === bins.size; if (same) bins.forEach(function (x) { if (!old.has(x)) same = false; });
      if (!same) moved++;
    });
    b.pair.forEach(function (q, k) { if (a.pair.has(k) && a.pair.get(k) !== q) stock++; });
    return [['change.ml_bins_new', d[0]], ['change.ml_bins_freed', d[1]], ['change.ml_moved', moved], ['change.ml_stock', stock]];
  }
  function bom(prev, next) {
    function scan(rows) { var m = new Map(); rows.forEach(function (r) { var k = r[1] + '\u0001' + r[2] + '\u0001' + r[4]; m.set(k, (m.get(k) || 0) + r[5]); }); return m; }
    var a = scan(prev), b = scan(next), add = 0, rem = 0, qty = 0;
    b.forEach(function (q, k) { if (!a.has(k)) add++; else if (Math.abs(a.get(k) - q) > 1e-9) qty++; });
    a.forEach(function (q, k) { if (!b.has(k)) rem++; });
    return [['change.bom_added', add], ['change.bom_removed', rem], ['change.bom_qty', qty]];
  }
  function compute(type, prev, next) {
    var items;
    if (type === 'matloc') items = matloc(prev, next);
    else if (type === 'bom') items = bom(prev, next);
    else if (type === 'daily') { var d = diffSets(setOf(prev, function (r) { return r[0]; }), setOf(next, function (r) { return r[0]; })); items = [['change.jobs_added', d[0]], ['change.jobs_removed', d[1]]]; }
    else { var o = diffSets(setOf(prev, function (r) { return r[2]; }), setOf(next, function (r) { return r[2]; })); items = [['change.orders_added', o[0]], ['change.orders_removed', o[1]]]; }
    return { items: items, same: items.every(function (x) { return x[1] === 0; }) };
  }
  PWH.changes = { compute: compute };
})(window);
