/* Module 2: warehouse layout. Import, 2D / 3D view, link to stock locations.
 * Editing (add / move racks, aisles, START / DROP points) is the next piece of this module. */
(function (g) {
  var PWH = g.PWH, t = PWH.t;
  var LEVEL_H = 0.5;                       // metres per rack level in the 3D view
  // The map is a small kit: Module 2 and Module 3 each get their own instance (own view, own state).
  function create(modeKey) {
  var M = {
    layout: null, match: null, mlRows: null, floor: 0, mode: '2d', sel: null, hover: null,
    names: true, q: '', qp: '', qb: '', color: 'zone', fs: false, hl: null, results: [], partNames: new Map(),
    v: { z: 1, ox: 0, oy: 0 }, canvas: null, ctx: null, hits: [], dpr: 1, root: null, confirmRemove: false, busy: ''
  };
  M.rot = 0; M.tilt = 0.6155;   // 3D camera: turn around the floor centre and height angle (drag on the map, or the buttons)
  try { var sm = localStorage.getItem(modeKey); /* the map always opens in 2D (agreed); 3D is one click away */ M.rot = +localStorage.getItem(modeKey + '-rot') || 0; var tl0 = +localStorage.getItem(modeKey + '-tilt'); if (tl0) M.tilt = tl0; } catch (e) {}
  M.overlay = null;
  // floor / 2D-3D changes redraw in place (a rebuilt page would drop the real full screen)
  M.rerender = function () {
    if (!M.canvas || !document.body.contains(M.canvas)) { render(); return; }
    M.root.querySelectorAll('[data-m2=floor]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-v') === String(M.floor)); });
    M.root.querySelectorAll('[data-m2=mode]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-v') === M.mode); });
    var ct = M.root.querySelector('#m2cnt'); if (ct && M.layout) ct.innerHTML = countTag();
    var rc = M.root.querySelector('#m2rot'); if (rc) rc.hidden = M.mode !== '3d';
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
    return { l: { 1: '#6f63b8', 2: '#3f8f8a', 3: '#a07a45', 4: '#5b8f5f' }, rack: '#262040', none: '#1e1a33', aisle: '#1a1630', ground: '#141126', bg: '#0d0b18', outside: '#1a1530',
      grid: 'rgba(170,150,240,0.07)', lane: 'rgba(190,170,255,0.20)',
      stock: '#a48bff', ink: '#eeeafc', sel: '#ff7a45', hit: '#8b6cff', hitLine: '#c9bbff', start: '#22c55e', drop: '#0ea5e9', door: '#d4a72c', lift: '#a78bfa', exit: '#a08c5a',
      line: 'rgba(185,170,245,0.22)', route: '#38bdf8' };
  }
  function rgb(hex) { var h = hex.replace('#', ''); return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; }
  function shade(hex, f, a) { var c = rgb(hex); return 'rgba(' + Math.min(255, Math.round(c[0] * f)) + ',' + Math.min(255, Math.round(c[1] * f)) + ',' + Math.min(255, Math.round(c[2] * f)) + ',' + (a == null ? 1 : a) + ')'; }
  function mix(a, b, k, al) { var p = rgb(a), q = rgb(b); return 'rgba(' + Math.round(p[0] * k + q[0] * (1 - k)) + ',' + Math.round(p[1] * k + q[1] * (1 - k)) + ',' + Math.round(p[2] * k + q[2] * (1 - k)) + ',' + (al == null ? 1 : al) + ')'; }

  // ---------- projection ----------
  // 2D: plan view.  3D: orthographic orbit camera; M.rot = turn around the floor centre, M.tilt = camera height angle.
  var TILT0 = 0.6155, TILT_MIN = 0.2, TILT_MAX = 1.5;
  function P(x, y, z) {
    var v = M.v;
    if (M.mode === '2d') return [x * v.z + v.ox, y * v.z + v.oy];
    if (M.rot) { var q = rot(x, y); x = q[0]; y = q[1]; }
    var st = Math.sin(M.tilt), ct = Math.cos(M.tilt);
    return [((x - y) * 0.7071) * v.z + v.ox, (((x + y) * 0.7071) * st - (z || 0) * ct * 0.866) * v.z + v.oy];
  }
  function rot(x, y) {
    var f = floorObj(), b = f ? f.bbox : [0, 0, 0, 0], cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2, c = Math.cos(M.rot), s2 = Math.sin(M.rot), dx = x - cx, dy = y - cy;
    return [cx + dx * c - dy * s2, cy + dx * s2 + dy * c];
  }
  function rotN(nx, ny) { var c = Math.cos(M.rot), s2 = Math.sin(M.rot); return [nx * c - ny * s2, nx * s2 + ny * c]; }
  function setRot(a) {
    var tau = Math.PI * 2; M.rot = ((a % tau) + tau) % tau; if (Math.abs(M.rot) < 1e-3 || Math.abs(M.rot - tau) < 1e-3) M.rot = 0;
    try { localStorage.setItem(modeKey + '-rot', String(M.rot)); } catch (e) {}
  }
  function setTilt(a) { M.tilt = Math.max(TILT_MIN, Math.min(TILT_MAX, a)); try { localStorage.setItem(modeKey + '-tilt', String(M.tilt)); } catch (e) {} }
  // space the map must leave free: floating toolbar, side panel in full screen, legend, Module 3 dock
  function insets() {
    var o = { l: 0, t: 0, r: 0, b: 0 }; if (!M.root) return o;
    var leg = M.root.querySelector('#m2legend'); if (leg) o.b = leg.offsetHeight + 16;
    var box = M.root.querySelector('[data-fsbox]'), tool = box && box.querySelector('.m2tool');
    if (tool) o.t = tool.offsetTop + tool.offsetHeight + (box.querySelector('#m2cnt') ? 40 : 10);   // toolbar (+ floor tag under it)
    else if (M.fs && box && box.querySelector('.m2bar')) { var b2 = box.querySelector('.m2bar'); o.t = b2.offsetTop + b2.offsetHeight + 8; }
    if (M.fs) { var sd = M.root.querySelector('.m2side:not([hidden])'); if (sd) o.r = sd.offsetWidth + 20; }
    var dk = M.root.querySelector('.m3dock:not([hidden])'); if (dk) o.r = Math.max(o.r, dk.offsetWidth + 20);   // Module 3 list panel (always on the map)
    return o;
  }
  function floorObj() { return M.layout && M.layout.floors[M.floor]; }
  function levelPx() { return LEVEL_H * M.layout.scale; }
  function fitView() {
    var f = floorObj(); if (!f || !M.canvas) return null;
    var cw = M.canvas.clientWidth, ch = M.canvas.clientHeight, b = f.bbox, maxH = f.racks.reduce(function (a, r) { return Math.max(a, r.levels || 1); }, 1) * levelPx();
    var keep = M.v; M.v = { z: 1, ox: 0, oy: 0 };
    var xs = [], ys = [];
    [[b[0], b[1]], [b[2], b[1]], [b[2], b[3]], [b[0], b[3]]].forEach(function (c) {
      [0, M.mode === '3d' ? maxH : 0].forEach(function (z) { var p = P(c[0], c[1], z); xs.push(p[0]); ys.push(p[1]); });
    });
    M.v = keep;
    var minx = Math.min.apply(null, xs), maxx = Math.max.apply(null, xs), miny = Math.min.apply(null, ys), maxy = Math.max.apply(null, ys);
    var o = insets(), aw = cw - o.l - o.r, ah = ch - o.t - o.b;
    var z = Math.min((aw - (M.names ? 90 : 32)) / (maxx - minx), (ah - 56) / (maxy - miny));   // room for the zone signs at row starts
    return { z: z, ox: o.l + (aw - (maxx - minx) * z) / 2 - minx * z, oy: o.t + 6 + (ah - (maxy - miny) * z) / 2 - miny * z };
  }
  function fit() { var v = fitView(); if (v) { M.v = v; M.fitZ = v.z; } }
  // glide the view to a new fit (used when the full-screen side panel opens or closes)
  function glideFit() {
    var to = fitView(); if (!to) return; M.fitZ = to.z;
    var from = { z: M.v.z, ox: M.v.ox, oy: M.v.oy }, t0 = performance.now(), dur = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 320;
    if (!dur) { M.v = to; draw(); return; }
    M.glide = t0;
    (function step(now) {
      if (M.glide !== t0) return;
      var k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      M.v = { z: from.z * Math.pow(to.z / from.z, e), ox: from.ox + (to.ox - from.ox) * e, oy: from.oy + (to.oy - from.oy) * e }; draw();
      if (k < 1) requestAnimationFrame(step);
    })(t0);
  }

  // ---------- drawing ----------
  function poly(pts, fill, stroke, lw) {
    var c = M.ctx; c.beginPath();
    for (var i = 0; i < pts.length; i++) { if (i) c.lineTo(pts[i][0], pts[i][1]); else c.moveTo(pts[i][0], pts[i][1]); }
    c.closePath();
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 1; c.stroke(); }
  }
  function line(a, b, col, lw, dash) { var c = M.ctx; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.strokeStyle = col; c.lineWidth = lw || 1; if (dash) c.setLineDash(dash); c.stroke(); if (dash) c.setLineDash([]); }
  function rectPts(o, z) { return [P(o.x, o.y, z), P(o.x + o.w, o.y, z), P(o.x + o.w, o.y + o.h, z), P(o.x, o.y + o.h, z)]; }
  function rr(x, y, w, h, r) { var c = M.ctx; c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); }
  function label(txt, p, color, bg, size) {
    var c = M.ctx; c.font = '600 ' + size + 'px "Anuphan", "IBM Plex Sans Thai", system-ui, sans-serif';
    var w = c.measureText(txt).width + 12, h = size + 8;
    c.save(); c.shadowColor = 'rgba(0,0,0,0.45)'; c.shadowBlur = 8; c.shadowOffsetY = 2; c.fillStyle = bg; rr(p[0] - w / 2, p[1] - h / 2, w, h, h / 2); c.fill(); c.restore();
    c.fillStyle = color; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(txt, p[0], p[1] + 0.5);
  }
  function occOf(r) { return M.match && M.match.occ.get(r.id); }
  function stockLevels(r) { var o = occOf(r); return o ? Object.keys(o).map(Number).filter(function (l) { return l >= 1 && l <= r.levels; }) : []; }
  // side faces of a box that point at the viewer for the current turn, with their light
  var SIDES = [[0, 1, 0, -1], [1, 2, 1, 0], [2, 3, 0, 1], [3, 0, -1, 0]];
  function faces(o) {
    var c = [[o.x, o.y], [o.x + o.w, o.y], [o.x + o.w, o.y + o.h], [o.x, o.y + o.h]], out = [];
    SIDES.forEach(function (sd) {
      var n = M.rot ? rotN(sd[2], sd[3]) : [sd[2], sd[3]];
      if (n[0] + n[1] > 0.001) out.push({ p: c[sd[0]], q: c[sd[1]], lit: 0.82 + 0.12 * (n[1] - n[0]) });
    });
    return out;
  }
  function wall(fc, z0, z1) { return [P(fc.p[0], fc.p[1], z0), P(fc.q[0], fc.q[1], z0), P(fc.q[0], fc.q[1], z1), P(fc.p[0], fc.p[1], z1)]; }
  // rows: racks with the same zone code (1N, K, 3L ...) in one straight run; each run gets one zone sign at its start
  function rowsOf(f) {
    if (f._rows) return f._rows;
    var by = {}, rows = [];
    f.racks.forEach(function (r) { var k = zoneOf(r.id); (by[k] = by[k] || []).push(r); });
    Object.keys(by).forEach(function (k) {
      var g2 = by[k], xs = g2.map(function (r) { return r.x; }), ys = g2.map(function (r) { return r.y; });
      var horiz = (Math.max.apply(null, xs) - Math.min.apply(null, xs)) >= (Math.max.apply(null, ys) - Math.min.apply(null, ys));
      var A = horiz ? 'x' : 'y', B = horiz ? 'y' : 'x', LA = horiz ? 'w' : 'h', LB = horiz ? 'h' : 'w';
      g2.sort(function (a, b2) { return Math.abs(a[B] - b2[B]) > a[LB] * 0.5 ? a[B] - b2[B] : a[A] - b2[A]; });
      var cur = null;
      g2.forEach(function (r, i) {
        var pr = g2[i - 1], brk = !pr || Math.abs(r[B] - pr[B]) > r[LB] * 0.5 || r[A] - (pr[A] + pr[LA]) > Math.min(r[LA], pr[LA]) * 0.6;
        if (brk) { cur = { zone: k, horiz: horiz, racks: [] }; rows.push(cur); }
        cur.racks.push(r);
      });
    });
    rows.forEach(function (w) {
      var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, lv = 1;
      w.racks.forEach(function (r) { x0 = Math.min(x0, r.x); y0 = Math.min(y0, r.y); x1 = Math.max(x1, r.x + r.w); y1 = Math.max(y1, r.y + r.h); lv = Math.max(lv, r.levels || 1); });
      w.box = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }; w.lv = lv; w.col = zoneColor(w.racks[0].id); w.sign = true;
    });
    // short runs (3 racks or fewer) of one zone that sit close together share a single sign
    var byZ = {}; rows.forEach(function (w) { (byZ[w.zone] = byZ[w.zone] || []).push(w); });
    Object.keys(byZ).forEach(function (k) {
      var list = byZ[k].filter(function (w) { return w.racks.length <= 3; }); if (list.length < 2) return;
      var rk = list[0].racks[0], near = Math.max(rk.w, rk.h) * 3;
      list.sort(function (a, b2) { return (a.box.x + a.box.y) - (b2.box.x + b2.box.y); });
      var keep = [];
      list.forEach(function (w) {
        var close = keep.some(function (q) { return w.box.x < q.box.x + q.box.w + near && w.box.x + w.box.w > q.box.x - near && w.box.y < q.box.y + q.box.h + near && w.box.y + w.box.h > q.box.y - near; });
        if (close) w.sign = false; else keep.push(w);
        if (close) keep.push(w);
      });
    });
    f._rows = rows; return rows;
  }
  function numOf(id) { var m = String(id).match(/-(\d+)$/); return m ? m[1] : String(id); }
  // a zone sign: solid pill in the zone colour with the zone code in dark type
  function zoneSign(txt, p, col, size, lead) {
    var c = M.ctx; c.font = '700 ' + size + 'px "IBM Plex Mono", ui-monospace, monospace';
    var w = Math.max(size * 1.9, c.measureText(txt).width + size * 0.9), h = size + 7, x = p[0] - w / 2, y = p[1] - h / 2;
    if (lead) { line([p[0], p[1] + h / 2], lead, shade(col, 1, 0.8), 1.2); c.beginPath(); c.arc(lead[0], lead[1], 2.2, 0, 7); c.fillStyle = col; c.fill(); }
    c.save(); c.shadowColor = shade(col, 1, 0.55); c.shadowBlur = 10; c.fillStyle = col; rr(x, y, w, h, 5); c.fill(); c.restore();
    c.fillStyle = 'rgba(13,11,24,0.92)'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(txt, p[0], p[1] + 0.5);
    return [x, y, w, h];
  }

  function draw() {
    var c = M.ctx, f = floorObj(); if (!c || !f) return;
    var cw = M.canvas.clientWidth, ch = M.canvas.clientHeight, C = pal();
    c.setTransform(M.dpr, 0, 0, M.dpr, 0, 0);
    var bgG = c.createRadialGradient(cw * 0.5, ch * 0.45, 0, cw * 0.5, ch * 0.45, Math.max(cw, ch) * 0.75);
    bgG.addColorStop(0, '#0b1a30'); bgG.addColorStop(1, C.bg); c.fillStyle = bgG; c.fillRect(0, 0, cw, ch);
    M.hits = [];
    var d3 = M.mode === '3d', lp = levelPx(), z = M.v.z, sc = M.layout.scale || 30;
    var b = f.bbox, pad = 14, plate = { x: b[0] - pad, y: b[1] - pad, w: b[2] - b[0] + 2 * pad, h: b[3] - b[1] + 2 * pad };
    // floor plate with a 2 m grid
    if (d3) { var sh = rectPts({ x: plate.x + 10, y: plate.y + 10, w: plate.w, h: plate.h }, -18); poly(sh, 'rgba(0,0,0,0.35)'); }
    poly(rectPts(plate, 0), C.ground, 'rgba(120,165,225,0.28)', 1);
    var gs = sc * 2; if (gs * z >= 7) {
      for (var gx = Math.ceil(plate.x / gs) * gs; gx <= plate.x + plate.w; gx += gs) line(P(gx, plate.y, 0), P(gx, plate.y + plate.h, 0), C.grid, 1);
      for (var gy = Math.ceil(plate.y / gs) * gs; gy <= plate.y + plate.h; gy += gs) line(P(plate.x, gy, 0), P(plate.x + plate.w, gy, 0), C.grid, 1);
    }
    f.outside.forEach(function (o) { poly(rectPts(o, 0), C.outside); });
    // aisles: darker lanes with a dashed centre line (forklift lanes)
    f.aisles.forEach(function (o) {
      poly(rectPts(o, 0), C.aisle);
      if (Math.min(o.w, o.h) * z >= 10) {
        var a1 = o.w >= o.h ? [o.x + 4, o.y + o.h / 2] : [o.x + o.w / 2, o.y + 4], a2 = o.w >= o.h ? [o.x + o.w - 4, o.y + o.h / 2] : [o.x + o.w / 2, o.y + o.h - 4];
        line(P(a1[0], a1[1], 0), P(a2[0], a2[1], 0), C.lane, 1, [6, 6]);
      }
    });
    // markers lie flat on the floor with a soft glow
    f.markers.forEach(function (m) {
      var col = C[m.type] || C.door;
      c.save(); c.shadowColor = col; c.shadowBlur = 14; poly(rectPts(m, 0), shade(col, 1, 0.85), shade(col, 1.25, 0.9), 1); c.restore();
    });
    var rows = rowsOf(f), allNums = M.fitZ && z >= M.fitZ * 2.2;
    // racks
    var racks = f.racks.slice();
    if (d3) racks.sort(function (a, b2) { var p = rot(a.x + a.w / 2, a.y + a.h / 2), q = rot(b2.x + b2.w / 2, b2.y + b2.h / 2); return (p[0] + p[1]) - (q[0] + q[1]); });
    if (d3) racks.forEach(function (r) { poly(rectPts({ x: r.x - 1, y: r.y - 1, w: r.w + 2, h: r.h + 2 }, 0), 'rgba(0,0,0,0.38)'); });   // contact shadows
    // a clicked rack stands out: every other rack turns grey and fades back
    var selHere = M.sel && f.racks.some(function (r) { return r.id === M.sel; });
    var fset = selHere && !M.noDim ? new Set([M.sel]) : (M.focus && M.focus.size ? M.focus : null), focus = !!fset, GREY = '#56647a';
    racks.forEach(function (r) {
      var dim = focus && !fset.has(r.id);
      if (dim) { c.save(); c.globalAlpha = d3 ? 0.3 : 0.38; }
      var zc = dim ? GREY : zoneColor(r.id), sl = stockLevels(r), H = r.levels * lp, has = sl.length > 0, stc = dim ? GREY : C.stock;
      // a host page (e.g. the Module 4 heatmap) may colour each rack itself
      var own = M.rackTint ? M.rackTint(r) : null;
      var tint = dim ? GREY : own || (M.color === 'levels' ? (C.l[r.levels] || C.l[1]) : M.color === 'stock' ? (has ? C.stock : '#33455f') : zc);
      var k = own ? 0.82 : M.color === 'stock' ? (has ? 0.55 : 0.12) : M.color === 'levels' ? 0.6 : 0.16;
      var hit = { id: r.id, polys: [] };
      if (!d3) {
        var gap = Math.min(1.2 / z, Math.min(r.w, r.h) * 0.08), rp = rectPts({ x: r.x + gap, y: r.y + gap, w: r.w - 2 * gap, h: r.h - 2 * gap }, 0);
        var tl = rp[0], br = rp[2], rad = Math.min(3, (br[0] - tl[0]) * 0.2, (br[1] - tl[1]) * 0.2);
        var gr = c.createLinearGradient(0, tl[1], 0, br[1]); gr.addColorStop(0, mix(tint, '#1a2a43', k + 0.08)); gr.addColorStop(1, mix(tint, '#122036', k));
        c.fillStyle = gr; rr(tl[0], tl[1], br[0] - tl[0], br[1] - tl[1], Math.max(0, rad)); c.fill();
        c.strokeStyle = shade(tint, 1, M.color === 'zone' ? 0.42 : 0.55); c.lineWidth = 1; c.stroke();
        if (M.color === 'zone' && !own) {   // bright zone edge along the long side
          var sw = Math.max(1.5, 2.5 / z), sx = r.w >= r.h ? { x: r.x + gap, y: r.y + gap, w: r.w - 2 * gap, h: Math.min(r.h * 0.22, sw) } : { x: r.x + gap, y: r.y + gap, w: Math.min(r.w * 0.22, sw), h: r.h - 2 * gap };
          poly(rectPts(sx, 0), zc);
        }
        if (has && M.color !== 'stock' && !own) {   // stock pips: one dot per level that holds stock
          var cx2 = (tl[0] + br[0]) / 2, cy2 = br[1] - Math.min(6, (br[1] - tl[1]) * 0.28), dr = Math.min(2.2, (br[1] - tl[1]) * 0.12);
          if (dr >= 1) sl.forEach(function (l, i) { c.beginPath(); c.arc(cx2 + (i - (sl.length - 1) / 2) * dr * 3, cy2, dr, 0, 7); c.fillStyle = 'rgba(160,205,255,0.85)'; c.fill(); });
        }
        hit.polys.push(rp);
        if (M.names && allNums && !M.noNums) {
          var fs = Math.min(12, (br[0] - tl[0]) * 0.45, (br[1] - tl[1]) * 0.5);
          if (fs >= 7) { c.font = '500 ' + fs.toFixed(1) + 'px "IBM Plex Mono", monospace'; c.fillStyle = 'rgba(232,238,247,0.72)'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(numOf(r.id), (tl[0] + br[0]) / 2, (tl[1] + br[1]) / 2); }
        }
      } else {
        // glass rack: tinted glass walls, bright zone-coloured edges, stock as solid blocks inside
        var gh = rgbHex(mix(tint, '#1b2c47', k + 0.22)), ga = M.color === 'stock' && !has ? 0.28 : 0.42, glass = shade(gh, 1.05, ga);
        sl.forEach(function (l) {
          var inx = r.w * 0.16, iny = r.h * 0.16, cb = { x: r.x + inx, y: r.y + iny, w: r.w - 2 * inx, h: r.h - 2 * iny }, z0 = (l - 1) * lp + lp * 0.06, z1 = z0 + lp * 0.74;
          faces(cb).forEach(function (fc) { poly(wall(fc, z0, z1), shade(stc, fc.lit * 0.9, 0.95)); });
          poly(rectPts(cb, z1), shade(stc, 1.18, 0.98));
        });
        var top = rectPts(r, H), edge = shade(M.color === 'zone' ? zc : tint, 1.1, 0.75);
        faces(r).forEach(function (fc) {
          var wp = wall(fc, 0, H); poly(wp, shade(gh, fc.lit, ga), null); hit.polys.push(wp);
          for (var kk = 1; kk < r.levels; kk++) line(P(fc.p[0], fc.p[1], kk * lp), P(fc.q[0], fc.q[1], kk * lp), 'rgba(170,200,240,0.28)', 0.8);
          line(P(fc.p[0], fc.p[1], 0), P(fc.p[0], fc.p[1], H), edge, 1); line(P(fc.q[0], fc.q[1], 0), P(fc.q[0], fc.q[1], H), edge, 1);
        });
        poly(top, glass, edge, 1.2);
        hit.polys.unshift(top);
      }
      M.hits.push(hit);
      if (dim) c.restore();
    });
    // zone signs: one per row run, at its start (left / top end), floating above the racks in 3D
    if (M.names) {
      var placed = []; if (focus) { c.save(); c.globalAlpha = 0.35; }
      rows.forEach(function (w) {
        if (!w.sign) return;
        var bx = w.box, size = Math.max(10, Math.min(14, (w.horiz ? bx.h : bx.w) * z * 0.7));
        var anchor = w.horiz ? [bx.x, bx.y + bx.h / 2] : [bx.x + bx.w / 2, bx.y], p;
        if (d3) { var a3 = P(anchor[0], anchor[1], w.lv * lp); p = [a3[0], a3[1] - 16]; var lead = a3; }
        else { var a2 = P(anchor[0], anchor[1], 0); p = w.horiz ? [a2[0] - size * 1.3, a2[1]] : [a2[0], a2[1] - size * 0.95]; }
        var est = [p[0] - size, p[1] - size * 0.6, size * 2, size * 1.2];
        if (placed.some(function (q) { return est[0] < q[0] + q[2] && est[0] + est[2] > q[0] && est[1] < q[1] + q[3] && est[1] + est[3] > q[1]; })) { if (w.horiz) p = [p[0] - size * 2.2, p[1]]; }
        placed.push(zoneSign(w.zone, p, w.col, size, d3 ? lead : null));
      });
      if (focus) c.restore();
    }
    // racks found by the search
    if (M.hl && M.hl.size) {
      f.racks.forEach(function (r) {
        if (!M.hl.has(r.id)) return;
        var H3 = d3 ? r.levels * lp : 0;
        c.save(); if (focus && !fset.has(r.id)) c.globalAlpha = 0.45; c.shadowColor = C.hit; c.shadowBlur = 14; poly(rectPts(r, H3), 'rgba(47,134,255,0.85)', C.hitLine, 2); c.restore();
        if (r.id === M.sel) return;
        var tq = P(r.x + r.w / 2, r.y + r.h / 2, H3), fq = Math.max(9, Math.min(13, r.w * z / (String(r.id).length * 0.62))); c.font = '600 ' + fq + 'px "IBM Plex Mono", monospace'; c.fillStyle = '#ffffff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(r.id, tq[0], tq[1]);
      });
    }
    // marker labels on top
    f.markers.forEach(function (m) {
      var col = C[m.type] || C.door, mid = P(m.x + m.w / 2, m.y + m.h / 2, d3 ? 26 : 0);
      label(t('m2.mk.' + m.type), mid, '#ffffff', shade(col, 0.9), 11);
    });
    // selection / hover outlines
    [[M.hover, 1.5], [M.sel, 3]].forEach(function (pair) {
      if (!pair[0] || (pair[0] === M.sel && pair[1] === 1.5)) return;
      var r = M.match ? M.match.rackById.get(pair[0]) : null;
      if (!r) { r = f.racks.filter(function (x) { return x.id === pair[0]; })[0]; }
      if (!r || r.floor !== f.id) return;
      var H2 = d3 ? r.levels * lp : 0;
      if (pair[0] === M.sel && pair[1] === 3) {
        if (d3) faces(r).forEach(function (fc) { poly(wall(fc, 0, H2), 'rgba(242,183,5,0.22)', C.sel, 1.5); });
        c.save(); c.shadowColor = C.sel; c.shadowBlur = 16; poly(rectPts(r, H2), 'rgba(242,183,5,0.35)', C.sel, 2.5); c.restore();
        var ts = P(r.x + r.w / 2, r.y + r.h / 2, H2);
        label(r.id, [ts[0], ts[1] - (d3 ? 18 : 0) - 14], '#0d0b18', C.sel, 12);
      }
      else poly(rectPts(r, H2), null, 'rgba(255,255,255,0.75)', pair[1]);
    });
    if (M.overlay) M.overlay(c, P, f, { d3: d3, lp: lp, z: z, pal: C });
    var cmp = M.root && M.root.querySelector('#m2cmp'); if (cmp) cmp.style.transform = 'rotate(' + (-M.rot * 180 / Math.PI + 45) + 'deg)';
  }
  function rgbHex(rgba) { var m = rgba.match(/\d+/g); return '#' + [m[0], m[1], m[2]].map(function (n) { return (+n < 16 ? '0' : '') + (+n).toString(16); }).join(''); }

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
  function partCard(mat, plant, right, extra) {
    var nm = M.partNames.get(mat);
    return '<li class="m2pc"><div class="m2pc1"><span class="code m2pcode">' + esc(mat) + '</span><button class="m2cp" data-m2="copy" data-v="' + esc(mat) + '" aria-label="' + esc(t('m2.copy')) + '" title="' + esc(t('m2.copy')) + '"><svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" fill="none" stroke="currentColor" stroke-width="2"/></svg></button>' + (right || '') + '</div>' +
      (nm ? '<div class="m2pc2">' + esc(nm) + '</div>' : '') + '<div class="m2pc3">' + (plant ? '<span>Plant ' + esc(plant) + '</span>' : '') + (extra || '') + '</div></li>';
  }
  function dHead(cap, title, sub, chips, closeBtn) {
    return '<div class="m2dh"><div class="m2dt"><h2 class="m2tt">' + esc(title) + '</h2><p class="m2st">' + esc(sub) + '</p></div>' +
      '<div class="m2dr">' + (chips || '') + (closeBtn ? '<button class="btn sm m2back" data-m2="back">' + esc(t('m2.back')) + '</button>' : '') + '</div>' + (closeBtn ? '<button class="btn sm m2x" data-m2="close">' + esc(t('m2.sel.close')) + '</button>' : '') + '</div>';
  }
  function levelOf(bin) { var bi = PWH.layout.binInfo(bin); return bi ? bi.level : '–'; }
  function rackPanel(id) {
    var r = M.match ? M.match.rackById.get(id) : null;
    if (!r) M.layout.floors.forEach(function (f) { f.racks.forEach(function (x) { if (x.id === id) r = x; }); });
    if (!r) return summary();
    var occ = occOf(r) || {}, used = 0, parts = new Set(), n = 0, emptyLv = [], rows = '', cards = '';
    for (var l = r.levels; l >= 1; l--) {
      var bins = occ[l] || [];
      if (!bins.length) { emptyLv.push(binName(r, l)); continue; }
      used++;
      bins.forEach(function (b) {
        cards += '<li class="m2lvh"><span class="loc">' + esc(b.bin) + '</span><span>' + esc(t('m2.sel.level', { n: l })) + ' · ' + esc(t('m2.sel.parts', { n: b.items.length })) + '</span></li>';
        b.items.forEach(function (it) { cards += partCard(it.mat, it.plant, '<span class="m2pq"><b>' + nf(it.stock) + '</b><small>' + esc(t('c.stock')) + '</small></span>'); });
        b.items.forEach(function (it) {
          parts.add(it.mat); n++;
          rows += '<tr><td class="num m2no">' + n + '</td><td>' + partCell(it.mat, it.plant) + '</td><td><span class="loc">' + esc(b.bin) + '</span></td><td class="m2lv">' + esc(String(l)) + '</td><td class="m2pl">' + plantTxt(it.plant) + '</td><td class="num">' + nf(it.stock) + '</td></tr>';
        });
      });
    }
    var chips = '<span class="chip info">' + esc(t('m2.sel.parts', { n: parts.size })) + '</span>';
    var html = dHead(t('m2.sel.caption'), t('m2.sel.title2', { id: r.id }), t('m2.sel.sub', { floor: r.floor.slice(1), levels: r.levels }) + (M.fs ? '' : ' • ' + t('m2.sel.note')), chips + '<span class="chip ' + (emptyLv.length ? 'ok' : 'warn') + '">' + esc(t('m2.sel.free', { n: emptyLv.length, t: r.levels })) + '</span>', true);
    html += '<div class="m2dbody">';
    if (n && M.fs) html += '<ul class="m2cards">' + cards + '</ul>';
    else if (n) {
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
    // Parts of the BOM that match but are not in Material-Location: say so instead of "nothing found"
    var found = new Set(M.results.map(function (x) { return x.mat; })); M.noBin = [];
    if (M.partNames && q.length >= 3) M.partNames.forEach(function (nm, code) { if (M.noBin.length < 20 && !found.has(code) && String(code).toUpperCase().indexOf(q) >= 0) M.noBin.push(code); });
  }
  // move + zoom the view so these racks fill the map; switches floor when none is on the current one
  function zoomToRacks(ids) {
    if (!ids || !ids.length || !M.layout || !M.match) return;
    var racks = ids.map(function (id) { return M.match.rackById.get(id); }).filter(Boolean); if (!racks.length) return;
    var fids = M.layout.floors.map(function (f) { return f.id; }), cur = fids[M.floor];
    var here = racks.filter(function (r) { return r.floor === cur; });
    if (!here.length) { var fi = fids.indexOf(racks[0].floor); if (fi >= 0) { M.floor = fi; M.rerender(); } here = racks.filter(function (r) { return r.floor === fids[M.floor]; }); }
    if (!M.canvas || !here.length) return;
    M.glide = 0; fit(); var fz = M.v.z;
    M.v = { z: 1, ox: 0, oy: 0 };
    var xs = [], ys = [], lp = levelPx();
    here.forEach(function (r) { [[r.x, r.y], [r.x + r.w, r.y], [r.x + r.w, r.y + r.h], [r.x, r.y + r.h]].forEach(function (c0) { [0, M.mode === '3d' ? r.levels * lp : 0].forEach(function (h) { var p = P(c0[0], c0[1], h); xs.push(p[0]); ys.push(p[1]); }); }); });
    var minx = Math.min.apply(null, xs), maxx = Math.max.apply(null, xs), miny = Math.min.apply(null, ys), maxy = Math.max.apply(null, ys);
    // centre in the part of the map that is on screen and not under the toolbar / side panel / legend
    var o = insets(), rc = M.canvas.getBoundingClientRect(), full = M.canvas.clientHeight - o.b;
    var vTop = M.fs ? o.t : Math.max(o.t, -rc.top), vBot = M.fs ? full : Math.min(full, window.innerHeight - rc.top);
    if (vBot - vTop < 160) { vTop = o.t; vBot = full; }
    var cw = M.canvas.clientWidth - o.r, ch = vBot - vTop, w = Math.max(maxx - minx, 1), h = Math.max(maxy - miny, 1);
    var z = Math.min((cw * 0.5) / w, (ch * 0.5) / h, fz * (here.length > 1 ? 5 : 3.5)); z = Math.max(z, fz);
    M.v = { z: z, ox: cw / 2 - (minx + w / 2) * z, oy: vTop + ch / 2 - (miny + h / 2) * z };
    draw();
  }
  function searchPanel() {
    var R = M.results, MAX = 150;
    var html = dHead(t('m2.res.caption'), t('m2.res.head') + ' “' + M.q + '”', R.length ? t('m2.res.sub', { r: M.hl.size }) : t('m2.res.none'), '<span class="chip info">' + esc(t('m2.res.count', { n: R.length })) + '</span>', true);
    var nb = (M.noBin || []).length ? '<div class="m2nobin"><b>' + esc(t('m2.nobin.title', { n: M.noBin.length })) + '</b><ul>' + M.noBin.map(function (c) { return '<li>' + partCell(c) + '<span class="chip warn">' + esc(t('m4.loc.noloc')) + '</span></li>'; }).join('') + '</ul></div>' : '';
    if (!R.length) return html + nb;
    if (M.fs) {
      html += '<div class="m2dbody"><ul class="m2cards">' + R.slice(0, MAX).map(function (x, i) {
        var right = x.mat ? '<b class="m2pq">' + nf(x.stock) + '</b>' : '';
        var extra = '<span class="loc">' + esc(x.bin) + '</span>' + (x.floor ? '<span>' + esc(t('m2.floor', { n: x.floor.slice(1) })) + '</span>' : '');
        return x.mat ? partCard(x.mat, x.plant, right, extra).replace('<li class="m2pc"', '<li class="m2pc m2go' + (x.rack ? '' : ' m2off') + '" data-m2="goto" data-i="' + i + '" tabindex="0"')
          : '<li class="m2pc m2go" data-m2="goto" data-i="' + i + '"><div class="m2pc3">' + extra + '<span class="m2none">' + esc(t('m2.sel.free_bin')) + '</span></div></li>';
      }).join('') + '</ul>' + (R.length > MAX ? '<p class="sub" style="margin:8px 0 0">' + esc(t('m2.res.more', { n: MAX, t: R.length })) + '</p>' : '') + '</div>';
      return html + nb;
    }
    html += '<div class="m2dbody"><table class="m2tbl m2det search"><thead><tr><th class="num">' + esc(t('m2.col.no')) + '</th><th>' + esc(t('m2.col.part')) + '</th><th>' + esc(t('m2.col.bin')) + '</th><th>' + esc(t('m2.col.floor')) + '</th><th class="num">' + esc(t('m2.col.qty')) + '</th></tr></thead><tbody>';
    R.slice(0, MAX).forEach(function (x, i) {
      html += '<tr class="m2go' + (x.rack ? '' : ' m2off') + '" data-m2="goto" data-i="' + i + '"><td class="num m2no">' + (i + 1) + '</td><td>' + (x.mat ? partCell(x.mat) : '<span class="m2none">' + esc(t('m2.sel.free_bin')) + '</span>') + '</td><td><span class="loc">' + esc(x.bin) + '</span>' + (x.rack ? '' : '<div class="sub2">' + esc(t(PWH.layout.binInfo(x.bin) ? 'm4.loc.notonlayout' : 'm4.loc.special')) + '</div>') + '</td><td class="m2lv">' + (x.floor ? esc(x.floor.slice(1)) : '–') + '</td><td class="num">' + (x.mat ? nf(x.stock) : '') + '</td></tr>';
    });
    html += '</tbody></table>';
    if (R.length > MAX) html += '<p class="sub" style="margin:8px 0 0">' + esc(t('m2.res.more', { n: MAX, t: R.length })) + '</p>';
    return html + nb + '</div>';
  }
  function side(scroll) {
    var el = $('#m2side'); if (!el) return;
    var show = !!(M.sel || M.q), was = !el.hidden;
    el.hidden = !show;
    if (M.fs && was !== show) setTimeout(glideFit, 0);   // full screen: the map slides left of the panel (or back) and shows the whole floor
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
  function countTag() {
    var L = M.layout, f = L.floors[M.floor], n = 0; L.floors.forEach(function (x) { n += x.racks.length; });
    return '<b>' + esc(t('m2.cnt.here', { f: f.id.slice(1), n: nf(f.racks.length) })) + '</b>' + (L.floors.length > 1 ? '<span>' + esc(t('m2.cnt.all', { n: nf(n) })) + '</span>' : '');
  }
  function rotCtl() {
    var needle = '<svg id="m2cmp" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-opacity=".35"/><path d="M12 3l3 9h-6z" fill="#f2b705"/><path d="M12 21l-3-9h6z" fill="currentColor" fill-opacity=".55"/></svg>';
    return '<div class="m2rot" id="m2rot"' + (M.mode === '3d' ? '' : ' hidden') + ' title="' + esc(t('m2.rot.tip')) + '">' +
      '<button class="btn ic" data-m2="rot" data-v="-1" aria-label="' + esc(t('m2.rot.l')) + '" title="' + esc(t('m2.rot.l')) + '">⟲</button>' +
      '<button class="btn ic m2cmpb" data-m2="rot" data-v="0" aria-label="' + esc(t('m2.rot.reset')) + '" title="' + esc(t('m2.rot.reset')) + '">' + needle + '</button>' +
      '<button class="btn ic" data-m2="rot" data-v="1" aria-label="' + esc(t('m2.rot.r')) + '" title="' + esc(t('m2.rot.r')) + '">⟳</button>' +
      '<span class="m2rsep"></span><button class="btn ic" data-m2="tilt" data-v="1" aria-label="' + esc(t('m2.tilt.up')) + '" title="' + esc(t('m2.tilt.up')) + '">⤒</button><button class="btn ic" data-m2="tilt" data-v="-1" aria-label="' + esc(t('m2.tilt.down')) + '" title="' + esc(t('m2.tilt.down')) + '">⤓</button></div>';
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
    var opt = function (v) { return '<option value="' + v + '"' + (M.color === v ? ' selected' : '') + '>' + esc(t('m2.color.opt', { v: t('m2.color.' + v) })) + '</option>'; };
    var bar = '<div class="m2tool"><div class="m2qwrap"><input id="m2q" class="m2q1" type="search" autocomplete="off" placeholder="' + esc(t('m2.q.ph2')) + '" title="' + esc(t('m2.q.ph')) + '" value="' + esc(M.q) + '" aria-label="' + esc(t('m2.q.ph')) + '"></div>' +
      seg(floors, String(M.floor), 'floor') + seg([['2d', t('m2.view.2d')], ['3d', t('m2.view.3d')]], M.mode, 'mode') +
      '<button class="btn" data-m2="names" aria-pressed="' + M.names + '" title="' + esc(t('m2.names.tip')) + '">' + esc(t('m2.names')) + '</button>' +
      '<select id="m2color" aria-label="' + esc(t('m2.color')) + '">' + opt('zone') + opt('levels') + opt('stock') + '</select>' +
      '<span class="grow"></span><div class="m2zoom"><button class="btn ic" data-m2="zout" aria-label="' + esc(t('m2.zout')) + '" title="' + esc(t('m2.zout')) + '">−</button><button class="btn ic" data-m2="zin" aria-label="' + esc(t('m2.zin')) + '" title="' + esc(t('m2.zin')) + '">+</button><button class="btn" data-m2="fit">' + esc(t('m2.fit')) + '</button></div><button class="btn primary" data-m2="fs">' + esc(fsLabel()) + '</button></div>';
    return '<section class="panel m2mapcard' + (M.fs ? ' fs' : '') + '" data-fsbox>' + bar +
      '<div class="m2canvas" id="m2wrap"><canvas id="m2cv" tabindex="0" aria-label="Warehouse map"></canvas><div id="m2tip" class="m2tip" hidden></div><div class="m2cntag" id="m2cnt">' + countTag() + '</div>' + rotCtl() + '<div class="m2legend" id="m2legend">' + legendHtml() + '</div></div>' +
      '<div class="m2side" id="m2side" hidden></div><span class="sr-only" id="m2live" role="status" aria-live="polite"></span></section>';
  }

  function render() {
    var root = M.root;
    if (!M.layout) {
      root.innerHTML = '<div class="ph"><div class="ph-l"><div class="cap">' + esc(t('mod.cap', { n: 2 })) + '</div><h1>' + esc(t('nav.m2')) + '</h1><p class="lede">' + esc(t('m2.intro')) + '</p></div></div>' + importPanel();
      wireImport(); return;
    }
    root.innerHTML = '<div class="ph m2ph"><div class="ph-l"><div class="cap">' + esc(t('mod.cap', { n: 2 })) + '</div><h1>' + esc(t('nav.m2')) + '</h1></div><div class="ph-r m2phr">' + adminMenu() + '</div></div>' +
      mapPanel() + warnBar();
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
    M.canvas.addEventListener('pointerdown', function (e) { M.canvas.setPointerCapture(e.pointerId); drag = { x: e.clientX, y: e.clientY, ox: M.v.ox, oy: M.v.oy, moved: false, turn: M.mode === '3d' && e.button === 0 && !e.shiftKey, r0: M.rot, t0: M.tilt }; M.glide = 0; });
    M.canvas.addEventListener('contextmenu', function (e) { if (M.mode === '3d') e.preventDefault(); });
    M.canvas.addEventListener('pointermove', function (e) {
      var rc = M.canvas.getBoundingClientRect(), px = e.clientX - rc.left, py = e.clientY - rc.top;
      if (drag) {
        var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
        if (drag.moved && drag.turn) { orbit(drag.r0 + dx * 0.006, drag.t0 + dy * 0.005); M.canvas.style.cursor = 'grabbing'; tip.hidden = true; return; }
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
        M.sel = id; if (M.onSelect) M.onSelect(id); else side(!!id); draw();
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
    if (sd && !sd.hidden) side();
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
  // turn the 3D view about the floor centre, keeping that centre where it is on screen
  function orbit(a, tl) {
    var f = floorObj(); if (!f) return; var b = f.bbox, cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2, p0 = P(cx, cy, 0);
    setRot(a); if (tl != null) setTilt(tl); var p1 = P(cx, cy, 0); M.v.ox += p0[0] - p1[0]; M.v.oy += p0[1] - p1[1]; draw();
  }
  function turnTo(a) { orbit(a, null); }
  function animTurn(to) {
    var from = M.rot, t0 = performance.now(), dur = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 260;
    if (!dur) { turnTo(to); return; }
    (function step(now) { var k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3); turnTo(from + (to - from) * e); if (k < 1) requestAnimationFrame(step); })(t0);
  }
  function selectText(node) { try { var rg = document.createRange(); rg.selectNodeContents(node); var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(rg); } catch (x) {} }
  function zoomAt(mx, my, f) {
    M.glide = 0;
    var v = M.v; v.ox = mx - (mx - v.ox) * f; v.oy = my - (my - v.oy) * f; v.z *= f; draw();
  }
  function resize() {
    var w = $('#m2wrap'); if (!w || !M.canvas) return;
    M.dpr = Math.min(2, g.devicePixelRatio || 1);
    M.canvas.width = Math.max(1, Math.round(w.clientWidth * M.dpr)); M.canvas.height = Math.max(1, Math.round(w.clientHeight * M.dpr));
    // full screen: things that float on the map start below the floating toolbar
    var box = M.root && M.root.querySelector('[data-fsbox]'), tool = box && box.querySelector('.m2tool, .m2bar');
    if (box) box.style.setProperty('--fs-top', tool ? (tool.offsetTop + tool.offsetHeight + 8) + 'px' : '');
  }

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-m2]'); if (!el || !M.root || !M.root.contains(el)) return;
    var a = el.getAttribute('data-m2'), v = el.getAttribute('data-v');
    if (a === 'floor') { M.floor = +v; M.sel = null; M.rerender(); }
    else if (a === 'mode') { M.mode = v; try { localStorage.setItem(modeKey, v); } catch (x) {} M.rerender(); }
    else if (a === 'zin') zoomAt(M.canvas.clientWidth / 2, M.canvas.clientHeight / 2, 1.25);
    else if (a === 'zout') zoomAt(M.canvas.clientWidth / 2, M.canvas.clientHeight / 2, 0.8);
    else if (a === 'fit') { fit(); draw(); }
    else if (a === 'rot') { if (v === '0') { setRot(0); setTilt(TILT0); glideFit(); } else animTurn(M.rot + (+v) * Math.PI / 4); }
    else if (a === 'tilt') orbit(M.rot, M.tilt + (+v) * 0.2);
    else if (a === 'close') { if (M.sel) M.sel = null; else { var q0 = $('#m2q'); if (q0) q0.value = ''; doSearch(''); } side(); draw(); }
    else if (a === 'back') { var mc = M.root.querySelector('[data-fsbox]'); if (mc) mc.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    else if (a === 'search') M.runSearch();
    else if (a === 'copy') {
      e.stopPropagation(); var txt = v;
      var done = function () { el.classList.add('ok'); setTimeout(function () { el.classList.remove('ok'); }, 1200); var lv = $('#m2live'); if (lv) lv.textContent = t('m2.copied', { v: txt }); };
      try { navigator.clipboard.writeText(txt).then(done, function () { selectText(el.parentNode.querySelector('.m2pcode')); }); } catch (x) { selectText(el.parentNode.querySelector('.m2pcode')); }
    }
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
    M: M, draw: draw, fit: fit, glideFit: glideFit, zoomToRacks: zoomToRacks, rotCtl: rotCtl, insets: insets, resize: resize, wireMap: wireMap, zoomAt: zoomAt, pal: pal, seg: seg, P: P, side: side, toggleFs: toggleFs,
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
