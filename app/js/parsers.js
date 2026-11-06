/* PWH file parsers + per-file validation.
 * Each parser returns { ok, fatal:[msgKey,params], rows, meta, issues, stats }.
 *   rows   : compact arrays (see layouts below)
 *   issues : [{level:'error'|'warning'|'info', code, count, samples:[{sheet,row,col,val,note}]}]
 *            'error' = rows were dropped, 'warning' = kept but suspicious, 'info' = FYI
 *            Every located problem carries the Excel sheet name, row number, column name and bad value.
 *   fatal  : the file cannot be used at all (wrong columns, no date ...) -> upload is rejected
 *
 * Row layouts
 *   bom      [src, parent, comp, text, plant, qty, unit]          src: Z = ZBOM sheet, S = SBOM sheet
 *   matloc   [stype, bin, material, plants, stock]                material '' = empty bin; stock is summed across plants
 *   daily    [job, material, desc, qty, line, finishDate]
 *   monthly  [leadOrder, plant, order, material, desc, qty, delivered, confirmed, unit, start, finish, status]
 *
 * The daily-plan date and the monthly-plan month are NOT read from the file name: the admin gives them at upload
 * (opts.date / opts.month). suggest() only offers a value to pre-fill the field.
 */
(function (g) {
  var PWH = (g.PWH = g.PWH || {});
  var KEEP = 300; // located problems kept per issue code

  // ---------- helpers ----------
  function str(v) { return v == null ? '' : String(v).trim(); }
  function num(v) {
    if (typeof v === 'number') return v;
    if (v == null || v === '') return NaN;
    return Number(String(v).replace(/,/g, ''));
  }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function isoDate(v) {
    if (v == null || v === '') return '';
    if (v instanceof Date && !isNaN(v)) {
      // SheetJS returns midnight dates a few seconds early (previous day 23:59:5x); +12h lands safely on the right day.
      var d = new Date(v.getTime() + 12 * 3600 * 1000);
      return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
    }
    var s = str(v), m;
    if ((m = s.match(/^(\d{4})-(\d{2})-(\d{2})/))) return m[1] + '-' + m[2] + '-' + m[3];
    if ((m = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/))) {
      var y = +m[3]; if (y < 100) y += 2500; if (y > 2400) y -= 543;
      return y + '-' + pad2(+m[2]) + '-' + pad2(+m[1]);
    }
    return '';
  }
  // loc: string note, or {sheet,row,col,val,note}
  function Issues() {
    var map = {}, list = [];
    return {
      add: function (level, code, loc, inc) {
        var it = map[code];
        if (!it) { it = map[code] = { level: level, code: code, count: 0, samples: [], _k: {} }; list.push(it); }
        it.count += inc == null ? 1 : inc;
        if (loc == null || it.samples.length >= KEEP) return;
        if (typeof loc === 'string') loc = { note: loc };
        var k = [loc.sheet, loc.row, loc.col, loc.val, loc.note].join('|');
        if (it._k[k]) return;
        it._k[k] = 1; it.samples.push(loc);
      },
      list: function () {
        var order = { error: 0, warning: 1, info: 2 };
        return list.map(function (it) { return { level: it.level, code: it.code, count: it.count, samples: it.samples }; })
          .sort(function (a, b) { return order[a.level] - order[b.level]; });
      }
    };
  }
  // rows as arrays; rows.off = sheet row index of data[0] (so the Excel row of data[i] is off + i + 1)
  function toRows(ws) {
    var ref = ws['!ref'];
    var off = ref ? XLSX.utils.decode_range(ref).s.r : 0;
    var rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, blankrows: true, raw: true });
    rows.off = off;
    return rows;
  }
  function rowNo(data, i) { return (data.off || 0) + i + 1; }
  // find the header row (within the first 12 rows) that matches most of the expected columns
  // spec: { key: 'Display Name' }  -> { idx:{key:colIndex}, missing:['Display Name',...], row:index }
  function findHeader(data, spec) {
    var keys = Object.keys(spec), best = null;
    for (var r = 0; r < Math.min(data.length, 12); r++) {
      var low = (data[r] || []).map(function (c) { return str(c).toLowerCase(); });
      var idx = {}, missing = [];
      keys.forEach(function (k) {
        var i = low.indexOf(spec[k].toLowerCase());
        if (i < 0) missing.push(spec[k]); else idx[k] = i;
      });
      if (!best || missing.length < best.missing.length) best = { idx: idx, missing: missing, row: r };
      if (!missing.length) break;
    }
    return best || { idx: {}, missing: keys.map(function (k) { return spec[k]; }), row: 0 };
  }
  function topCount(arr) {
    var m = {}, best = '', n = 0;
    arr.forEach(function (x) { m[x] = (m[x] || 0) + 1; if (m[x] > n) { n = m[x]; best = x; } });
    return best;
  }

  // ---------- type detection ----------
  function detectType(wb) {
    for (var s = 0; s < wb.SheetNames.length; s++) {
      var name = wb.SheetNames[s].toLowerCase();
      var rows = toRows(wb.Sheets[wb.SheetNames[s]]).slice(0, 30);
      for (var r = 0; r < rows.length; r++) {
        var low = (rows[r] || []).map(function (c) { return str(c).toLowerCase(); });
        if (low.indexOf('material component - key') >= 0) return 'bom';
        if (low.indexOf('storage bin') >= 0 && low.indexOf('material') >= 0) return 'matloc';
        if (low.indexOf('order quantity (gmein)') >= 0 || low.indexOf('leading order') >= 0) return 'monthly';
        if (low.indexOf('job no.') >= 0 && low.indexOf('product code') >= 0) return 'daily';
      }
      if (name === 'zbom' || name === 'sbom') return 'bom';
    }
    return '';
  }

  // ---------- BOM ----------
  var BOM_H = { parent: 'Material - Key', comp: 'Material Component - Key', text: 'Material Component - Text', plant: 'Plant - Key', qty: 'Component Quantity', unit: 'Component Unit - Key' };
  function parseBom(wb) {
    var iss = Issues(), rows = [], seen = new Set(), fatal = null;
    var sheetsUsed = [], parents = { Z: new Set(), S: new Set() }, comps = new Set(), plants = {}, units = {};
    var edges = new Map();
    wb.SheetNames.forEach(function (sn) {
      var data = toRows(wb.Sheets[sn]);
      if (!data.length) return;
      var h = findHeader(data, BOM_H);
      var low = sn.toLowerCase();
      if (h.missing.length) {
        if (low === 'zbom' || low === 'sbom') fatal = fatal || ['fatal.columns', { sheet: sn, cols: h.missing.join(', ') }];
        else iss.add('info', 'sheet_ignored', { sheet: sn });
        return;
      }
      var src = low.indexOf('zbom') >= 0 ? 'Z' : low.indexOf('sbom') >= 0 ? 'S' : 'O';
      sheetsUsed.push(sn + ' (' + (data.length - h.row - 1) + ')');
      for (var i = h.row + 1; i < data.length; i++) {
        var r = data[i];
        var parent = str(r[h.idx.parent]), comp = str(r[h.idx.comp]);
        if (!parent && !comp) continue;
        var rn = rowNo(data, i);
        if (!parent || !comp) {
          iss.add('error', 'key_empty', { sheet: sn, row: rn, col: !parent ? BOM_H.parent : BOM_H.comp, val: '', note: parent || comp });
          continue;
        }
        if (parent === comp) { iss.add('error', 'self_ref', { sheet: sn, row: rn, col: BOM_H.comp, val: comp }); continue; }
        var q = num(r[h.idx.qty]);
        if (!(q > 0)) { iss.add('error', 'qty_invalid', { sheet: sn, row: rn, col: BOM_H.qty, val: str(r[h.idx.qty]), note: parent + ' > ' + comp }); continue; }
        var plant = str(r[h.idx.plant]), unit = str(r[h.idx.unit]);
        var key = src + '|' + parent + '|' + comp + '|' + plant;
        if (seen.has(key)) iss.add('warning', 'dup_row', { sheet: sn, row: rn, col: BOM_H.comp, val: comp, note: parent + ' (' + plant + ')' });
        else seen.add(key);
        rows.push([src, parent, comp, str(r[h.idx.text]), plant, q, unit]);
        if (parents[src]) parents[src].add(parent);
        comps.add(comp);
        plants[plant] = (plants[plant] || 0) + 1;
        if (unit && unit !== 'PCS' && unit !== 'PC') { units[unit] = (units[unit] || 0) + 1; }
        var e = edges.get(parent); if (!e) edges.set(parent, (e = [])); e.push(comp);
      }
    });
    if (!fatal && !rows.length) fatal = ['fatal.no_rows', {}];
    if (fatal) return { ok: false, fatal: fatal };
    Object.keys(units).forEach(function (u) { iss.add('info', 'unit_other', u + ' x' + units[u], units[u]); });
    // cycle check (Kahn): nodes never freed are inside or below a cycle
    var indeg = new Map();
    edges.forEach(function (cs, p) { if (!indeg.has(p)) indeg.set(p, 0); cs.forEach(function (c) { indeg.set(c, (indeg.get(c) || 0) + 1); }); });
    var q2 = []; indeg.forEach(function (d, n) { if (d === 0) q2.push(n); });
    var done = 0;
    while (q2.length) {
      var n = q2.pop(); done++;
      (edges.get(n) || []).forEach(function (c) { var d = indeg.get(c) - 1; indeg.set(c, d); if (d === 0) q2.push(c); });
    }
    if (done < indeg.size) {
      var stuck = []; indeg.forEach(function (d, n) { if (d > 0 && edges.has(n)) stuck.push(n); });
      iss.add('warning', 'cycle', { col: BOM_H.parent, val: stuck[0] }, stuck.length);
      stuck.slice(1, 40).forEach(function (s) { iss.add('warning', 'cycle', { col: BOM_H.parent, val: s }, 0); });
    }
    var pl = Object.keys(plants).sort();
    return {
      ok: true, rows: rows, issues: iss.list(),
      meta: {},
      stats: [
        ['stat.sheets', sheetsUsed.join(', ')],
        ['stat.fg', parents.Z.size], ['stat.sub', parents.S.size], ['stat.components', comps.size],
        ['stat.plants', pl.map(function (p) { return p + ' (' + plants[p] + ')'; }).join(', ')]
      ]
    };
  }

  // ---------- Material-Location ----------
  // Columns used: Storage Type, Storage Bin, Material, Plant, Total Stock.
  // Storage type C00 is ignored. Plant (5212/5213) is an accounting status only: the same material in the same bin is one pile,
  // so stock is summed across plants. Duration / Stock for putaway / Pick quantity are not used.
  var ML_H = { stype: 'Storage Type', bin: 'Storage Bin', mat: 'Material', plant: 'Plant', stock: 'Total Stock' };
  var BIN_STD = /^[0-9A-Z]{1,3}-\d{2}(-\d{2})?$/;
  function parseMatLoc(wb) {
    var iss = Issues(), rows = [], best = null, firstMissing = null;
    wb.SheetNames.forEach(function (sn) {
      var data = toRows(wb.Sheets[sn]);
      if (!data.length) return;
      var h = findHeader(data, ML_H);
      if (h.missing.length) { if (!firstMissing || h.missing.length < firstMissing.h.missing.length) firstMissing = { sn: sn, h: h }; return; }
      if (!best || data.length > best.data.length) best = { sn: sn, data: data, h: h };
    });
    if (!best) {
      var fm = firstMissing || { sn: wb.SheetNames[0], h: { missing: Object.keys(ML_H).map(function (k) { return ML_H[k]; }) } };
      return { ok: false, fatal: ['fatal.columns', { sheet: fm.sn, cols: fm.h.missing.join(', ') }] };
    }
    var sn = best.sn, h = best.h, data = best.data;
    var bins = new Set(), emptyBins = new Set(), occupied = new Set(), mats = new Set(), seen = new Set(), special = {}, perMat = new Map();
    var merged = new Map(), plants = {}, c00 = 0, types = {};
    for (var i = h.row + 1; i < data.length; i++) {
      var r = data[i];
      var bin = str(r[h.idx.bin]), mat = str(r[h.idx.mat]);
      if (!bin && !mat) continue;
      var rn = rowNo(data, i);
      var stype = str(r[h.idx.stype]);
      if (stype.toUpperCase() === 'C00') { c00++; continue; }
      if (!bin) { iss.add('error', 'bin_empty', { sheet: sn, row: rn, col: ML_H.bin, val: '', note: mat }); continue; }
      var isEmpty = !mat || mat.toLowerCase() === '<<empty>>';
      var stock = num(r[h.idx.stock]);
      if (stock < 0) iss.add('warning', 'stock_negative', { sheet: sn, row: rn, col: ML_H.stock, val: str(r[h.idx.stock]), note: bin + ' / ' + mat });
      var plant = str(r[h.idx.plant]);
      types[stype] = (types[stype] || 0) + 1;
      if (!BIN_STD.test(bin)) { special[bin] = (special[bin] || 0) + 1; }
      bins.add(bin);
      if (isEmpty) {
        if (!emptyBins.has(bin)) { emptyBins.add(bin); rows.push([stype, bin, '', '', 0]); }
        continue;
      }
      var key = bin + '|' + mat + '|' + plant;
      if (seen.has(key)) iss.add('warning', 'dup_row_ml', { sheet: sn, row: rn, col: ML_H.mat, val: mat, note: bin + ' (' + plant + ')' });
      else seen.add(key);
      mats.add(mat);
      occupied.add(bin);
      if (plant) plants[plant] = (plants[plant] || 0) + 1;
      var s = perMat.get(mat); if (!s) perMat.set(mat, (s = new Set())); s.add(bin);
      var mk = bin + '|' + mat, row = merged.get(mk);
      if (!row) { row = [stype, bin, mat, plant, 0]; merged.set(mk, row); rows.push(row); }
      else if (plant && row[3].split('+').indexOf(plant) < 0) row[3] = row[3] ? row[3] + '+' + plant : plant;
      row[4] += isFinite(stock) ? stock : 0;
    }
    if (!rows.length) return { ok: false, fatal: ['fatal.no_rows', {}] };
    var sp = Object.keys(special);
    if (sp.length) sp.forEach(function (b) { iss.add('info', 'bin_special', { sheet: sn, col: ML_H.bin, val: b, note: 'x' + special[b] }, special[b] ? 1 : 0); });
    var multi = []; perMat.forEach(function (s, m) { if (s.size > 1) multi.push([m, s.size]); });
    multi.forEach(function (e) { iss.add('info', 'mat_multi_bin', { sheet: sn, col: ML_H.mat, val: e[0], note: e[1] + ' bins' }); });
    var tk = Object.keys(types).sort();
    return {
      ok: true, rows: rows, issues: iss.list(), meta: {},
      stats: [
        ['stat.sheets', sn],
        ['stat.bins', bins.size], ['stat.bins_empty', bins.size - occupied.size],
        ['stat.materials', mats.size],
        ['stat.types', tk.map(function (k) { return (k || '-') + ' (' + types[k] + ')'; }).join(', ')],
        ['stat.plants', Object.keys(plants).sort().map(function (p) { return p + ' (' + plants[p] + ')'; }).join(', ')],
        ['stat.c00_ignored', c00]
      ]
    };
  }

  // ---------- Daily plan (production report sheet) ----------
  function dailyHeader(data) {
    for (var i = 0; i < Math.min(data.length, 40); i++) {
      var low = (data[i] || []).map(function (c) { return str(c).toUpperCase(); });
      if (low.indexOf('JOB NO.') >= 0 && low.indexOf('PRODUCT CODE') >= 0) {
        var col = { job: low.indexOf('JOB NO.'), mat: low.indexOf('MAT'), desc: low.indexOf('PRODUCT CODE') };
        col.plan = low.indexOf('PLAN', col.desc + 1); col.fin = low.indexOf('FINISH'); col.line = low.indexOf('U-LINE');
        return { head: i, col: col };
      }
    }
    return null;
  }
  function dailyHeaderDate(data) {
    for (var a = 0; a < Math.min(data.length, 15); a++) {
      for (var b = 0; b < (data[a] || []).length; b++) {
        var m = str(data[a][b]).match(/DATE\s*:\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/i);
        if (m) return isoDate(m[1] + '/' + m[2] + '/' + m[3]);
      }
    }
    return '';
  }
  function parseDaily(wb, opts) {
    var iss = Issues(), rows = [];
    var sn = wb.SheetNames[0], ws = wb.Sheets[sn];
    var data = toRows(ws);
    var hd = dailyHeader(data), col = hd ? hd.col : {};
    if (!hd || col.mat < 0 || col.plan < 0) return { ok: false, fatal: ['fatal.columns', { sheet: sn, cols: 'JOB No., MAT, PRODUCT CODE, PLAN' }] };
    var planDate = opts && opts.date ? isoDate(opts.date) : '';
    if (!planDate) return { ok: false, fatal: ['fatal.date_required', {}] };
    var hdrDate = dailyHeaderDate(data);
    if (hdrDate && hdrDate !== planDate) iss.add('warning', 'date_differs_header', { sheet: sn, note: hdrDate + ' / ' + planDate });
    var seenJob = new Set(), lines = {}, prods = new Set(), total = 0;
    for (var r = hd.head + 1; r < data.length; r++) {
      var row = data[r] || [];
      var job = str(row[col.job]), mat = str(row[col.mat]);
      if (!/^\d{8,12}$/.test(job) || !mat || mat === '-') continue;
      var rn = rowNo(data, r);
      var q = num(row[col.plan]);
      if (!(q > 0)) { iss.add('error', 'qty_invalid', { sheet: sn, row: rn, col: 'PLAN', val: str(row[col.plan]), note: job }); continue; }
      var fin = '';   // FINISH is ignored (agreed): the plan date given at upload is the date of every row
      if (seenJob.has(job)) iss.add('warning', 'dup_job', { sheet: sn, row: rn, col: 'JOB No.', val: job }); else seenJob.add(job);
      var line = col.line >= 0 ? str(row[col.line]) : '';
      lines[line || '-'] = (lines[line || '-'] || 0) + 1;
      prods.add(mat); total += q;
      rows.push([job, mat, str(row[col.desc]), q, line, fin]);
    }
    if (!rows.length) return { ok: false, fatal: ['fatal.no_rows', {}] };
    var lk = Object.keys(lines).sort();
    return {
      ok: true, rows: rows, issues: iss.list(), meta: { planDate: planDate },
      stats: [
        ['stat.plan_date', planDate], ['stat.jobs', rows.length], ['stat.products', prods.size], ['stat.total_qty', total],
        ['stat.lines', lk.map(function (k) { return k + ' (' + lines[k] + ')'; }).join(', ')]
      ]
    };
  }

  // ---------- Monthly plan (SAP job order export) ----------
  // In this system the monthly plan is used only to find a JOB's Plant from its Order number.
  // Required columns. Delivered / Confirmed quantity, Unit, Start date (sched), Scheduled finish date and System Status
  // are ignored (agreed): they are not read and not stored. Basic start date is optional and only pre-fills the month.
  var MO_H = {
    lead: 'Leading order', plant: 'Plant', order: 'Order', mat: 'Material Number', desc: 'Material description',
    qty: 'Order quantity (GMEIN)'
  };
  var MO_OPT = { bstart: 'Basic start date' };
  function optIdx(d, row, spec) {
    var low = (d[row] || []).map(function (c) { return str(c).toLowerCase(); }), o = {};
    Object.keys(spec).forEach(function (k) { o[k] = low.indexOf(spec[k].toLowerCase()); });
    return o;
  }
  function pickMonthlySheet(wb) {
    var best = null, miss = null;
    wb.SheetNames.forEach(function (n) {
      var d = toRows(wb.Sheets[n]); if (!d.length) return;
      var h = findHeader(d, MO_H);
      if (!h.missing.length) { if (!best || d.length > best.d.length) best = { n: n, d: d, h: h }; }
      else if (!miss || h.missing.length < miss.h.missing.length) miss = { n: n, h: h };
    });
    return { best: best, miss: miss };
  }
  function parseMonthly(wb, opts) {
    var iss = Issues(), rows = [];
    var pk = pickMonthlySheet(wb), best = pk.best;
    if (!best) {
      var m0 = pk.miss || { n: wb.SheetNames[0], h: { missing: Object.keys(MO_H).map(function (k) { return MO_H[k]; }) } };
      return { ok: false, fatal: ['fatal.columns', { sheet: m0.n, cols: m0.h.missing.join(', ') }] };
    }
    var month = opts && opts.month ? String(opts.month).slice(0, 7) : '';
    if (!/^\d{4}-\d{2}$/.test(month)) return { ok: false, fatal: ['fatal.date_required', {}] };
    var sn = best.n, h = best.h, d = best.d, ix = h.idx, ox = optIdx(d, h.row, MO_OPT);
    var seen = new Set(), prods = new Set(), plants = {}, total = 0, outside = 0;
    for (var i = h.row + 1; i < d.length; i++) {
      var r = d[i] || [];
      var order = str(r[ix.order]), mat = str(r[ix.mat]);
      if (!order && !mat) continue;
      var rn = rowNo(d, i);
      if (!order || !mat) { iss.add('error', 'key_empty', { sheet: sn, row: rn, col: !order ? MO_H.order : MO_H.mat, val: '', note: order || mat }); continue; }
      var q = num(r[ix.qty]);
      if (!(q > 0)) { iss.add('error', 'qty_invalid', { sheet: sn, row: rn, col: MO_H.qty, val: str(r[ix.qty]), note: order }); continue; }
      if (seen.has(order)) iss.add('warning', 'dup_order', { sheet: sn, row: rn, col: MO_H.order, val: order }); else seen.add(order);
      var bs = ox.bstart >= 0 ? isoDate(r[ox.bstart]) : '';
      if (bs && bs.slice(0, 7) !== month) outside++;
      var plant = str(r[ix.plant]);
      plants[plant] = (plants[plant] || 0) + 1;
      prods.add(mat); total += q;
      rows.push([str(r[ix.lead]), plant, order, mat, str(r[ix.desc]), q, '', '', '', '', '', '']);   // ignored columns kept empty so positions stay the same
    }
    if (!rows.length) return { ok: false, fatal: ['fatal.no_rows', {}] };
    return {
      ok: true, rows: rows, issues: iss.list(), meta: { month: month },
      stats: [
        ['stat.month', month], ['stat.jobs', rows.length], ['stat.products', prods.size], ['stat.total_qty', total],
        ['stat.plants', Object.keys(plants).sort().map(function (p) { return p + ' (' + plants[p] + ')'; }).join(', ')]
      ]
    };
  }

  // Value offered to pre-fill the date / month field at upload. The admin can change it; the file name is never used.
  function suggest(type, wb) {
    try {
      if (type === 'daily') return dailyHeaderDate(toRows(wb.Sheets[wb.SheetNames[0]]));
      if (type === 'monthly') {
        var pk = pickMonthlySheet(wb); if (!pk.best) return '';
        var b = pk.best, ms = [];
        for (var i = b.h.row + 1; i < b.d.length; i++) {
          var r = b.d[i] || [];
          var oi = optIdx(b.d, b.h.row, MO_OPT), bs = oi.bstart >= 0 ? isoDate(r[oi.bstart]) : '';
          if (bs) ms.push(bs.slice(0, 7));
        }
        return topCount(ms);
      }
    } catch (e) { /* no suggestion */ }
    return '';
  }

  PWH.parsers = {
    detectType: detectType,
    readWorkbook: function (buf) { return XLSX.read(buf, { type: 'array', cellDates: true }); },
    suggest: suggest,
    // opts: { date: 'YYYY-MM-DD' } for the daily plan, { month: 'YYYY-MM' } for the monthly plan
    parse: function (type, wb, filename, opts) {
      if (type === 'bom') return parseBom(wb);
      if (type === 'matloc') return parseMatLoc(wb);
      if (type === 'daily') return parseDaily(wb, opts);
      if (type === 'monthly') return parseMonthly(wb, opts);
      return { ok: false, fatal: ['fatal.type', {}] };
    },
    isoDate: isoDate
  };
})(window);
