/* PWH layout: reads Warehouse_Layouts.xlsx (one sheet per floor) into a plain object and
 * matches Material-Location bins to racks.
 *
 * How the Excel is read
 *   rack      merged cell whose text looks like "1N-18"; fill colour = number of levels (legend at the bottom of the sheet)
 *   aisle     cells filled pale blue (cart aisle)  -> walkable area, used for routes in Module 3
 *   outside   cells filled lilac
 *   marker    merged cells whose text contains START / DROP / DOOR / LIFT / OUTSIDE
 *   units     sheet pixels (column wpx, row hpx). Metres = px / scale.
 *
 * Bin names: "1N-18-02" = rack 1N-18, level 02.  "J-02" (no level) = rack J-02, level 1.
 */
(function (g) {
  var PWH = (g.PWH = g.PWH || {});
  var SCALE = 29.5;                       // sheet px per metre (racks come out about 1.2 m x 0.9 m); editable later
  var RACK_RE = /^[0-9A-Z]{1,3}-\d{2}$/;
  var BIN_RE = /^([0-9A-Z]{1,3}-\d{2})(?:-(\d{2}))?$/;
  var DEFAULT_LEVELS = { D5E4F0: 1, F5DCC1: 3, BDDAC3: 4 };

  function fillOf(c) { return c && c.s && c.s.fgColor && c.s.fgColor.rgb ? String(c.s.fgColor.rgb).slice(-6).toUpperCase() : ''; }
  function text(c) { return c && c.v != null ? String(c.v).trim() : ''; }

  function parseSheet(ws, id, sheetName) {
    var R = XLSX.utils.decode_range(ws['!ref']);
    var cols = ws['!cols'] || [], rows = ws['!rows'] || [];
    var X = [0], Y = [0], c, r;
    for (c = 0; c <= R.e.c + 1; c++) X.push(X[c] + ((cols[c] && cols[c].wpx) || 64));
    for (r = 0; r <= R.e.r + 1; r++) Y.push(Y[r] + ((rows[r] && rows[r].hpx) || 20));

    // legend: row where "Rack levels" is written; everything from there down is the colour key, not the map
    var legendRow = R.e.r + 1, levelOf = {};
    Object.keys(ws).forEach(function (k) {
      if (k[0] === '!') return;
      var t = text(ws[k]), a = XLSX.utils.decode_cell(k);
      if (/^rack levels/i.test(t)) legendRow = Math.min(legendRow, a.r);
    });
    Object.keys(ws).forEach(function (k) {
      if (k[0] === '!') return;
      var m = text(ws[k]).match(/^(\d)\s*levels?$/i);
      if (m && fillOf(ws[k])) levelOf[fillOf(ws[k])] = +m[1];
    });
    Object.keys(DEFAULT_LEVELS).forEach(function (k) { if (!(k in levelOf)) levelOf[k] = DEFAULT_LEVELS[k]; });

    var merges = ws['!merges'] || [], mergeAt = {};
    var covered = {};   // cells inside a merged block (not its first cell): the file repeats text there, ignore it
    merges.forEach(function (m) {
      mergeAt[m.s.r + ',' + m.s.c] = m;
      for (var rr0 = m.s.r; rr0 <= m.e.r; rr0++) for (var cc0 = m.s.c; cc0 <= m.e.c; cc0++) if (rr0 !== m.s.r || cc0 !== m.s.c) covered[rr0 + ',' + cc0] = 1;
    });
    var racks = [], markers = [], seen = {}, dup = [], noLevel = [];
    function box(a, m) {
      var r1 = m ? m.e.r : a.r, c1 = m ? m.e.c : a.c;
      return { x: X[a.c], y: Y[a.r], w: X[c1 + 1] - X[a.c], h: Y[r1 + 1] - Y[a.r] };
    }
    var grid = new Uint8Array((R.e.r + 2) * (R.e.c + 2)), GW = R.e.c + 2;   // 1 aisle, 2 outside
    Object.keys(ws).forEach(function (k) {
      if (k[0] === '!') return;
      var cell = ws[k], a = XLSX.utils.decode_cell(k);
      if (a.r >= legendRow || covered[a.r + ',' + a.c]) return;
      var t = text(cell), f = fillOf(cell), m = mergeAt[a.r + ',' + a.c];
      if (t && RACK_RE.test(t)) {
        var lv = levelOf[f];
        if (!lv) noLevel.push(t);
        if (seen[t]) { dup.push(t); return; }
        seen[t] = 1;
        var b = box(a, m); b.id = t; b.floor = id; b.levels = lv || 1; racks.push(b);
      } else if (t && !/^PWH\b/i.test(t) && /START|DROP|DOOR|LIFT|TO OUTSIDE/i.test(t)) {
        var type = /START/i.test(t) ? 'start' : /DROP/i.test(t) ? 'drop' : /LIFT/i.test(t) ? 'lift' : /TO OUTSIDE/i.test(t) ? 'exit' : 'door';
        var bb = box(a, m); bb.type = type; bb.label = t.split(/\r?\n/)[0].trim(); bb.floor = id; markers.push(bb);
      } else if (!t && (f === 'EAF4F7' || f === 'F1EBF7')) {
        var code = f === 'EAF4F7' ? 1 : 2, r1 = m ? m.e.r : a.r, c1 = m ? m.e.c : a.c;
        for (var rr = a.r; rr <= Math.min(r1, legendRow - 1); rr++) for (var cc = a.c; cc <= c1; cc++) grid[rr * GW + cc] = code;
      }
    });

    // compress the aisle / outside grid into rectangles (row runs, then stack identical runs)
    var rects = [], open = {};
    for (r = 0; r <= Math.min(R.e.r, legendRow - 1) + 1; r++) {
      var runs = {}, cc2 = 0;
      while (r <= R.e.r && r < legendRow && cc2 <= R.e.c) {
        var v = grid[r * GW + cc2];
        if (!v) { cc2++; continue; }
        var s = cc2; while (cc2 <= R.e.c && grid[r * GW + cc2] === v) cc2++;
        runs[s + ':' + (cc2 - 1) + ':' + v] = [s, cc2 - 1, v];
      }
      Object.keys(open).forEach(function (key) {
        if (runs[key]) { open[key].r1 = r; delete runs[key]; }
        else { rects.push(open[key]); delete open[key]; }
      });
      Object.keys(runs).forEach(function (key) { open[key] = { c0: runs[key][0], c1: runs[key][1], code: runs[key][2], r0: r, r1: r }; });
    }
    var aisles = [], outside = [];
    rects.forEach(function (q) {
      var o = { x: X[q.c0], y: Y[q.r0], w: X[q.c1 + 1] - X[q.c0], h: Y[q.r1 + 1] - Y[q.r0] };
      (q.code === 1 ? aisles : outside).push(o);
    });

    var x0 = 1e9, y0 = 1e9, x1 = 0, y1 = 0;
    function ext(o) { x0 = Math.min(x0, o.x); y0 = Math.min(y0, o.y); x1 = Math.max(x1, o.x + o.w); y1 = Math.max(y1, o.y + o.h); }
    racks.forEach(ext); aisles.forEach(ext); outside.forEach(ext); markers.forEach(ext);
    return {
      id: id, sheet: sheetName, bbox: [x0, y0, x1, y1], racks: racks, aisles: aisles, outside: outside, markers: markers,
      issues: { duplicates: dup, noLevel: noLevel }
    };
  }

  function parse(wb, fileName) {
    var floors = [];
    wb.SheetNames.forEach(function (sn, i) {
      var ws = wb.Sheets[sn];
      if (!ws || !ws['!ref']) return;
      var f = parseSheet(ws, 'F' + (floors.length + 1), sn);
      if (f.racks.length) floors.push(f);
    });
    return { version: 1, scale: SCALE, source: fileName, importedAt: Date.now(), floors: floors };
  }

  function looksLikeLayout(wb) {
    return wb.SheetNames.some(function (n) { return /^layout/i.test(n); }) ||
      wb.SheetNames.some(function (n) {
        var ws = wb.Sheets[n]; if (!ws) return false;
        return Object.keys(ws).slice(0, 60).some(function (k) { return k[0] !== '!' && /WAREHOUSE MAP/i.test(text(ws[k])); });
      });
  }

  function binInfo(bin) {
    var m = String(bin).match(BIN_RE);
    return m ? { rack: m[1], level: m[2] ? +m[2] : 1 } : null;
  }

  // Which Material-Location bins sit on the layout?  Only bins that hold stock count here;
  // empty bins are reported separately because most of them belong to areas the layout does not draw.
  function match(layout, mlRows) {
    var rackById = new Map();
    layout.floors.forEach(function (f) { f.racks.forEach(function (r) { rackById.set(r.id, r); }); });
    var occ = new Map(), emptyBins = new Set(), stat = { stockBins: 0, onLayout: 0, special: [], missing: new Map(), levelOver: [] };
    var stockBins = new Map();
    mlRows.forEach(function (r) {
      var bin = r[1];
      if (!r[2]) { emptyBins.add(bin); return; }
      var list = stockBins.get(bin); if (!list) stockBins.set(bin, (list = [])); list.push({ mat: r[2], plant: r[3], stock: r[4] });
    });
    stockBins.forEach(function (items, bin) {
      stat.stockBins++;
      var bi = binInfo(bin);
      if (!bi) { stat.special.push(bin); stat.specialCount = (stat.specialCount || 0) + 1; return; }
      var rack = rackById.get(bi.rack);
      if (!rack) { stat.missing.set(bi.rack, (stat.missing.get(bi.rack) || 0) + 1); return; }
      if (bi.level > rack.levels) { stat.levelOver.push(bin); }
      stat.onLayout++;
      var o = occ.get(rack.id); if (!o) occ.set(rack.id, (o = {}));
      (o[bi.level] = o[bi.level] || []).push({ bin: bin, items: items });
    });
    stat.emptyBins = emptyBins.size;
    var free = new Map();
    var emptyOn = 0; emptyBins.forEach(function (b) { var bi = binInfo(b); if (bi && rackById.has(bi.rack)) { emptyOn++; var fl = free.get(bi.rack); if (!fl) free.set(bi.rack, (fl = [])); fl.push(b); } });
    stat.emptyOnLayout = emptyOn;
    stat.specialCount = stat.specialCount || 0;
    return { rackById: rackById, occ: occ, free: free, stat: stat };
  }

  PWH.layout = { parse: parse, match: match, binInfo: binInfo, looksLikeLayout: looksLikeLayout, SCALE: SCALE };
})(window);
