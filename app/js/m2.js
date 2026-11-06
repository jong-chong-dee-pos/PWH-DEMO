/* Module 2: warehouse layout. Import, 2D / 3D view, link to stock locations.
 * Editing (add / move racks, aisles, START / DROP points) is the next piece of this module. */
(function (g) {
  var PWH = g.PWH, t = PWH.t;
  var LEVEL_H = 0.5;                       // metres per rack level in the 3D view
  var COS30 = 0.866;
  // The map is a small kit: Module 2 and Module 3 each get their own instance (own view, own state).
  function create(modeKey) {
  var M = {
    layout: null, match: null, mlRows: null, floor: 0, mode: '2d', sel: null, hover: null,
    names: true, q: '', qp: '', qb: '', color: 'zone', fs: false, hl: null, results: [], partNames: new Map(),
    v: { z: 1, ox: 0, oy: 0 }, canvas: null, ctx: null, hits: [], dpr: 1, root: null, confirmRemove: false, busy: ''
  };
  try { var sm = localStorage.getItem(modeKey); if (sm === '2d' || sm === '3d') M.mode = sm; } catch (e) {}
  M.overlay = null;
  // floor / 2D-3D changes redraw in place (a rebuilt page would drop the real full screen)
  M.rerender = function () {
    if (!M.canvas || !document.body.contains(M.canvas)) { render(); return; }
    M.root.querySelectorAll('[data-m2=floor]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-v') === String(M.floor)); });
    M.root.querySelectorAll('[data-m2=mode]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-v') === M.mode); });
    side(); resize(); fit(); draw();
  };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function nf(n) { return typeof n === 'number' ? n.toLocaleString('en-US', { maximumFractionDigits: 2 }) : esc(n); }
  function $(s) { return M.root.querySelector(s); }

  // ---------- colours ----------
  // The map frame is dark (agreed), whatever the page theme: navy floor, slate-blue racks, bright colour only for what matters.
  var ZONES = ['#38bdf8', '#a78bfa', '#f472b6', '#fb923c', '#facc15', '#4ade80', '#2dd4bf', '#60a5fa', '#f87171', '#c084fc', '#a3e635', '#fbbf24'];
  function zoneOf(id) { var m = String(id).match(/^([0-9]*[A-Z]+)/); return m ? m[1] : String(id); }
  function zoneColor(id) { var z = zoneOf(id), h = 0; for (var i = 0; i < z.length; i++) h = (h * 31 + z.charCodeAt(i)) >>> 0; return ZONES[h % ZONES.length]; }
  function pal() {
    return { l: { 1: '#46628a', 3: '#7a6448', 4: '#4b7a60' }, rack: '#3a4e6b', none: '#2b3a50', aisle: '#21406a', ground: '#13233a', bg: '#0c1726', outside: '#211f3d',
      stock: '#4f8cff', ink: '#e8eef7', sel: '#ffffff', hit: '#2f86ff', hitLine: '#9cc8ff', start: '#22c55e', drop: '#3b82f6', door: '#d4a72c', lift: '#8b5cf6', exit: '#a08c5a',
      line: 'rgba(150,180,220,0.30)', route: '#38a3ff' };
  }
  function rgb(hex) { var h = hex.replace('#', ''); return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; }
  function shade(hex, f, a) { var c = rgb(hex); return 'rgba(' + Math.min(255, Math.round(c[0] * f)) + ',' + Math.min(255, Math.round(c[1] * f)) + ',' + Math.min(255, Math.round(c[2] * f)) + ',' + (a == null ? 1 : a) + ')'; }

  // ---------- projection ----------
  function P(x, y, z) {
    var v = M.v;
    if (M.mode === '2d') return [x * v.z + v.ox, y * v.z + v.oy];
    return [((x - y) * COS30) * v.z + v.ox, ((x + y) * 0.5 - (z || 0)) * v.z + v.oy];
  }
  function floorObj() { return M.layout && M.layout.floors[M.floor]; }
  function levelPx() { return LEVEL_H * M.layout.scale; }
  function fit() {
    var f = floorObj(); if (!f || !M.canvas) return;
    var cw = M.canvas.clientWidth, ch = M.canvas.clientHeight, b = f.bbox, maxH = 4 * levelPx();
    M.v = { z: 1, ox: 0, oy: 0 };
    var xs = [], ys = [];
    [[b[0], b[1]], [b[2], b[1]], [b[2], b[3]], [b[0], b[3]]].forEach(function (c) {
      [0, M.mode === '3d' ? maxH : 0].forEach(function (z) { var p = P(c[0], c[1], z); xs.push(p[0]); ys.push(p[1]); });
    });
    var minx = Math.min.apply(null, xs), maxx = Math.max.apply(null, xs), miny = Math.min.apply(null, ys), maxy = Math.max.apply(null, ys);
    // leave room for the legend inside the map and, in full screen, for the panel along the bottom
    var dockEl = M.fs && M.root && (M.root.querySelector('.m2side:not([hidden])') || M.root.querySelector('.m3dock:not([hidden])'));
    var bottom = (dockEl ? dockEl.offsetHeight + 10 : 0) + (M.root && M.root.querySelector('#m2legend') ? 34 : 0);
    var z = Math.min((cw - 40) / (maxx - minx), (ch - 40 - bottom) / (maxy - miny));
    M.v = { z: z, ox: (cw - (maxx - minx) * z) / 2 - minx * z, oy: (ch - bottom - (maxy - miny) * z) / 2 - miny * z };
  }

  // ---------- drawing ----------
  function poly(pts, fill, stroke, lw) {
    var c = M.ctx; c.beginPath();
    for (var i = 0; i < pts.length; i++) { if (i) c.lineTo(pts[i][0], pts[i][1]); else c.moveTo(pts[i][0], pts[i][1]); }
    c.closePath();
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 1; c.stroke(); }
  }
  function rectPts(o, z) { return [P(o.x, o.y, z), P(o.x + o.w, o.y, z), P(o.x + o.w, o.y + o.h, z), P(o.x, o.y + o.h, z)]; }
  function label(txt, p, color, bg, size) {
    var c = M.ctx; c.font = '600 ' + size + 'px "IBM Plex Sans Thai", system-ui, sans-serif';
    var w = c.measureText(txt).width + 10, h = size + 6;
    c.fillStyle = bg; c.beginPath(); if (c.roundRect) c.roundRect(p[0] - w / 2, p[1] - h / 2, w, h, 4); else c.rect(p[0] - w / 2, p[1] - h / 2, w, h); c.fill();
    c.fillStyle = color; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(txt, p[0], p[1] + 0.5);
  }
  function occOf(r) { return M.match && M.match.occ.get(r.id); }
  function stockLevels(r) { var o = occOf(r); return o ? Object.keys(o).map(Number).filter(function (l) { return l >= 1 && l <= r.levels; }) : []; }

  function draw() {
    var c = M.ctx, f = floorObj(); if (!c || !f) return;
    var cw = M.canvas.clientWidth, ch = M.canvas.clientHeight, C = pal();
    c.setTransform(M.dpr, 0, 0, M.dpr, 0, 0);
    c.fillStyle = C.bg; c.fillRect(0, 0, cw, ch);
    M.hits = [];
    var b = f.bbox, pad = 14, plate = { x: b[0] - pad, y: b[1] - pad, w: b[2] - b[0] + 2 * pad, h: b[3] - b[1] + 2 * pad };
    poly(rectPts(plate, 0), C.ground, C.line, 1);
    f.outside.forEach(function (o) { poly(rectPts(o, 0), C.outside); });
    f.aisles.forEach(function (o) { poly(rectPts(o, 0), C.aisle); });
    var d3 = M.mode === '3d', lp = levelPx(), z = M.v.z;
    // markers lie flat on the floor
    f.markers.forEach(function (m) {
      var col = C[m.type] || C.door;
      poly(rectPts(m, 0), shade(col, 1, 0.9), null);
    });
    // racks
    var racks = f.racks.slice();
    if (d3) racks.sort(function (a, b2) { return (a.x + a.w / 2 + a.y + a.h / 2) - (b2.x + b2.w / 2 + b2.y + b2.h / 2); });
    racks.forEach(function (r) {
      var base = M.color === 'levels' ? (C.l[r.levels] || C.none) : C.rack, sl = stockLevels(r), H = r.levels * lp;
      if (M.color === 'stock') base = sl.length ? C.stock : C.none;
      var hit = { id: r.id, polys: [] };
      if (!d3) {
        var rp = rectPts(r, 0), op = sl.length / r.levels;
        poly(rp, M.color === 'stock' ? shade(base, 1, sl.length ? 0.35 + 0.65 * op : 1) : shade(base, 1, 1), C.line, 1);
        if (M.color === 'zone') {   // thin zone strip along the long edge
          var sw = Math.max(1.5, 3.5 / z), sx = r.w >= r.h ? { x: r.x, y: r.y, w: r.w, h: Math.min(r.h * 0.2, sw) } : { x: r.x, y: r.y, w: Math.min(r.w * 0.2, sw), h: r.h };
          poly(rectPts(sx, 0), zoneColor(r.id));
        }
        hit.polys.push(rp);
      } else {
        // glass-like rack: stock cubes first (inside), then the faces on top
        sl.forEach(function (l) {
          var inx = r.w * 0.18, iny = r.h * 0.18, cb = { x: r.x + inx, y: r.y + iny, w: r.w - 2 * inx, h: r.h - 2 * iny }, z0 = (l - 1) * lp + 1, z1 = z0 + lp * 0.78;
          poly([P(cb.x, cb.y + cb.h, z0), P(cb.x + cb.w, cb.y + cb.h, z0), P(cb.x + cb.w, cb.y + cb.h, z1), P(cb.x, cb.y + cb.h, z1)], shade(C.stock, 0.85));
          poly([P(cb.x + cb.w, cb.y, z0), P(cb.x + cb.w, cb.y + cb.h, z0), P(cb.x + cb.w, cb.y + cb.h, z1), P(cb.x + cb.w, cb.y, z1)], shade(C.stock, 0.68));
          poly([P(cb.x, cb.y, z1), P(cb.x + cb.w, cb.y, z1), P(cb.x + cb.w, cb.y + cb.h, z1), P(cb.x, cb.y + cb.h, z1)], shade(C.stock, 1.12));
        });
        if (M.color === 'zone') { var sw3 = Math.max(1.5, 3.5 / z), fz = r.w >= r.h ? { x: r.x, y: r.y + r.h, w: r.w, h: Math.min(r.h * 0.25, sw3) } : { x: r.x + r.w, y: r.y, w: Math.min(r.w * 0.25, sw3), h: r.h }; poly(rectPts(fz, 0), zoneColor(r.id)); }
        var a = M.color === 'stock' && !sl.length ? 0.35 : 0.55;
        var left = [P(r.x, r.y + r.h, 0), P(r.x + r.w, r.y + r.h, 0), P(r.x + r.w, r.y + r.h, H), P(r.x, r.y + r.h, H)];
        var right = [P(r.x + r.w, r.y, 0), P(r.x + r.w, r.y + r.h, 0), P(r.x + r.w, r.y + r.h, H), P(r.x + r.w, r.y, H)];
        var top = [P(r.x, r.y, H), P(r.x + r.w, r.y, H), P(r.x + r.w, r.y + r.h, H), P(r.x, r.y + r.h, H)];
        var fb = M.color === 'stock' ? C.none : base;
        poly(left, shade(fb, 0.96, a), C.line, 0.8);
        poly(right, shade(fb, 0.8, a), C.line, 0.8);
        poly(top, shade(fb, 1.08, Math.min(1, a + 0.2)), C.line, 0.8);
        for (var k = 1; k < r.levels; k++) {   // shelf boards
          poly([P(r.x, r.y + r.h, k * lp), P(r.x + r.w, r.y + r.h, k * lp), P(r.x + r.w, r.y, k * lp)], null, C.line, 0.7);
        }
        hit.polys.push(top, left, right);
      }
      M.hits.push(hit);
      if (M.names) {
        var cw2 = r.w * z * (d3 ? 0.8 : 1), ch2 = r.h * z * (d3 ? 0.55 : 1), len = String(r.id).length;
        var fs = Math.min(d3 ? 12 : 13, cw2 * 0.92 / (len * 0.62), ch2 * 0.72);
        if (fs >= 6) {
          var tp = d3 ? P(r.x + r.w / 2, r.y + r.h / 2, H) : P(r.x + r.w / 2, r.y + r.h / 2, 0);
          c.font = '500 ' + fs.toFixed(1) + 'px "IBM Plex Mono", monospace';
          c.fillStyle = C.ink; c.globalAlpha = 0.78; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(r.id, tp[0], tp[1]); c.globalAlpha = 1;
        }
      }
    });
    // racks found by the search
    if (M.hl && M.hl.size) {
      f.racks.forEach(function (r) {
        if (!M.hl.has(r.id)) return;
        var H3 = d3 ? r.levels * lp : 0;
        c.save(); c.shadowColor = C.hit; c.shadowBlur = 12; poly(rectPts(r, H3), 'rgba(47,134,255,0.85)', C.hitLine, 2); c.restore();
        if (M.names) { var tq = P(r.x + r.w / 2, r.y + r.h / 2, H3), fq = Math.max(9, Math.min(13, r.w * z / (String(r.id).length * 0.62))); c.font = '600 ' + fq + 'px "IBM Plex Mono", monospace'; c.fillStyle = '#ffffff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(r.id, tq[0], tq[1]); }
      });
    }
    // marker labels on top
    f.markers.forEach(function (m) {
      var col = C[m.type] || C.door, mid = P(m.x + m.w / 2, m.y + m.h / 2, d3 ? 26 : 0);
      var name = t('m2.mk.' + m.type);
      label(name, mid, '#ffffff', shade(col, 0.95), 11);
    });
    // selection / hover outlines
    [[M.hover, 1.5], [M.sel, 3]].forEach(function (pair) {
      if (!pair[0] || (pair[0] === M.sel && pair[1] === 1.5)) return;
      var r = M.match ? M.match.rackById.get(pair[0]) : null;
      if (!r) { r = f.racks.filter(function (x) { return x.id === pair[0]; })[0]; }
      if (!r || r.floor !== f.id) return;
      var H2 = d3 ? r.levels * lp : 0;
      if (pair[0] === M.sel && pair[1] === 3) {
        c.save(); c.shadowColor = C.hit; c.shadowBlur = 14; poly(rectPts(r, H2), 'rgba(47,134,255,0.55)', C.sel, 3); c.restore();
        var ts = P(r.x + r.w / 2, r.y + r.h / 2, H2), fsz = Math.max(10, Math.min(14, r.w * z / (String(r.id).length * 0.62)));
        c.font = '700 ' + fsz + 'px "IBM Plex Mono", monospace'; c.fillStyle = '#ffffff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(r.id, ts[0], ts[1]);
      }
      else poly(rectPts(r, H2), null, 'rgba(255,255,255,0.7)', pair[1]);
      if (d3) poly(rectPts(r, 0), null, C.sel, pair[1]);
    });
    if (M.overlay) M.overlay(c, P, f, { d3: d3, lp: lp, z: z, pal: C });
  }

  // ---------- hit testing ----------
  function inPoly(p, pts) {
    var inside = false;
    for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      var xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
      if (((yi > p[1]) !== (yj > p[1])) && (p[0] < (xj - xi) * (p[1] - yi) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;
  }
  function hitAt(px, py) {
    for (var i = M.hits.length - 1; i >= 0; i--) {
      var h = M.hits[i];
      for (var k = 0; k < h.polys.length; k++) if (inPoly([px, py], h.polys[k])) return h.id;
    }
    return null;
  }

  // ---------- panels ----------
  function summary() {
    var L = M.layout, s = M.match && M.match.stat, rows = '';
    var racks = 0, lv = { 1: 0, 3: 0, 4: 0 };
    L.floors.forEach(function (f) { racks += f.racks.length; f.racks.forEach(function (r) { lv[r.levels] = (lv[r.levels] || 0) + 1; }); });
    function row(k, v) { return '<div><dt>' + esc(k) + '</dt><dd>' + v + '</dd></div>'; }
    rows += row(t('m2.side.racks'), nf(racks) + ' (' + L.floors.map(function (f) { return t('m2.floor', { n: f.id.slice(1) }) + ': ' + f.racks.length; }).join(', ') + ')');
    rows += row(t('m2.side.levels'), Object.keys(lv).filter(function (k) { return lv[k]; }).map(function (k) { return t('m2.legend.l' + (k === '1' ? '1' : 'n'), { n: k }) + ': ' + lv[k]; }).join(', '));
    var html = '<dl class="facts">' + rows;
    if (s) {
      html += row(t('m2.side.bins_on'), nf(s.onLayout) + ' / ' + nf(s.stockBins));
      html += row(t('m2.side.empty_on'), nf(s.emptyOnLayout) + ' / ' + nf(s.emptyBins));
    }
    html += '</dl>';
    if (!s) html += '<p class="sub">' + esc(t('m2.side.nodata')) + '</p>';
    else {
      var off = s.stockBins - s.onLayout, parts = '';
      if (s.specialCount) parts += '<li>' + esc(t('m2.unmatched.special', { list: s.special.join(', ') })) + '</li>';
      var mr = Array.from(s.missing.keys());
      if (mr.length) parts += '<li>' + esc(t('m2.unmatched.racks', { n: mr.length, list: mr.slice(0, 14).join(', ') + (mr.length > 14 ? ' …' : '') })) + '</li>';
      if (s.levelOver.length) parts += '<li>' + esc(t('m2.unmatched.levels', { n: s.levelOver.length, list: s.levelOver.slice(0, 8).join(', ') })) + '</li>';
      if (off || s.levelOver.length) html += '<h2 style="font-size:12px;color:var(--muted);font-weight:500">' + esc(t('m2.unmatched.title')) + '</h2><ul class="samples" style="color:var(--ink)">' + parts + '</ul>';
    }
    html += '<p class="sub" style="margin-top:10px">' + esc(t('m2.scale_note', { px: M.layout.scale })) + '</p>';
    return html;
  }
  function binName(r, l) { return r.levels > 1 ? r.id + '-' + (l < 10 ? '0' : '') + l : r.id; }
  function plantTxt(p) { return esc(String(p || '')); }
  function partCell(mat, plant) { var nm = M.partNames.get(mat); return '<span class="code">' + esc(mat) + '</span>' + (nm ? '<small class="m2pn" title="' + esc(nm) + '">' + esc(nm) + '</small>' : '') + (plant ? '<small class="m2pp">Plant ' + esc(plant) + '</small>' : ''); }
  function dHead(cap, title, sub, chips, closeBtn) {
    return '<div class="m2dh"><div class="m2dt"><div class="m2cap">' + esc(cap) + '</div><h2 class="m2tt">' + esc(title) + '</h2><p class="m2st">' + esc(sub) + '</p></div>' +
      '<div class="m2dr">' + (chips || '') + (closeBtn ? '<button class="btn sm m2back" data-m2="back">' + esc(t('m2.back')) + '</button><button class="btn sm" data-m2="close">' + esc(t('m2.sel.close')) + '</button>' : '') + '</div></div>';
  }
  function levelOf(bin) { var bi = PWH.layout.binInfo(bin); return bi ? bi.level : '–'; }
  function rackPanel(id) {
    var r = M.match ? M.match.rackById.get(id) : null;
    if (!r) M.layout.floors.forEach(function (f) { f.racks.forEach(function (x) { if (x.id === id) r = x; }); });
    if (!r) return summary();
    var occ = occOf(r) || {}, used = 0, parts = new Set(), n = 0, emptyLv = [], rows = '';
    for (var l = r.levels; l >= 1; l--) {
      var bins = occ[l] || [];
      if (!bins.length) { emptyLv.push(binName(r, l)); continue; }
      used++;
      bins.forEach(function (b) {
        b.items.forEach(function (it) {
          parts.add(it.mat); n++;
          rows += '<tr><td class="num m2no">' + n + '</td><td>' + partCell(it.mat, it.plant) + '</td><td><span class="loc">' + esc(b.bin) + '</span></td><td class="m2lv">' + esc(String(l)) + '</td><td class="m2pl">' + plantTxt(it.plant) + '</td><td class="num">' + nf(it.stock) + '</td></tr>';
        });
      });
    }
    var chips = '<span class="chip info">' + esc(t('m2.sel.parts', { n: parts.size })) + '</span>';
    var html = dHead(t('m2.sel.caption'), t('m2.sel.title2', { id: r.id }), t('m2.sel.note') + ' • ' + t('m2.sel.sub', { floor: r.floor.slice(1), levels: r.levels }), chips + '<span class="chip ' + (emptyLv.length ? 'ok' : 'warn') + '">' + esc(t('m2.sel.free', { n: emptyLv.length, t: r.levels })) + '</span>', true);
    html += '<div class="m2dbody">';
    if (n) {
      html += '<table class="m2tbl m2det"><thead><tr><th class="num">' + esc(t('m2.col.no')) + '</th><th>' + esc(t('m2.col.part')) + '</th><th>' + esc(t('m2.col.bin')) + '</th><th>' + esc(t('m2.col.level')) + '</th><th>' + esc(t('m2.col.plant')) + '</th><th class="num">' + esc(t('m2.col.qty')) + '</th></tr></thead><tbody>' + rows + '</tbody></table>';
    } else html += '<p class="m2none">' + esc(t('m2.sel.empty')) + '</p>';
    if (emptyLv.length) html += '<div class="m2fr"><b>' + esc(t('m2.sel.freelist')) + '</b> ' + emptyLv.map(function (x) { return '<span class="code m2fb">' + esc(x) + '</span>'; }).join('') + '</div>';
    return html + '</div>';
  }
  // ---------- search by Part and/or Bin ----------
  function doSearch(q) {
    q = String(q || '').trim().toUpperCase();
    M.q = q; M.hl = new Set(); M.results = [];
    if (!q || !M.mlRows || !M.match) return;
    M.mlRows.forEach(function (r) {
      var inMat = r[2] && String(r[2]).toUpperCase().indexOf(q) >= 0, inBin = String(r[1]).toUpperCase().indexOf(q) >= 0;
      if (!inMat && !inBin) return;
      var bi = PWH.layout.binInfo(r[1]), rack = bi && M.match.rackById.get(bi.rack);
      M.results.push({ bin: r[1], mat: r[2], plant: r[3], stock: r[4], rack: rack ? rack.id : null, floor: rack ? rack.floor : null });
      if (rack) M.hl.add(rack.id);
    });
    M.results.sort(function (a, b2) { return a.mat < b2.mat ? -1 : a.mat > b2.mat ? 1 : a.bin < b2.bin ? -1 : 1; });
  }
  // move + zoom the view so these racks fill the map; switches floor when none is on the current one
  function zoomToRacks(ids) {
    if (!ids || !ids.length || !M.layout || !M.match) return;
    var racks = ids.map(function (id) { return M.match.rackById.get(id); }).filter(Boolean); if (!racks.length) return;
    var fids = M.layout.floors.map(function (f) { return f.id; }), cur = fids[M.floor];
    var here = racks.filter(function (r) { return r.floor === cur; });
    if (!here.length) { var fi = fids.indexOf(racks[0].floor); if (fi >= 0) { M.floor = fi; M.rerender(); } here = racks.filter(function (r) { return r.floor === fids[M.floor]; }); }
    if (!M.canvas || !here.length) return;
    fit(); var fz = M.v.z;
    M.v = { z: 1, ox: 0, oy: 0 };
    var xs = [], ys = [], lp = levelPx();
    here.forEach(function (r) { [[r.x, r.y], [r.x + r.w, r.y], [r.x + r.w, r.y + r.h], [r.x, r.y + r.h]].forEach(function (c0) { [0, M.mode === '3d' ? r.levels * lp : 0].forEach(function (h) { var p = P(c0[0], c0[1], h); xs.push(p[0]); ys.push(p[1]); }); }); });
    var minx = Math.min.apply(null, xs), maxx = Math.max.apply(null, xs), miny = Math.min.apply(null, ys), maxy = Math.max.apply(null, ys);
    var sd = $('#m2side'), dock = M.fs && sd && !sd.hidden ? sd.offsetHeight + 10 : 0;
    // centre in the part of the map that is on screen (the page may hide its lower part on short screens)
    var rc = M.canvas.getBoundingClientRect(), full = M.canvas.clientHeight - dock;
    var vTop = M.fs ? 0 : Math.max(0, -rc.top), vBot = M.fs ? full : Math.min(full, window.innerHeight - rc.top);
    if (vBot - vTop < 160) { vTop = 0; vBot = full; }
    var cw = M.canvas.clientWidth, ch = vBot - vTop, w = Math.max(maxx - minx, 1), h = Math.max(maxy - miny, 1);
    var z = Math.min((cw * 0.5) / w, (ch * 0.5) / h, fz * (here.length > 1 ? 5 : 3.5)); z = Math.max(z, fz);
    M.v = { z: z, ox: cw / 2 - (minx + w / 2) * z, oy: vTop + ch / 2 - (miny + h / 2) * z };
    draw();
  }
  function searchPanel() {
    var R = M.results, MAX = 150;
    var html = dHead(t('m2.res.caption'), t('m2.res.head') + ' “' + M.q + '”', R.length ? t('m2.res.sub', { r: M.hl.size }) : t('m2.res.none'), '<span class="chip info">' + esc(t('m2.res.count', { n: R.length })) + '</span>', true);
    if (!R.length) return html;
    html += '<div class="m2dbody"><table class="m2tbl m2det search"><thead><tr><th class="num">' + esc(t('m2.col.no')) + '</th><th>' + esc(t('m2.col.part')) + '</th><th>' + esc(t('m2.col.bin')) + '</th><th>' + esc(t('m2.col.floor')) + '</th><th class="num">' + esc(t('m2.col.qty')) + '</th></tr></thead><tbody>';
    R.slice(0, MAX).forEach(function (x, i) {
      html += '<tr class="m2go' + (x.rack ? '' : ' m2off') + '" data-m2="goto" data-i="' + i + '"><td class="num m2no">' + (i + 1) + '</td><td>' + (x.mat ? partCell(x.mat) : '<span class="m2none">' + esc(t('m2.sel.free_bin')) + '</span>') + '</td><td><span class="loc">' + esc(x.bin) + '</span></td><td class="m2lv">' + (x.floor ? esc(x.floor.slice(1)) : '–') + '</td><td class="num">' + (x.mat ? nf(x.stock) : '') + '</td></tr>';
    });
    html += '</tbody></table>';
    if (R.length > MAX) html += '<p class="sub" style="margin:8px 0 0">' + esc(t('m2.res.more', { n: MAX, t: R.length })) + '</p>';
    return html + '</div>';
  }
  function side(scroll) {
    var el = $('#m2side'); if (!el) return;
    var show = !!(M.sel || M.q);
    el.hidden = !show;
    if (!show) { el.innerHTML = ''; return; }
    el.innerHTML = '<div class="m2grip" data-m2grip title="' + esc(t('m2.dock.drag')) + '"></div>' + (M.sel ? rackPanel(M.sel) : searchPanel());
    if (scroll && !M.fs) setTimeout(function () { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 30);
  }

  // ---------- page ----------
  function seg(items, cur, act) {
    return '<div class="seg" role="group">' + items.map(function (i) { return '<button data-m2="' + act + '" data-v="' + i[0] + '" aria-pressed="' + (cur === i[0]) + '">' + esc(i[1]) + '</button>'; }).join('') + '</div>';
  }
  function importPanel(inline) {
    var has = !!M.layout, msg = '<div id="m2msg" class="msgs">' + (M.busy ? '<div class="msg busy"><span>' + esc(M.busy) + '</span></div>' : '') + '</div>';
    if (has) {
      return '<div class="m2imp" title="' + esc(t('m2.loaded', { name: M.layout.source, when: fmt(M.layout.importedAt) })) + '"><label class="btn" style="cursor:pointer">' + esc(t('m2.reimport')) + '<input type="file" id="m2file" accept=".xlsx,.xls" hidden></label><button class="btn danger' + (M.confirmRemove ? ' confirm' : '') + '" data-m2="remove">' + esc(t(M.confirmRemove ? 'm2.remove_confirm' : 'm2.remove')) + '</button><span id="m2msg" class="msgs" style="margin:0"></span></div>';
    }
    return '<section class="panel"><h2>' + esc(t('m2.import.title')) + '</h2><p class="sub">' + esc(t('m2.import.help')) + '</p><label class="drop" id="m2drop"><input type="file" id="m2file" accept=".xlsx,.xls"><b>' + esc(t('m2.import.drop')) + '</b></label>' + msg + '</section>';
  }
  function fmt(ms) { var d = new Date(ms), p = function (n) { return (n < 10 ? '0' : '') + n; }; return p(d.getDate()) + '/' + p(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()); }

  function fsLabel() { return t(M.fs ? 'm2.fs.exit' : 'm2.fs'); }
  function rackCount() {
    var L = M.layout, n = 0; L.floors.forEach(function (f) { n += f.racks.length; });
    return t('m2.count', { n: nf(n) }) + ' (' + L.floors.map(function (f) { return t('m2.floor', { n: f.id.slice(1) }) + ': ' + nf(f.racks.length); }).join(' · ') + ')';
  }
  function warnBar() {
    var s = M.match && M.match.stat; if (!s) return '';
    var off = s.stockBins - s.onLayout, mr = Array.from(s.missing.keys()); if (!off && !s.levelOver.length) return '';
    var items = '';
    if (s.specialCount) items += '<li><b>' + esc(t('m2.warn.special')) + '</b> ' + s.special.map(function (x) { return '<span class="m2wb">' + esc(x) + '</span>'; }).join('') + '</li>';
    if (mr.length) items += '<li><b>' + esc(t('m2.warn.racks', { n: mr.length })) + '</b> ' + mr.map(function (x) { return '<span class="m2wb code">' + esc(x) + '</span>'; }).join('') + '</li>';
    if (s.levelOver.length) items += '<li><b>' + esc(t('m2.warn.levels', { n: s.levelOver.length })) + '</b> ' + s.levelOver.map(function (x) { return '<span class="m2wb code">' + esc(x) + '</span>'; }).join('') + '</li>';
    return '<details class="m2warn"><summary><span class="m2wi" aria-hidden="true">!</span>' + esc(t('m2.warn.title', { n: nf(off) })) + '<span class="more">' + esc(t('m2.warn.open')) + '</span></summary><ul>' + items + '</ul></details>';
  }
  function adminMenu() {
    return '<details class="m2adm"><summary class="btn">' + esc(t('m2.admin')) + ' ▾</summary><div class="m2admp"><p class="sub">' + esc(t('m2.loaded', { name: M.layout.source, when: fmt(M.layout.importedAt) })) + '</p>' +
      '<label class="btn" style="cursor:pointer">' + esc(t('m2.reimport')) + '<input type="file" id="m2file" accept=".xlsx,.xls" hidden></label> ' +
      '<button class="btn danger' + (M.confirmRemove ? ' confirm' : '') + '" data-m2="remove">' + esc(t(M.confirmRemove ? 'm2.remove_confirm' : 'm2.remove')) + '</button><div id="m2msg" class="msgs"></div></div></details>';
  }
  function legendHtml() {
    var C = pal(), chip = function (col, txt, cls) { return '<span class="lg' + (cls ? ' ' + cls : '') + '"><i style="background:' + col + '"></i>' + esc(txt) + '</span>'; };
    var first = M.color === 'zone' ? chip('linear-gradient(90deg,#38bdf8,#a78bfa,#f472b6,#fb923c)', t('m2.legend.zone'))
      : M.color === 'levels' ? chip(C.l[1], t('m2.legend.l1')) + chip(C.l[3], t('m2.legend.l', { n: 3 })) + chip(C.l[4], t('m2.legend.l', { n: 4 }))
      : chip(C.stock, t('m2.legend.stock')) + chip(C.none, t('m2.legend.empty'));
    return first + chip(C.hit, t('m2.legend.hit')) + chip(C.aisle, t('m2.legend.aisle')) + chip(C.start, t('m2.mk.start')) + chip(C.drop, t('m2.mk.drop'));
  }
  function mapPanel() {
    var L = M.layout;
    var floors = L.floors.map(function (f, i) { return [String(i), t('m2.floor', { n: f.id.slice(1) })]; });
    var bar = '<div class="m2tool"><div class="m2qwrap"><input id="m2q" class="m2q1" type="search" autocomplete="off" placeholder="' + esc(t('m2.q.ph')) + '" value="' + esc(M.q) + '" aria-label="' + esc(t('m2.q.ph')) + '"></div>' +
      seg(floors, String(M.floor), 'floor') + seg([['2d', t('m2.view.2d')], ['3d', t('m2.view.3d')]], M.mode, 'mode') +
      '<button class="btn" data-m2="names" aria-pressed="' + M.names + '">' + esc(t('m2.names')) + '</button>' +
      '<label class="inl"><span class="inlt">' + esc(t('m2.color')) + '</span> <select id="m2color" aria-label="' + esc(t('m2.color')) + '"><option value="zone"' + (M.color === 'zone' ? ' selected' : '') + '>' + esc(t('m2.color.zone')) + '</option><option value="levels"' + (M.color === 'levels' ? ' selected' : '') + '>' + esc(t('m2.color.levels')) + '</option><option value="stock"' + (M.color === 'stock' ? ' selected' : '') + '>' + esc(t('m2.color.stock')) + '</option></select></label>' +
      '<span class="grow"></span><div class="m2zoom"><button class="btn" data-m2="zout" aria-label="Zoom out">−</button><button class="btn" data-m2="zin" aria-label="Zoom in">+</button><button class="btn" data-m2="fit">' + esc(t('m2.fit')) + '</button></div><button class="btn primary" data-m2="fs">' + esc(fsLabel()) + '</button></div>';
    return '<section class="panel m2mapcard' + (M.fs ? ' fs' : '') + '" data-fsbox>' + bar +
      '<div class="m2canvas" id="m2wrap"><canvas id="m2cv" tabindex="0" aria-label="Warehouse map"></canvas><div id="m2tip" class="m2tip" hidden></div><div class="m2legend" id="m2legend">' + legendHtml() + '</div></div>' +
      '<div class="m2side" id="m2side" hidden></div><span class="sr-only" id="m2live" role="status" aria-live="polite"></span></section>';
  }

  function render() {
    var root = M.root;
    if (!M.layout) {
      root.innerHTML = '<div class="ph"><div class="ph-l"><div class="cap">' + esc(t('mod.cap', { n: 2 })) + '</div><h1>' + esc(t('nav.m2')) + '</h1><p class="lede">' + esc(t('m2.intro')) + '</p></div></div>' + importPanel();
      wireImport(); return;
    }
    root.innerHTML = '<div class="ph m2ph"><div class="ph-l"><div class="cap">' + esc(t('mod.cap', { n: 2 })) + '</div><h1>' + esc(t('nav.m2')) + '</h1></div><div class="ph-r m2phr"><span class="m2cnt">' + esc(rackCount()) + '</span>' + adminMenu() + '</div></div>' +
      warnBar() + mapPanel();
    wireImport(); wireMap(); side();
    resize(); fit(); draw();
  }

  // ---------- events ----------
  function wireImport() {
    var inp = $('#m2file'); if (!inp) return;
    inp.addEventListener('change', function () { if (inp.files[0]) importFile(inp.files[0]); });
    var d = $('#m2drop');
    if (d) {
      ['dragenter', 'dragover'].forEach(function (ev) { d.addEventListener(ev, function (e) { e.preventDefault(); d.classList.add('over'); }); });
      ['dragleave', 'drop'].forEach(function (ev) { d.addEventListener(ev, function (e) { e.preventDefault(); d.classList.remove('over'); }); });
      d.addEventListener('drop', function (e) { if (e.dataTransfer.files[0]) importFile(e.dataTransfer.files[0]); });
    }
  }
  function say(kind, text) { var el = $('#m2msg'); if (el) el.innerHTML = '<div class="msg ' + kind + '" role="status"><span>' + esc(text) + '</span></div>'; if (kind === 'ok') setTimeout(function () { var e2 = $('#m2msg'); if (e2) e2.innerHTML = ''; }, 6000); }
  function importFile(file) {
    M.busy = t('m2.import.reading'); say('busy', M.busy);
    return new Promise(function (r) { setTimeout(r, 30); }).then(function () { return file.arrayBuffer(); }).then(function (buf) {
      var wb = XLSX.read(buf, { type: 'array', cellStyles: true, cellDates: true });
      if (!PWH.layout.looksLikeLayout(wb)) throw new Error(t('m2.import.fail'));
      var L = PWH.layout.parse(wb, file.name);
      if (!L.floors.length) throw new Error(t('m2.import.fail'));
      return PWH.db.setMeta('layout', L).then(function () { return PWH.db.setMeta('layoutFile', { name: file.name, buffer: buf }); }).then(function () { return L; });
    }).then(function (L) {
      M.busy = ''; M.layout = L; M.floor = 0; M.sel = null; computeMatch(); render();
      say('ok', t('m2.import.ok', { floors: L.floors.length, racks: L.floors.reduce(function (a, f) { return a + f.racks.length; }, 0) }));
      if (PWH.app && PWH.app.rerunChecks) PWH.app.rerunChecks();
    }).catch(function (e) { M.busy = ''; say('bad', String(e && e.message || e)); });
  }
  function computeMatch() {
    M.match = M.layout ? PWH.layout.match(M.layout, M.mlRows || []) : null;
    if (M.match && !M.mlRows) M.match.stat = null;
  }

  function wireMap() {
    M.canvas = $('#m2cv'); M.ctx = M.canvas.getContext('2d');
    var drag = null, tip = $('#m2tip');
    M.canvas.addEventListener('pointerdown', function (e) { M.canvas.setPointerCapture(e.pointerId); drag = { x: e.clientX, y: e.clientY, ox: M.v.ox, oy: M.v.oy, moved: false }; });
    M.canvas.addEventListener('pointermove', function (e) {
      var rc = M.canvas.getBoundingClientRect(), px = e.clientX - rc.left, py = e.clientY - rc.top;
      if (drag) {
        var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
        if (drag.moved) { M.v.ox = drag.ox + dx; M.v.oy = drag.oy + dy; draw(); tip.hidden = true; return; }
      }
      var id = hitAt(px, py);
      if (id !== M.hover) { M.hover = id; draw(); }
      M.canvas.style.cursor = id ? 'pointer' : 'grab';
      if (id) {
        var r = M.match.rackById.get(id), sl = r ? stockLevels(r).length : 0;
        tip.textContent = id + (r ? ' · ' + t('m2.sel.sub', { floor: r.floor.slice(1), levels: r.levels }) : '');
        tip.style.left = Math.min(px + 14, rc.width - 190) + 'px'; tip.style.top = (py + 14) + 'px'; tip.hidden = false;
      } else tip.hidden = true;
    });
    M.canvas.addEventListener('pointerup', function (e) {
      if (drag && !drag.moved) {
        var rc = M.canvas.getBoundingClientRect(), id = hitAt(e.clientX - rc.left, e.clientY - rc.top);
        M.sel = id; side(!!id); draw();
      }
      drag = null;
    });
    M.canvas.addEventListener('pointerleave', function () { if (M.hover) { M.hover = null; draw(); } tip.hidden = true; });
    M.canvas.addEventListener('wheel', function (e) {
      e.preventDefault();
      var rc = M.canvas.getBoundingClientRect(); zoomAt(e.clientX - rc.left, e.clientY - rc.top, e.deltaY < 0 ? 1.12 : 1 / 1.12);
    }, { passive: false });
    if (g.ResizeObserver) new ResizeObserver(function () { resize(); draw(); }).observe($('#m2wrap'));
    var qi = $('#m2q'), qT = null;
    function runSearch(zoom) {
      M.sel = null; doSearch(qi ? qi.value : ''); side(); draw();
      var lv = $('#m2live'); if (lv) lv.textContent = M.q ? t('m2.res.count', { n: M.results.length }) : '';
      clearTimeout(qT); if (zoom !== false && M.hl && M.hl.size) qT = setTimeout(function () { zoomToRacks(Array.from(M.hl)); }, zoom === 'now' ? 0 : 350);
    }
    M.runSearch = function () { runSearch('now'); }; M.clearSearch = function () { if (qi) qi.value = ''; runSearch(false); fit(); draw(); };
    if (qi) {
      qi.addEventListener('input', function () { runSearch(); });
      qi.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.stopPropagation(); M.clearSearch(); } else if (e.key === 'Enter') runSearch('now'); });
    }
    var grip = M.root.querySelector('[data-fsbox]');
    if (grip) grip.addEventListener('pointerdown', function (e) {
      if (!e.target.hasAttribute('data-m2grip') || !M.fs) return;
      var side0 = $('#m2side'), y0 = e.clientY, h0 = side0.offsetHeight; e.preventDefault();
      function mv(ev) { side0.style.height = Math.max(140, Math.min(window.innerHeight * 0.8, h0 + (y0 - ev.clientY))) + 'px'; }
      function up() { document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up); }
      document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up);
    });
    var colorSel = $('#m2color'); if (colorSel) colorSel.addEventListener('change', function (e) { M.color = e.target.value; var lg = $('#m2legend'); if (lg) lg.innerHTML = legendHtml(); draw(); });
  }
  function applyFs(on, box) {
    box = box || (M.root && M.root.querySelector('[data-fsbox]')); if (!box) return;
    M.fs = on; box.classList.toggle('fs', on); document.documentElement.classList.toggle('pwh-fs', on);
    box.querySelectorAll('[data-m2=fs]').forEach(function (b) { b.textContent = fsLabel(); });
    var sd = box.querySelector('#m2side'); if (sd && !on) sd.style.height = '';
    if (M.onFs) M.onFs(on);
    setTimeout(function () { resize(); fit(); draw(); }, 60);
  }
  function toggleFs(btn) {
    var box = (btn && btn.closest('[data-fsbox]')) || (M.root && M.root.querySelector('[data-fsbox]')); if (!box) return;
    if (!M.fs) {
      M.fsBox = box;
      var req = box.requestFullscreen || box.webkitRequestFullscreen;
      if (req) { try { var pr = req.call(box); if (pr && pr.catch) pr.catch(function () { applyFs(true, box); }); applyFs(true, box); return; } catch (x) {} }
      applyFs(true, box);
    } else {
      if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function () {});
      applyFs(false, box);
    }
  }
  document.addEventListener('fullscreenchange', function () { if (!document.fullscreenElement && M.fs && M.fsBox && M.root && M.root.contains(M.fsBox)) applyFs(false, M.fsBox); });
  M.toggleFs = function () { toggleFs(null); };
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && M.fs && !document.fullscreenElement && M.root && document.body.contains(M.root)) { var a = document.activeElement; if (a && /^(INPUT|SELECT)$/.test(a.tagName) && a.value) return; toggleFs(null); } });
  function zoomAt(mx, my, f) {
    var v = M.v; v.ox = mx - (mx - v.ox) * f; v.oy = my - (my - v.oy) * f; v.z *= f; draw();
  }
  function resize() {
    var w = $('#m2wrap'); if (!w || !M.canvas) return;
    M.dpr = Math.min(2, g.devicePixelRatio || 1);
    M.canvas.width = Math.max(1, Math.round(w.clientWidth * M.dpr)); M.canvas.height = Math.max(1, Math.round(w.clientHeight * M.dpr));
  }

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-m2]'); if (!el || !M.root || !M.root.contains(el)) return;
    var a = el.getAttribute('data-m2'), v = el.getAttribute('data-v');
    if (a === 'floor') { M.floor = +v; M.sel = null; M.rerender(); }
    else if (a === 'mode') { M.mode = v; try { localStorage.setItem(modeKey, v); } catch (x) {} M.rerender(); }
    else if (a === 'zin') zoomAt(M.canvas.clientWidth / 2, M.canvas.clientHeight / 2, 1.25);
    else if (a === 'zout') zoomAt(M.canvas.clientWidth / 2, M.canvas.clientHeight / 2, 0.8);
    else if (a === 'fit') { fit(); draw(); }
    else if (a === 'close') { if (M.sel) M.sel = null; else { var q0 = $('#m2q'); if (q0) q0.value = ''; doSearch(''); } side(); draw(); }
    else if (a === 'back') { var mc = M.root.querySelector('[data-fsbox]'); if (mc) mc.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    else if (a === 'search') M.runSearch();
    else if (a === 'clear') M.clearSearch();
    else if (a === 'fs') toggleFs(el);
    else if (a === 'names') { M.names = !M.names; el.setAttribute('aria-pressed', M.names); draw(); }
    else if (a === 'goto') {
      var x = M.results[+el.getAttribute('data-i')]; if (!x || !x.rack) return;
      M.sel = x.rack; side(); zoomToRacks([x.rack]);
    }
    else if (a === 'remove') {
      if (!M.confirmRemove) { M.confirmRemove = true; render(); setTimeout(function () { if (M.confirmRemove) { M.confirmRemove = false; if (PWH.app.state.module === 2) render(); } }, 4000); return; }
      M.confirmRemove = false;
      PWH.db.setMeta('layout', null).then(function () { return PWH.db.setMeta('layoutFile', null); }).then(function () {
        M.layout = null; M.match = null; M.sel = null; render(); if (PWH.app.rerunChecks) PWH.app.rerunChecks();
      });
    }
  });

  // ---------- mount ----------
  var api = {
    M: M, draw: draw, fit: fit, resize: resize, wireMap: wireMap, zoomAt: zoomAt, pal: pal, seg: seg, P: P, side: side, toggleFs: toggleFs,
    mount: function (root) {
      M.root = root; M.canvas = null; M.fs = false; document.documentElement.classList.remove('pwh-fs');
      root.innerHTML = '<h1>' + esc(t('nav.m2')) + '</h1>';
      Promise.all([PWH.db.getMeta('layout'), PWH.app.activeRows('matloc'), PWH.app.activeRows('bom')]).then(function (res) {
        M.layout = res[0] || null; M.mlRows = res[1] || null;
        M.partNames = new Map(); (res[2] || []).forEach(function (r) { if (r[3] && !M.partNames.has(r[2])) M.partNames.set(r[2], r[3]); });
        if (M.q) doSearch(M.q);
        if (M.layout) {
          if (M.floor >= M.layout.floors.length) M.floor = 0;
          M.match = PWH.layout.match(M.layout, M.mlRows || []);
          if (!M.mlRows) M.match.stat = null;
        }
        render();
      });
    }
  };
  return api;
  }
  PWH.m2 = create('pwh-m2mode');
  PWH.mapKit = create;
})(window);
