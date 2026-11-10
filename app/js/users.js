/* PWH sign-in screens (first-run setup, sign in) and the admin page for users and roles. */
(function (g) {
  var PWH = g.PWH, t = PWH.t;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(s, r) { return (r || document).querySelector(s); }
  function p2(n) { return (n < 10 ? '0' : '') + n; }
  function fmtDT(ms) { if (!ms) return '–'; var d = new Date(ms); return p2(d.getDate()) + '/' + p2(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + p2(d.getHours()) + ':' + p2(d.getMinutes()); }
  function errText(e) { var c = (e && e.code) || 'fail'; return t('au.err.' + c, { n: e && e.left, s: e && e.wait }); }
  var reduce = false; try { reduce = g.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  /* ---------- logo: a rack with two bins in a violet disc (rail, sign-in) ---------- */
  function logo(size, cls) {
    return '<svg class="' + (cls || 'plogo') + '" width="' + size + '" height="' + size + '" viewBox="0 0 40 40" aria-hidden="true">' +
      '<circle cx="20" cy="20" r="20" fill="#6d4aff"/>' +
      '<rect x="11" y="10" width="2.6" height="20" rx="1.3" fill="#fff"/><rect x="26.4" y="10" width="2.6" height="20" rx="1.3" fill="#fff"/>' +
      '<rect x="11" y="17.6" width="18" height="2.4" rx="1.2" fill="#fff"/><rect x="11" y="25.4" width="18" height="2.4" rx="1.2" fill="#fff"/>' +
      '<rect x="15" y="12" width="6.4" height="5.6" rx="1.2" fill="#ffb08a"/><rect x="18.6" y="20" width="6.4" height="5.4" rx="1.2" fill="#7dd3fc"/>' +
      '</svg>';
  }

  /* ---------- the sign-in picture: an isometric part-picking scene, drawn from boxes ----------
   * a pallet rack with cartons and blue part bins, a picker pushing a cart, and the pick route on the floor:
   * each digit of the code lights the next stop, the fourth one reaches the bin marked on the shelf */
  var S0 = 30, OX = 0, OY = 0, BB = null, WX = 0, WY = 0;   // WX/WY: world offset while drawing a rack placed elsewhere
  function P(x, y, z) { x += WX; y += WY; var p = [(x - y) * 0.866 * S0 + OX, (x + y) * 0.5 * S0 - z * S0 + OY]; if (BB) { BB[0] = Math.min(BB[0], p[0]); BB[1] = Math.min(BB[1], p[1]); BB[2] = Math.max(BB[2], p[0]); BB[3] = Math.max(BB[3], p[1]); } return p; }
  function poly(pts, fill, extra) { return '<polygon points="' + pts.map(function (q) { var p = P(q[0], q[1], q[2]); return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ') + '" fill="' + fill + '"' + (extra || '') + '/>'; }
  function box(x, y, z, w, d, h, c) {   // c = [top, front(+y), side(+x)]
    return poly([[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]], c[0]) +
      poly([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]], c[1]) +
      poly([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]], c[2]);
  }
  var C = {
    post: ['#ffffff', '#e4defc', '#c9bdf8'], beam: ['#ffb08a', '#ff7a45', '#e5602d'], deck: ['#f3f0ff', '#d8cffd', '#c3b5f7'],
    carton: ['#f4cf9c', '#dfa86c', '#c98f55'], bin: ['#9ee0fd', '#38bdf8', '#0b94d1'], binIn: '#0b6f9e',
    cart: ['#4b3f8f', '#2e2566', '#221b4d'], wheel: ['#3a3170', '#17123a', '#100c2b'], pants: ['#3b3478', '#2a2360', '#1f1a4c'],
    vest: ['#ffe27a', '#ffcf33', '#e9b300'], shirt: ['#ffffff', '#ebe7fb', '#d6cff5'], skin: '#f2c6a2', cap: '#ff7a45'
  };
  function carton(x, y, z, w, d, h) {
    var lab = poly([[x + w * 0.55, y + d, z + h * 0.35], [x + w * 0.88, y + d, z + h * 0.35], [x + w * 0.88, y + d, z + h * 0.7], [x + w * 0.55, y + d, z + h * 0.7]], '#fff8ec');
    var tape = poly([[x, y + d * 0.44, z + h], [x + w, y + d * 0.44, z + h], [x + w, y + d * 0.56, z + h], [x, y + d * 0.56, z + h]], '#e7b97f');
    return box(x, y, z, w, d, h, C.carton) + tape + lab;
  }
  function bin(x, y, z, w, d, h) {   // open part bin: the inside shows on top
    var r = 0.09;
    return box(x, y, z, w, d, h, C.bin) + poly([[x + r, y + r, z + h], [x + w - r, y + r, z + h], [x + w - r, y + d - r, z + h], [x + r, y + d - r, z + h]], C.binIn) +
      poly([[x + w * 0.18, y + d, z + h * 0.3], [x + w * 0.6, y + d, z + h * 0.3], [x + w * 0.6, y + d, z + h * 0.62], [x + w * 0.18, y + d, z + h * 0.62]], '#e8f7ff');
  }
  var seed = 11; function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
  function randStock() {   // the same mix of cartons and bins, shuffled, for the racks further back
    return [0, 1, 2].map(function () {
      return [0, 1].map(function () {
        var out = [], x = 0.25;
        while (x < 2.9) {
          var c = rnd() < 0.45, w = c ? 1.15 + rnd() * 0.3 : 0.8 + rnd() * 0.15;
          if (x + w > 3.25) break;
          out.push(c ? ['c', x, w, 1.25, 0.85 + rnd() * 0.2] : ['b', x, w, 1.2, 0.55]); x += w + 0.12;
        }
        return out;
      });
    });
  }
  function rack(ox, oy, stockIn) {
    var o = '', L = [0.18, 1.55, 2.92], W = 7, D = 1.7, T = 0.16, H = 4.25, bays = [0, 3.5];
    var back = [[0, 0], [3.5 - T / 2, 0], [W - T, 0]], front = [[0, D - T], [3.5 - T / 2, D - T], [W - T, D - T]];
    ox = ox || 0; oy = oy || 0;
    WX = ox; WY = oy;
    back.forEach(function (p) { o += box(p[0], p[1], 0, T, T, H, C.post); });
    var stock = stockIn || [   // per level, per bay: [kind, x offset, width, depth, height]
      [[['c', 0.25, 1.4, 1.3, 1.0], ['c', 1.8, 1.35, 1.3, 1.0]], [['b', 0.3, 0.95, 1.2, 0.55], ['b', 1.35, 0.95, 1.2, 0.55], ['b', 2.4, 0.8, 1.2, 0.55]]],
      [[['b', 0.3, 0.95, 1.2, 0.55, 'pick'], ['b', 1.35, 0.95, 1.2, 0.55], ['c', 2.4, 0.85, 1.2, 0.9]], [['c', 0.3, 1.3, 1.3, 1.0], ['b', 1.8, 0.95, 1.2, 0.55]]],
      [[['c', 0.3, 1.2, 1.2, 0.85], ['c', 1.6, 1.5, 1.3, 1.05]], [['b', 0.3, 0.95, 1.2, 0.55], ['c', 1.45, 1.2, 1.2, 0.85], ['b', 2.75, 0.55, 1.1, 0.5]]]
    ];
    L.forEach(function (z, li) {
      o += box(0, 0, z - 0.06, W, D, 0.06, C.deck);
      o += box(0, 0, z - 0.2, W, T, 0.18, C.beam);
      bays.forEach(function (bx, bi) {
        stock[li][bi].forEach(function (s) {
          var x = bx + s[1], y = 0.22 + (1.3 - s[3]) / 2;
          if (s[0] === 'c') o += carton(x, y, z, s[2], s[3], s[4]); else o += bin(x, y, z, s[2], s[3], s[4]);
          if (s[5] === 'pick') PICK = [x + ox + s[2] / 2, y + oy + s[3], z + s[4]];
        });
      });
      o += box(0, D - T, z - 0.2, W, T, 0.18, C.beam);
    });
    o += box(0, 0, H - 0.02, W, D, 0.04, ['rgba(255,255,255,0.0)', 'rgba(255,255,255,0)', 'rgba(255,255,255,0)']);
    front.forEach(function (p) { o += box(p[0], p[1], 0, T, T, H, C.post); });
    WX = 0; WY = 0;
    return o;
  }
  function pallet(x, y, z, s, n) {
    if (n == null) { n = z; z = 0; s = 1; }
    var o = box(x, y, z, 1.5 * s, 1.3 * s, 0.16 * s, ['#e8c48e', '#c99b5e', '#b5874c']);
    for (var i = 0; i < n; i++) o += carton(x + 0.08 * s, y + 0.08 * s, z + (0.16 + i * 0.62) * s, 1.34 * s, 1.14 * s, 0.6 * s);
    return o;
  }
  function lane(x0, x1, y) { return poly([[x0, y - 0.05, 0], [x1, y - 0.05, 0], [x1, y + 0.05, 0], [x0, y + 0.05, 0]], 'rgba(255,210,63,0.85)'); }
  function floorText(txt, x, y, size) {
    var p = P(x, y, 0), m = [0.866 * S0 * size, 0.5 * S0 * size, -0.866 * S0 * size, 0.5 * S0 * size].map(function (v) { return v.toFixed(3); });
    return '<text transform="matrix(' + m.join(' ') + ' ' + p[0].toFixed(1) + ' ' + p[1].toFixed(1) + ')" font-size="1" class="gfloor-t">' + txt + '</text>';
  }
  /* the wider warehouse around the picking aisle: two more rack rows behind, a second rack on each row, DROP strip with pallets */
  function warehouse() {
    var o = '';
    o += rack(0, -11.2, randStock()) + rack(7.6, -11.2, randStock());
    o += rack(0, -5.6, randStock()) + rack(7.6, -5.6, randStock());
    return o;
  }
  var PICK = [5.8, 1.5, 2.1];
  /* people: hi-vis vest for everyone, scaled up so they read as the subject of the picture */
  var VEST = ['#e8ff6a', '#ccf227', '#a9cc12'], STRIPE = '#f4f7ff';
  function axisBox(cx, cy, z, d, n, lenD, lenN, h, c) {   // box centred on (cx, cy), lengths along the facing (d) and across (n)
    var w = Math.abs(d[0]) * lenD + Math.abs(n[0]) * lenN, dd = Math.abs(d[1]) * lenD + Math.abs(n[1]) * lenN;
    return { k: cx + cy + z * 0.02, s: box(cx - w / 2, cy - dd / 2, z, w, dd, h, c) };
  }
  function glow(x, y, r) { var c = P(x, y, 0); return '<ellipse class="gglow" cx="' + c[0].toFixed(1) + '" cy="' + c[1].toFixed(1) + '" rx="' + (r * 0.866 * S0 * 1.25).toFixed(1) + '" ry="' + (r * 0.5 * S0 * 1.25).toFixed(1) + '"/>'; }
  // pose: 'push' (hands forward on a handle), 'carry' (box held in front), 'stand'
  function person(x, y, dir, pose, s, carry) {
    var d = { '-x': [-1, 0], '+x': [1, 0], '-y': [0, -1], '+y': [0, 1] }[dir], n = [-d[1], d[0]], parts = [];
    function at(a, b) { return [x + (d[0] * a + n[0] * b) * s, y + (d[1] * a + n[1] * b) * s]; }
    function add(a, b, z, lenD, lenN, h, c) { var p = at(a, b); parts.push(axisBox(p[0], p[1], z * s, d, n, lenD * s, lenN * s, h * s, c)); }
    add(0, -0.15, 0, 0.24, 0.22, 0.95, C.pants); add(0.04, 0.15, 0, 0.24, 0.22, 0.95, C.pants);
    add(0, 0, 0.95, 0.46, 0.62, 0.82, VEST);
    if (pose === 'push') { add(0.32, -0.34, 1.5, 0.6, 0.15, 0.15, C.shirt); add(0.32, 0.34, 1.5, 0.6, 0.15, 0.15, C.shirt); }
    else if (pose === 'reach') {   // one arm up into the shelf holding a bin, the other at the side
      add(0.28, -0.34, 1.62, 0.5, 0.15, 0.15, C.shirt); add(0.5, -0.34, 1.62, 0.15, 0.15, 0.62, C.shirt);
      add(0, 0.4, 1.05, 0.16, 0.15, 0.7, C.shirt);
    }
    else if (pose === 'carry') { add(0.3, -0.36, 1.35, 0.5, 0.15, 0.15, C.shirt); add(0.3, 0.36, 1.35, 0.5, 0.15, 0.15, C.shirt); }
    else { add(0, -0.4, 1.05, 0.16, 0.15, 0.7, C.shirt); add(0, 0.4, 1.05, 0.16, 0.15, 0.7, C.shirt); }
    parts.sort(function (a, b) { return a.k - b.k; });
    var o = parts.map(function (q) { return q.s; }).join('');
    // reflective stripes across the vest, on the faces the viewer sees
    var bx = at(0, 0), w = (Math.abs(d[0]) * 0.46 + Math.abs(n[0]) * 0.62) * s, dd = (Math.abs(d[1]) * 0.46 + Math.abs(n[1]) * 0.62) * s, x0 = bx[0] - w / 2, y0 = bx[1] - dd / 2;
    [1.18, 1.46].forEach(function (zz) {
      var z0 = zz * s, z1 = (zz + 0.08) * s;
      o += poly([[x0, y0 + dd, z0], [x0 + w, y0 + dd, z0], [x0 + w, y0 + dd, z1], [x0, y0 + dd, z1]], STRIPE) + poly([[x0 + w, y0, z0], [x0 + w, y0 + dd, z0], [x0 + w, y0 + dd, z1], [x0 + w, y0, z1]], '#dfe3f5');
    });
    if (carry === 'binLow') { var bl = at(0.62, 0); o += bin(bl[0] - 0.3 * s, bl[1] - 0.27 * s, 1.25 * s, 0.6 * s, 0.54 * s, 0.34 * s); }
    else if (carry === 'bin') { var bp = at(0.55, -0.34); o += bin(bp[0] - 0.28 * s, bp[1] - 0.25 * s, 2.2 * s, 0.56 * s, 0.5 * s, 0.32 * s); }
    else if (carry) { var cp = at(0.62, 0); o += carton(cp[0] - 0.35 * s, cp[1] - 0.32 * s, 1.15 * s, 0.7 * s, 0.64 * s, 0.5 * s); }
    var h = P(x, y, 2.12 * s), r = 0.3 * S0 * s, v = P(x + d[0], y + d[1], 2.12 * s), side = v[0] >= h[0] ? 1 : -1;
    o += '<circle cx="' + h[0].toFixed(1) + '" cy="' + h[1].toFixed(1) + '" r="' + r.toFixed(1) + '" fill="' + C.skin + '"/>';
    o += '<path d="M' + (h[0] - r * 1.05).toFixed(1) + ' ' + (h[1] - 0.5).toFixed(1) + ' a' + (r * 1.05).toFixed(1) + ' ' + (r * 1.05).toFixed(1) + ' 0 0 1 ' + (2.1 * r).toFixed(1) + ' 0 z" fill="' + C.cap + '"/>' +
      '<rect x="' + (side > 0 ? h[0] + r * 0.2 : h[0] - r * 1.5).toFixed(1) + '" y="' + (h[1] - 2.4).toFixed(1) + '" width="' + (r * 1.3).toFixed(1) + '" height="3.6" rx="1.8" fill="#e5602d"/>';
    return o;
  }
  function cart(x, y, s) {   // cart pointing -x, handle at its +x end
    var o = '', w = 2.2 * s, d = 1.1 * s;
    [[x + 0.1 * s, y + 0.1 * s], [x + w - 0.3 * s, y + 0.1 * s], [x + 0.1 * s, y + d - 0.3 * s], [x + w - 0.3 * s, y + d - 0.3 * s]].forEach(function (p) { o += box(p[0], p[1], 0, 0.2 * s, 0.2 * s, 0.22 * s, C.wheel); });
    o += box(x, y, 0.22 * s, w, d, 0.1 * s, C.cart);
    o += box(x + w - 0.12 * s, y + 0.1 * s, 0.32 * s, 0.1 * s, 0.1 * s, 1.55 * s, C.cart) + box(x + w - 0.12 * s, y + d - 0.2 * s, 0.32 * s, 0.1 * s, 0.1 * s, 1.55 * s, C.cart);
    o += box(x, y + 0.1 * s, 0.32 * s, 0.1 * s, 0.1 * s, 0.9 * s, C.cart) + box(x, y + d - 0.2 * s, 0.32 * s, 0.1 * s, 0.1 * s, 0.9 * s, C.cart);
    o += box(x, y, 1.0 * s, w, d, 0.07 * s, C.cart);
    o += bin(x + 0.15 * s, y + 0.12 * s, 1.07 * s, 0.95 * s, 0.9 * s, 0.5 * s) + carton(x + 1.15 * s, y + 0.15 * s, 1.07 * s, 0.8 * s, 0.85 * s, 0.62 * s);
    o += bin(x + 0.2 * s, y + 0.15 * s, 0.32 * s, 0.9 * s, 0.85 * s, 0.45 * s);
    o += box(x + w - 0.12 * s, y + 0.05 * s, 1.82 * s, 0.1 * s, d - 0.1 * s, 0.1 * s, C.cart);
    return o;
  }
  var FK = { body: ['#ffd84d', '#f5b800', '#d99c00'], dark: ['#3a3170', '#241d52', '#1a1540'] };
  function forklift(x, y, s) {   // facing -x, forks out front, driver seated
    var o = '';
    o += box(x + 0.15 * s, y + 0.05 * s, 0, 0.35 * s, 0.28 * s, 0.35 * s, C.wheel) + box(x + 1.45 * s, y + 0.05 * s, 0, 0.4 * s, 0.28 * s, 0.4 * s, C.wheel);
    o += box(x - 1.1 * s, y + 0.22 * s, 0.05 * s, 1.1 * s, 0.13 * s, 0.07 * s, FK.dark) + box(x - 1.1 * s, y + 0.95 * s, 0.05 * s, 1.1 * s, 0.13 * s, 0.07 * s, FK.dark);
    o += pallet(x - 1.15 * s, y + 0.1 * s, 0, s * 0.85, 1);
    o += box(x - 0.08 * s, y + 0.1 * s, 0, 0.12 * s, 1.1 * s, 2.9 * s, FK.dark);
    o += box(x + 0.1 * s, y, 0.28 * s, 1.85 * s, 1.3 * s, 0.8 * s, FK.body) + box(x + 1.35 * s, y + 0.05 * s, 1.08 * s, 0.6 * s, 1.2 * s, 0.55 * s, FK.body);
    o += box(x + 0.75 * s, y + 0.35 * s, 1.08 * s, 0.45 * s, 0.6 * s, 0.3 * s, FK.dark);
    o += person(x + 0.95 * s, y + 0.65 * s, '-x', 'push', s * 0.82).replace(/<rect[^>]*?>/, '');
    o += box(x + 0.15 * s, y + 0.05 * s, 1.08 * s, 0.08 * s, 0.08 * s, 2.3 * s, FK.dark) + box(x + 0.15 * s, y + 1.17 * s, 1.08 * s, 0.08 * s, 0.08 * s, 2.3 * s, FK.dark) +
      box(x + 1.55 * s, y + 0.05 * s, 1.6 * s, 0.08 * s, 0.08 * s, 1.78 * s, FK.dark) + box(x + 1.55 * s, y + 1.17 * s, 1.6 * s, 0.08 * s, 0.08 * s, 1.78 * s, FK.dark);
    o += box(x + 0.15 * s, y + 0.05 * s, 3.36 * s, 1.5 * s, 1.2 * s, 0.07 * s, ['rgba(58,49,112,0.55)', 'rgba(36,29,82,0.7)', 'rgba(26,21,64,0.7)']);
    return o;
  }
  /* ---------- the moving picture: three people at work, looping on their own (not tied to typing) ----------
   * 1 pushes a cart along the pick route: 3 stops in the 1K aisle, round the row end, 1 stop in the 2K aisle, unloads at DROP, comes back
   * 2 stands at the 3K rack and moves part bins from the shelf into the cart beside them
   * 3 stands at DROP and moves cartons from the cart onto the pallet
   * Everything is drawn once; the loop only moves and shows / hides groups. */
  var DIRS = { '-x': [-1, 0], '+x': [1, 0], '-y': [0, -1], '+y': [0, 1] };
  var SC1 = 1.45;   // people scale
  function cartD(px, py, dir, s, kinds) {   // cart beside / ahead of a person at (px, py) on side `dir`; kinds: load items 'b' | 'c'
    var d = DIRS[dir], n = [-d[1], d[0]], cx = px + d[0] * 1.35 * s, cy = py + d[1] * 1.35 * s, parts = [];
    function add(a, b, z, lenD, lenN, h, c, fn, wrap) {
      var x = cx + (d[0] * a + n[0] * b) * s, y = cy + (d[1] * a + n[1] * b) * s, w = (Math.abs(d[0]) * lenD + Math.abs(n[0]) * lenN) * s, dd = (Math.abs(d[1]) * lenD + Math.abs(n[1]) * lenN) * s;
      var str = (fn || box)(x - w / 2, y - dd / 2, z * s, w, dd, h * s, c);
      parts.push({ k: x + y + z * 0.02, s: wrap ? wrap(str) : str });
    }
    [[-0.85, -0.4], [-0.85, 0.4], [0.85, -0.4], [0.85, 0.4]].forEach(function (q) { add(q[0], q[1], 0, 0.2, 0.16, 0.22, C.wheel); });
    add(0, 0, 0.22, 2.0, 1.0, 0.08, C.cart);
    [[0.95, -0.45], [0.95, 0.45]].forEach(function (q) { add(q[0], q[1], 0.3, 0.08, 0.08, 0.72, C.cart); });
    add(0, 0, 1.0, 2.0, 1.0, 0.06, C.cart);
    [[-0.95, -0.45], [-0.95, 0.45]].forEach(function (q) { add(q[0], q[1], 0.3, 0.08, 0.08, 1.55, C.cart); });
    add(-0.95, 0, 1.8, 0.1, 1.0, 0.1, C.cart);
    var slots = [[0.45, 0, 1.06], [-0.4, 0, 1.06], [0.45, 0, 0.3], [-0.4, 0, 0.3]];
    (kinds || []).forEach(function (k, i) {
      var q = slots[i]; if (!q) return;
      add(q[0], q[1], q[2], 0.8, 0.82, k === 'b' ? 0.42 : 0.55, k === 'b' ? C.bin : C.carton, k === 'b' ? bin : carton, function (str) { return '<g class="gld" data-i="' + i + '">' + str + '</g>'; });
    });
    parts.sort(function (a, b) { return a.k - b.k; });
    return { k: cx + cy, s: parts.map(function (q) { return q.s; }).join(''), top: [cx, cy, 1.15 * s] };
  }
  function legsWrap(str) {   // tag the two leg boxes so the loop can swing them
    var i = 0; return str.replace(/<polygon[^>]*fill="(#3b3478|#2a2360|#1f1a4c)"[^>]*\/>(?:<polygon[^>]*fill="(?:#3b3478|#2a2360|#1f1a4c)"[^>]*\/>){2}/g, function (m) { i++; return '<g class="glg glg' + (i % 2 ? 'a' : 'b') + '">' + m + '</g>'; });
  }
  function figure(dir, pose, carry, cartSide, kinds, cartS) {   // person + cart at the world origin, depth-sorted together
    var c = cartD(0, 0, cartSide, cartS || 1, kinds), p = legsWrap(person(0, 0, dir, pose, SC1, carry));
    return glow(0, 0, 1.15) + (c.k < 0 ? c.s + p : p + c.s);
  }
  // ---- worker 1: route, stops, timeline ----
  var W1 = [
    { p: [9.2, 2.6] }, { p: [5.6, 2.6], stop: 0 }, { p: [3.6, 2.6], stop: 1 }, { p: [1.5, 2.6], stop: 2 },
    { p: [-0.9, 2.6] }, { p: [-0.9, -1.95] }, { p: [6.3, -1.95], stop: 3 }, { p: [11.6, -1.95] }, { p: [11.6, 0.9], drop: true }, { p: [11.6, 2.6] }, { p: [9.2, 2.6] }
  ];
  var STOPS = [W1[1].p, W1[2].p, W1[3].p, W1[6].p];
  var SHELF = [[5.6, 1.7, 1.75], [3.6, 1.7, 1.75], [1.5, 1.7, 1.75], [6.3, -3.9, 1.75]];
  var CODES = ['1K-03-02', '1K-02-02', '1K-01-02', '2K-03-02'];
  var V1 = 2.6, PICK_T = 1.3, DROP_T = 2.2, LOAD = ['b', 'c', 'b', 'b'];
  var TL = (function () {   // [{t0, t1, kind, a, b, dir, stop}]
    var out = [], t = 0, dir = '-x';
    for (var i = 0; i < W1.length - 1; i++) {
      var a = W1[i].p, b = W1[i + 1].p, dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
      dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? '+x' : '-x') : (dy > 0 ? '+y' : '-y');
      out.push({ t0: t, t1: t + len / V1, kind: 'move', a: a, b: b, dir: dir, seg: i }); t += len / V1;
      if (W1[i + 1].stop != null) { out.push({ t0: t, t1: t + PICK_T, kind: 'pick', a: b, dir: dir, stop: W1[i + 1].stop }); t += PICK_T; }
      if (W1[i + 1].drop) { out.push({ t0: t, t1: t + DROP_T, kind: 'drop', a: b, dir: dir }); t += DROP_T; }
    }
    out.T = t; return out;
  })();
  function route() {
    var o = '';
    for (var i = 0; i < 6; i++) {   // drawn as the cart passes: start -> stop 4
      var a = P(W1[i].p[0], W1[i].p[1], 0), b = P(W1[i + 1].p[0], W1[i + 1].p[1], 0);
      o += '<line class="gl" data-seg="' + i + '" x1="' + a[0].toFixed(1) + '" y1="' + a[1].toFixed(1) + '" x2="' + b[0].toFixed(1) + '" y2="' + b[1].toFixed(1) + '" pathLength="100"/>';
    }
    STOPS.forEach(function (s, i) {
      var c = P(s[0], s[1], 0);
      o += '<g class="gs" data-stop="' + i + '"><ellipse cx="' + c[0].toFixed(1) + '" cy="' + c[1].toFixed(1) + '" rx="13" ry="7.5"/><text x="' + c[0].toFixed(1) + '" y="' + (c[1] + 3.6).toFixed(1) + '" text-anchor="middle">' + (i + 1) + '</text></g>';
    });
    return o;
  }
  function worker1() {   // one group per pose, shown one at a time
    var v = { 'w-x': figure('-x', 'push', null, '-x', LOAD), 'w+x': figure('+x', 'push', null, '+x', LOAD), 'w-y': figure('-y', 'push', null, '-y', LOAD), 'w+y': figure('+y', 'push', null, '+y', LOAD),
      'p-x': figure('-y', 'reach', null, '-x', LOAD), 'p+x': figure('-y', 'reach', null, '+x', LOAD) };
    return '<g id="gw1">' + Object.keys(v).map(function (k) { return '<g class="gvar" data-v="' + k + '"' + (k === 'w-x' ? '' : ' style="display:none"') + '>' + v[k] + '</g>'; }).join('') + '</g>';
  }
  function worker2() {   // 3K rack, cart on the +x side
    var k = ['b', 'b', 'b'];
    return '<g id="gw2" transform="translate(' + P(10.4, -8.55, 0).map(function (v) { return v.toFixed(1); }).join(',') + ')">' +
      '<g class="gvar" data-v="reach">' + figure('-y', 'reach', 'bin', '+x', k, 1.0) + '</g>' +
      '<g class="gvar" data-v="carry" style="display:none">' + figure('+x', 'carry', 'binLow', '+x', k, 1.0) + '</g>' +
      '<g class="gvar" data-v="stand" style="display:none">' + figure('+x', 'stand', null, '+x', k, 1.0) + '</g></g>';
  }
  function worker3() {   // DROP: cart on the -x side, pallet on the +x side
    var k = ['c', 'c', 'c', 'c'];
    return '<g id="gw3" transform="translate(' + P(14.6, -3.4, 0).map(function (v) { return v.toFixed(1); }).join(',') + ')">' +
      '<g class="gvar" data-v="take">' + figure('-x', 'stand', null, '-x', k, 1.0) + '</g>' +
      '<g class="gvar" data-v="carry" style="display:none">' + figure('+x', 'carry', true, '-x', k, 1.0) + '</g>' +
      '<g class="gvar" data-v="stand" style="display:none">' + figure('+x', 'stand', null, '-x', k, 1.0) + '</g></g>';
  }
  function dropPallet() {   // the pallet worker 3 stacks onto; layers shown by the loop
    var x = 15.3, y = -4.6, o = box(x, y, 0, 1.5, 1.3, 0.16, ['#e8c48e', '#c99b5e', '#b5874c']);
    for (var i = 0; i < 3; i++) o += '<g class="gst" data-i="' + i + '"' + (i ? ' style="display:none"' : '') + '>' + carton(x + 0.08, y + 0.08, 0.16 + i * 0.62, 1.34, 1.14, 0.6) + '</g>';
    return o;
  }
  function flyBin() { return '<g id="gfly" style="display:none">' + bin(-0.3, -0.26, 0, 0.6, 0.52, 0.34) + '</g>'; }
  function tagGroup() {
    return '<g id="gtagg" class="gtagg"><g class="gpin-mark"><circle class="gpulse" cx="0" cy="0" r="9"/><circle cx="0" cy="0" r="5.5" fill="#fff" stroke="#ff7a45" stroke-width="3"/></g>' +
      '<g class="gtag"><line x1="0" y1="-6" x2="28" y2="-18" stroke="#fff" stroke-width="1.5" stroke-dasharray="3 3"/>' +
      '<rect x="18" y="-58" width="128" height="42" rx="12" fill="#fff"/>' +
      '<text x="32" y="-41" class="gtag-k">' + esc(t('au.art.next')) + '</text><text x="32" y="-24" class="gtag-v" id="gtagv">' + CODES[0] + '</text></g></g>';
  }
  function scene() {
    BB = [1e9, 1e9, -1e9, -1e9];
    seed = 11;
    var floor = poly([[-3.8, -12.2, 0], [17.8, -12.2, 0], [17.8, 5.3, 0], [-3.8, 5.3, 0]], 'rgba(28,10,96,0.20)') +
      poly([[15.3, -11.6, 0], [16.7, -11.6, 0], [16.7, 4.6, 0], [15.3, 4.6, 0]], 'rgba(56,189,248,0.35)') +
      lane(-3.3, 14.9, 1.95) + lane(-3.3, 14.9, 3.85) + lane(-3.3, 14.9, -3.65) + lane(-3.3, 14.9, -0.25) + lane(-0.9, 14.9, -9.25) + lane(-0.9, 14.9, -5.85) +
      floorText('DROP', 16.35, -5.5, 0.9) + floorText('1K', -3.2, 3.35, 0.75) + floorText('2K', 8.4, -1.0, 0.75) + floorText('3K', 7.9, -7.1, 0.75);
    var back2 = rack(0, -11.2, randStock()) + rack(7.6, -11.2, randStock()), back1 = rack(0, -5.6, randStock()), rk = rack();
    var drop = pallet(15.3, -10.4, 2) + pallet(15.3, -7.6, 1) + glow(14.6, -3.2, 1.0) + dropPallet() + pallet(13.6, 0.6, 2);
    var vb = [BB[0] - 6, BB[1] - 64, BB[2] - BB[0] + 12, BB[3] - BB[1] + 70].map(function (v) { return v.toFixed(0); }).join(' ');
    BB = null;   // the movable groups are drawn at the origin and must not widen the picture
    var w1 = worker1(), w2 = glow(10.4, -8.3, 1.0) + worker2(), w3 = worker3();
    return '<svg class="gscene" viewBox="' + vb + '" preserveAspectRatio="xMidYMax meet" role="img" aria-label="' + esc(t('au.art')) + '">' +
      '<g class="gpl gpl-0">' + floor + '</g><g class="gpl gpl-1">' + back2 + '</g><g class="gpl gpl-2">' + w2 + '</g><g class="gpl gpl-1">' + back1 + drop + w3 + '</g>' +
      '<g class="gpl gpl-0">' + route() + '</g><g class="gpl gpl-2" id="gslotM"></g><g class="gpl gpl-1">' + rk + '</g><g class="gpl gpl-2" id="gslotF">' + w1 + '</g>' +
      '<g class="gpl gpl-3">' + flyBin() + tagGroup() + '</g></svg>';
  }

  /* ---------- the loop ---------- */
  var RUN = 0;
  function scr(x, y, z) { return P(x, y, z || 0); }
  function setVar(g, key) { if (g.__v === key) return; g.__v = key; g.querySelectorAll(':scope > .gvar').forEach(function (e) { e.style.display = e.getAttribute('data-v') === key ? '' : 'none'; }); }
  function showN(root, sel, n) { root.querySelectorAll(sel).forEach(function (e) { var on = +e.getAttribute('data-i') < n; if (e.__on !== on) { e.__on = on; e.style.display = on ? '' : 'none'; } }); }
  function frame(root, t) {
    var T = TL.T, u = t % T, st = null;
    for (var i = 0; i < TL.length; i++) if (u >= TL[i].t0 && u < TL[i].t1) { st = TL[i]; break; }
    if (!st) st = TL[TL.length - 1];
    var k = (u - st.t0) / (st.t1 - st.t0), w1 = root.querySelector('#gw1'), pos, loadN = 0, lit = 0, nextStop = 0;
    // how far along: stops passed, cart load
    TL.forEach(function (s) { if (s.kind === 'pick' && (s.t1 <= u || s === st)) { lit = Math.max(lit, s.stop + 1); } });
    if (st.kind === 'pick') lit = st.stop + (k > 0.55 ? 1 : 0);
    var afterDrop = TL.some(function (s) { return s.kind === 'drop' && s.t1 <= u; });
    if (afterDrop) lit = 0;
    loadN = lit;
    if (st.kind === 'drop') loadN = Math.max(0, 4 - Math.floor(k * 5));
    nextStop = lit % 4;
    if (st.kind === 'move') {
      pos = [st.a[0] + (st.b[0] - st.a[0]) * k, st.a[1] + (st.b[1] - st.a[1]) * k];
      setVar(w1, 'w' + st.dir);
    } else {
      pos = st.a; setVar(w1, st.kind === 'pick' ? 'p' + (st.dir === '+x' ? '+x' : '-x') : 'w' + st.dir);
    }
    var walking = st.kind === 'move', ph = u * 2 * Math.PI * 1.9, sp = scr(pos[0], pos[1]);
    var bob = walking ? -Math.abs(Math.sin(ph)) * 1.6 : 0;
    w1.setAttribute('transform', 'translate(' + sp[0].toFixed(1) + ',' + (sp[1] + bob).toFixed(1) + ')');
    var d = DIRS[st.dir], sw = walking ? Math.sin(ph) * 0.13 * SC1 : 0, lx = (d[0] - d[1]) * 0.866 * S0 * sw, ly = (d[0] + d[1]) * 0.5 * S0 * sw;
    w1.querySelectorAll('.glga').forEach(function (g) { g.setAttribute('transform', 'translate(' + lx.toFixed(1) + ',' + ly.toFixed(1) + ')'); });
    w1.querySelectorAll('.glgb').forEach(function (g) { g.setAttribute('transform', 'translate(' + (-lx).toFixed(1) + ',' + (-ly).toFixed(1) + ')'); });
    // in front of or behind the 1K rack
    var slot = root.querySelector(pos[1] >= 1.9 ? '#gslotF' : '#gslotM'); if (w1.parentNode !== slot) slot.appendChild(w1);
    showN(w1, '.gld', loadN);
    // route drawn behind the cart, stops lit
    root.querySelectorAll('.gl').forEach(function (l) {
      var sg = +l.getAttribute('data-seg'), off = 100;
      if (!afterDrop) { var m = TL.filter(function (s) { return s.kind === 'move' && s.seg === sg; })[0]; if (m) off = u >= m.t1 ? 0 : u <= m.t0 ? 100 : 100 * (1 - (u - m.t0) / (m.t1 - m.t0)); }
      if (st.kind === 'drop' || afterDrop) off = 0;
      if (afterDrop && st.kind !== 'drop') off = 100;
      l.style.strokeDashoffset = off.toFixed(1);
    });
    root.querySelectorAll('.gs').forEach(function (g, i) { var on = st.kind === 'drop' ? true : i < lit; if (g.__on !== on) { g.__on = on; g.classList.toggle('on', on); } });
    // the bin flying from the shelf to the cart
    var fly = root.querySelector('#gfly');
    if (st.kind === 'pick' && k > 0.15 && k < 0.6) {
      var f = (k - 0.15) / 0.45, a = SHELF[st.stop], dd = DIRS[st.dir], top = [pos[0] + dd[0] * 1.35, pos[1] + dd[1] * 1.35, 1.2];
      var p0 = scr(a[0], a[1], a[2]), p1 = scr(top[0], top[1], top[2]), x = p0[0] + (p1[0] - p0[0]) * f, y = p0[1] + (p1[1] - p0[1]) * f - Math.sin(Math.PI * f) * 26;
      fly.style.display = ''; fly.setAttribute('transform', 'translate(' + x.toFixed(1) + ',' + y.toFixed(1) + ')');
    } else fly.style.display = 'none';
    // the next-pick tag sits on the next stop's bin
    var tg = root.querySelector('#gtagg'); if (tg.__s !== nextStop) {
      tg.__s = nextStop; var sh = SHELF[nextStop], q = scr(sh[0], sh[1], sh[2]);
      tg.style.transform = 'translate(' + q[0].toFixed(1) + 'px,' + q[1].toFixed(1) + 'px)';
      var tv = root.querySelector('#gtagv'); if (tv) tv.textContent = CODES[nextStop];
    }
    // worker 2: reach, carry to the cart, stand; the cart fills to 3 then starts again
    var w2 = root.querySelector('#gw2'), c2 = 4.4, u2 = t % c2, n2 = Math.floor(t / c2) % 4;
    setVar(w2, u2 < 1.4 ? 'reach' : u2 < 2.4 ? 'carry' : 'stand');
    showN(w2, '.gld', u2 < 2.4 ? n2 % 4 : (n2 + 1) % 4);
    // worker 3: take a carton from the cart, carry it, set it on the pallet
    var w3 = root.querySelector('#gw3'), c3 = 5, u3 = (t + 1.7) % c3, n3 = Math.floor((t + 1.7) / c3) % 3;
    setVar(w3, u3 < 1.4 ? 'take' : u3 < 3.4 ? 'carry' : 'stand');
    showN(root, '.gst', (u3 < 3.4 ? n3 : n3 + 1) || 1);
    showN(w3, '.gld', 4 - ((u3 < 1.4 ? n3 : n3 + 1) % 4));
  }
  function startLoop() {
    var root = $('.gate'); if (!root) return;
    var id = ++RUN;
    root.querySelectorAll('.gl').forEach(function (l) { l.style.transition = 'none'; });
    if (reduce) { frame(root, 3.2); return; }   // one still frame for people who turn motion off
    var t0 = performance.now();
    (function tick(now) {
      if (id !== RUN || !document.body.contains(root)) return;
      frame(root, (now - t0) / 1000 + 0.5);
      requestAnimationFrame(tick);
    })(t0);
  }

  /* ---------- sign-in and first-run screens ---------- */
  var G = { mode: 'login', note: '', err: '', busy: false, email: '' };
  function pin(id, label, ac) {
    return '<div class="gfld"><label for="' + id + '">' + esc(label) + '</label><div class="gpin"><input id="' + id + '" type="password" inputmode="numeric" pattern="[0-9]{4}" maxlength="4" autocomplete="' + ac + '" required>' +
      '<span class="gc" aria-hidden="true"></span><span class="gc" aria-hidden="true"></span><span class="gc" aria-hidden="true"></span><span class="gc" aria-hidden="true"></span></div></div>';
  }
  function show(mode, why) {
    G.mode = mode === 'setup' ? 'setup' : 'login'; G.err = ''; G.busy = false;
    G.note = why === 'idle' ? t('au.note.idle') : why === 'out' ? t('au.note.out') : why === 'other' ? t('au.note.other') : '';
    document.documentElement.classList.remove('pwh-m3');
    render();
  }
  function field(id, type, label, ac, val) {
    return '<div class="gfld"><label class="sr" for="' + id + '">' + esc(label) + '</label><input id="' + id + '" type="' + type + '" autocomplete="' + ac + '" placeholder="' + esc(label) + '" required' + (val ? ' value="' + esc(val) + '"' : '') + '></div>';
  }
  function render() {
    var lang = PWH.getLang(), setup = G.mode === 'setup';
    var form = setup
      ? '<h1>' + esc(t('au.setup.title')) + '</h1><p class="glede">' + esc(t('au.setup.sub')) + '</p>' +
        field('gemail', 'email', t('au.email'), 'username') + field('gname', 'text', t('au.name'), 'name') +
        pin('gcode', t('au.code'), 'new-password') + pin('gcode2', t('au.code2'), 'new-password') +
        '<p class="gerr" role="alert">' + esc(G.err) + '</p><button class="btn primary gbtn" type="submit"' + (G.busy ? ' disabled' : '') + '>' + esc(t('au.setup.go')) + '</button>' +
        '<p class="gfoot">' + esc(t('au.setup.foot')) + '</p>'
      : '<h1>' + esc(t('au.login.title')) + '</h1><p class="glede">' + esc(t('au.login.sub')) + '</p>' +
        (G.note ? '<p class="gnote" role="status">' + esc(G.note) + '</p>' : '') +
        field('gemail', 'email', t('au.email'), 'username', G.email) +
        pin('gcode', t('au.code'), 'current-password') +
        '<div class="gforgot"><button type="button" class="glink" data-g="forgot" aria-expanded="' + !!G.forgot + '">' + esc(t('au.forgot')) + '</button>' + (G.forgot ? '<p class="gtip">' + esc(t('au.forgot.tip')) + '</p>' : '') + '</div>' +
        '<p class="gerr" role="alert">' + esc(G.err) + '</p><button class="btn primary gbtn" type="submit"' + (G.busy ? ' disabled' : '') + '>' + esc(t('au.login.go')) + '</button>' +
        '<p class="gfoot">' + esc(t('au.noacc')) + ' <b>' + esc(t('au.noacc.who')) + '</b></p>';
    $('#app').innerHTML = '<div class="gate">' +
      '<aside class="gart"><div class="gcopy"><p class="ghead"><span>' + esc(t('au.hero1')) + '</span><br><span class="gul">' + esc(t('au.hero2')) + '</span></p><p class="gsub">' + esc(t('au.hero.sub')) + '</p></div>' +
      '<div class="gpic">' + scene() + '</div></aside>' +
      '<main class="gmain"><div class="lang" role="group" aria-label="Language"><button type="button" data-gl="th" aria-pressed="' + (lang === 'th') + '">TH</button><button type="button" data-gl="en" aria-pressed="' + (lang === 'en') + '">EN</button></div>' +
      '<form class="gform" id="gform" novalidate><div class="glogo">' + logo(52) + '<span><b>PWH</b><small>Part Warehouse</small></span></div>' + form + '</form></main></div>';
    wire(); startLoop();
    var first = $(setup ? '#gemail' : (G.email ? '#gcode' : '#gemail')); if (first) first.focus();
  }
  function digits(el) { var v = el.value.replace(/\D/g, '').slice(0, 4); if (v !== el.value) el.value = v; return v; }
  function paintPin(el) {
    var v = digits(el), cells = el.parentNode.querySelectorAll('.gc');
    cells.forEach(function (c, i) { c.classList.toggle('f', i < v.length); c.classList.toggle('cur', i === Math.min(v.length, 3)); });
    return v;
  }
  function wire() {
    document.querySelectorAll('[data-gl]').forEach(function (b) { b.addEventListener('click', function () { G.email = ($('#gemail') || {}).value || G.email; PWH.setLang(b.getAttribute('data-gl')); t = PWH.t; render(); }); });
    document.querySelectorAll('.gpin input').forEach(function (el) {
      el.addEventListener('input', function () {
        var v = paintPin(el); G.err = ''; var e0 = $('.gerr'); if (e0) e0.textContent = '';
        if (G.mode === 'login' && v.length === 4 && ($('#gemail').value || '').trim()) submit();   // 4 digits typed: sign in straight away
      });
      paintPin(el);
    });
    var f = $('#gform'); f.addEventListener('submit', function (e) { e.preventDefault(); submit(); });
    var fg = $('[data-g=forgot]'); if (fg) fg.addEventListener('click', function () { G.forgot = !G.forgot; G.email = $('#gemail').value; render(); });
    var art = $('.gart');
    if (art && !reduce) art.addEventListener('pointermove', function (e) {   // depth: the floor stays, rack, cart and tag drift by different amounts
      var r = art.getBoundingClientRect(), dx = (e.clientX - r.left) / r.width - 0.5, dy = (e.clientY - r.top) / r.height - 0.5;
      art.querySelectorAll('.gpl').forEach(function (gp, i) { gp.style.transform = 'translate(' + (dx * i * 5).toFixed(1) + 'px,' + (dy * i * 3).toFixed(1) + 'px)'; });
    });
  }
  function fail(msg, focus) {
    G.busy = false; G.err = msg;
    var e0 = $('.gerr'); if (e0) e0.textContent = msg;
    var b = $('.gbtn'); if (b) b.disabled = false;
    var form = $('.gform'); if (form && !reduce) { form.classList.remove('shake'); void form.offsetWidth; form.classList.add('shake'); }
    if (focus) { var el = $(focus); if (el) { if (el.closest('.gpin')) { el.value = ''; paintPin(el); } el.focus(); } }
  }
  function submit() {
    if (G.busy) return;
    var email = ($('#gemail').value || '').trim(), code = ($('#gcode').value || '');
    if (!PWH.auth.okEmail(email.toLowerCase())) return fail(t('au.err.email'), '#gemail');
    if (!PWH.auth.okCode(code)) return fail(t('au.err.code'), '#gcode');
    G.busy = true; G.email = email; var b = $('.gbtn'); if (b) b.disabled = true;
    var job;
    if (G.mode === 'setup') {
      var name = ($('#gname').value || '').trim(), c2 = $('#gcode2').value || '';
      if (!name) return fail(t('au.err.name'), '#gname');
      if (c2 !== code) return fail(t('au.err.match'), '#gcode2');
      job = PWH.auth.setup({ email: email, name: name, code: code });
    } else job = PWH.auth.login(email, code);
    job.then(function () {
      setTimeout(function () { G.email = ''; PWH.app.enter(); }, reduce ? 0 : 520);
    }).catch(function (e) { fail(errText(e), e && e.code === 'email' ? '#gemail' : '#gcode'); });
  }

  /* ---------- admin page: users and roles ---------- */
  var U = { edit: null, confirm: null, msg: null, root: null };
  function roleChip(r) { return '<span class="chip ' + (r === 'admin' ? 'urole-a' : 'urole-u') + '">' + esc(t('au.role.' + r)) + '</span>'; }
  function matrix() {
    var rows = [['au.p.view', 1, 1], ['au.p.sim', 1, 1], ['au.p.data', 1, 0], ['au.p.layout', 1, 0], ['au.p.rules', 1, 0], ['au.p.users', 1, 0]];
    var mk = function (on) { return on ? '<span class="uyes" aria-label="' + esc(t('au.p.yes')) + '">&#10003;</span>' : '<span class="uno" aria-label="' + esc(t('au.p.no')) + '">–</span>'; };
    return '<section class="panel"><h2>' + esc(t('au.p.title')) + '</h2><p class="sub">' + esc(t('au.p.sub')) + '</p><div class="tablebox"><table class="umx"><thead><tr><th>' + esc(t('au.p.what')) + '</th><th class="c">' + esc(t('au.role.admin')) + '</th><th class="c">' + esc(t('au.role.user')) + '</th></tr></thead><tbody>' +
      rows.map(function (r) { return '<tr><td>' + esc(t(r[0])) + '</td><td class="c">' + mk(r[1]) + '</td><td class="c">' + mk(r[2]) + '</td></tr>'; }).join('') + '</tbody></table></div></section>';
  }
  function formHtml() {
    var e = U.edit && U.edit !== 'new' ? PWH.auth.list().filter(function (x) { return x.id === U.edit; })[0] : null, role = (U.draft && U.draft.role) || (e ? e.role : 'user');
    var me = PWH.auth.me(), self = e && e.id === me.id;
    return '<section class="panel uform"><h2>' + esc(t(e ? 'au.f.edit' : 'au.f.add')) + '</h2>' + (e ? '<p class="sub">' + esc(e.email) + '</p>' : '<p class="sub">' + esc(t('au.f.addsub')) + '</p>') +
      '<form id="uform" novalidate autocomplete="off">' +
      '<div class="gfld"><label for="uemail">' + esc(t('au.email')) + '</label><input id="uemail" type="email" value="' + esc(e ? e.email : '') + '" required></div>' +
      '<div class="gfld"><label for="uname">' + esc(t('au.name')) + '</label><input id="uname" type="text" value="' + esc(e ? e.name : '') + '" required></div>' +
      '<div class="gfld"><label for="ucode">' + esc(t(e ? 'au.f.code_new' : 'au.code')) + '</label><input id="ucode" type="text" inputmode="numeric" maxlength="4" pattern="[0-9]{4}" class="ucode" placeholder="0000" autocomplete="off">' + (e ? '<span class="sub2">' + esc(t('au.f.code_keep')) + '</span>' : '') + '</div>' +
      '<div class="gfld"><span class="lbl">' + esc(t('au.f.role')) + '</span><div class="seg" role="group">' + ['user', 'admin'].map(function (r) { return '<button type="button" data-u="role" data-v="' + r + '" aria-pressed="' + (role === r) + '"' + (self ? ' disabled' : '') + '>' + esc(t('au.role.' + r)) + '</button>'; }).join('') + '</div>' +
      '<span class="sub2">' + esc(t(self ? 'au.f.selfrole' : 'au.f.role_' + role)) + '</span></div>' +
      (U.msg ? '<p class="umsg ' + U.msg[0] + '" role="' + (U.msg[0] === 'bad' ? 'alert' : 'status') + '">' + esc(U.msg[1]) + '</p>' : '') +
      '<div class="uacts"><button class="btn primary" type="submit">' + esc(t(e ? 'au.f.save' : 'au.f.create')) + '</button>' + (e ? '<button class="btn" type="button" data-u="cancel">' + esc(t('au.f.cancel')) + '</button>' : '') + '</div></form></section>';
  }
  function tableHtml() {
    var me = PWH.auth.me(), list = PWH.auth.list().sort(function (a, b) { return (a.role === b.role ? 0 : a.role === 'admin' ? -1 : 1) || a.name.localeCompare(b.name); });
    var rows = list.map(function (u) {
      var self = u.id === me.id, conf = U.confirm === u.id;
      var acts = '<button class="btn sm" data-u="edit" data-id="' + u.id + '">' + esc(t('au.t.edit')) + '</button>' +
        (self ? '' : '<button class="btn sm" data-u="toggle" data-id="' + u.id + '">' + esc(t(u.active ? 'au.t.off' : 'au.t.on')) + '</button><button class="btn sm danger' + (conf ? ' confirm' : '') + '" data-u="del" data-id="' + u.id + '">' + esc(t(conf ? 'au.t.delsure' : 'au.t.del')) + '</button>');
      return '<tr' + (u.active ? '' : ' class="uoff"') + (U.edit === u.id ? ' aria-current="true"' : '') + '><td><div class="uwho"><span class="uav" aria-hidden="true">' + esc((u.name || u.email).charAt(0).toUpperCase()) + '</span><div><b>' + esc(u.name) + '</b>' + (self ? ' <span class="chip info">' + esc(t('au.t.you')) + '</span>' : '') + '<div class="sub2">' + esc(u.email) + '</div></div></div></td>' +
        '<td>' + roleChip(u.role) + '</td><td><span class="chip ' + (u.active ? 'ok' : 'pending') + '">' + esc(t(u.active ? 'au.t.active' : 'au.t.inactive')) + '</span></td><td class="when">' + fmtDT(u.lastLogin) + '</td><td><div class="acts">' + acts + '</div></td></tr>';
    }).join('');
    var nA = list.filter(function (u) { return u.role === 'admin'; }).length;
    return '<section class="panel"><div class="chd"><div class="chd-l"><h2>' + esc(t('au.t.title', { n: list.length })) + '</h2><p class="sub">' + esc(t('au.t.sub', { a: nA, u: list.length - nA })) + '</p></div>' +
      (U.edit && U.edit !== 'new' ? '<div class="chd-r"><button class="btn" data-u="new">' + esc(t('au.t.new')) + '</button></div>' : '') + '</div>' +
      '<div class="tablebox"><table class="utable"><thead><tr><th>' + esc(t('au.t.who')) + '</th><th>' + esc(t('au.t.role')) + '</th><th>' + esc(t('au.t.status')) + '</th><th>' + esc(t('au.t.last')) + '</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div></section>';
  }
  function renderUsers() {
    var v = U.root; if (!v || !document.body.contains(v)) return;
    if (!PWH.auth.can('users.manage')) { v.innerHTML = '<div class="panel">' + esc(t('au.ro.denied')) + '</div>'; return; }
    v.innerHTML = '<div class="ph"><div class="ph-l"><div class="cap">' + esc(t('au.cap2')) + '</div><h1>' + esc(t('nav.users')) + '</h1><p class="lede">' + esc(t('au.lede')) + '</p></div></div>' +
      '<p class="ulocal">' + esc(t('au.local')) + '</p>' +
      '<div class="ugrid">' + tableHtml() + formHtml() + '</div>' + matrix();
    var f = $('#uform'); if (f) f.addEventListener('submit', function (e) { e.preventDefault(); saveForm(); });
    var c = $('#ucode'); if (c) c.addEventListener('input', function () { var x = c.value.replace(/\D/g, '').slice(0, 4); if (x !== c.value) c.value = x; });
  }
  function draft() { return { email: ($('#uemail').value || '').trim(), name: ($('#uname').value || '').trim(), code: ($('#ucode').value || '').trim(), role: (U.draft && U.draft.role) || (($('[data-u=role][aria-pressed=true]') || {}).getAttribute ? $('[data-u=role][aria-pressed=true]').getAttribute('data-v') : 'user') }; }
  function saveForm() {
    var d = draft(), editing = U.edit && U.edit !== 'new' ? U.edit : null;
    var cur = editing ? PWH.auth.list().filter(function (x) { return x.id === editing; })[0] : null;
    var job = editing ? PWH.auth.updateUser(editing, { email: d.email, name: d.name, role: d.role, active: cur ? cur.active : true, code: d.code }) : PWH.auth.addUser(d);
    job.then(function (u) {
      U.msg = ['ok', t(editing ? 'au.ok.saved' : 'au.ok.added', { name: u.name })]; U.edit = 'new'; U.draft = null; renderUsers(); PWH.app.refreshUser();
    }).catch(function (e) { U.msg = ['bad', errText(e)]; U.draft = d; renderUsers(); restore(d); });
  }
  function restore(d) { if ($('#uemail')) { $('#uemail').value = d.email; $('#uname').value = d.name; $('#ucode').value = d.code; } }
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-u]'); if (!el || !U.root || !U.root.contains(el)) return;
    var a = el.getAttribute('data-u'), id = el.getAttribute('data-id');
    if (a === 'role') { var d = draft(); d.role = el.getAttribute('data-v'); U.draft = d; U.msg = null; renderUsers(); restore(d); return; }
    U.msg = null;
    if (a === 'edit') { U.edit = id; U.draft = null; U.confirm = null; renderUsers(); var n = $('#uname'); if (n) n.focus(); }
    else if (a === 'new' || a === 'cancel') { U.edit = 'new'; U.draft = null; renderUsers(); }
    else if (a === 'toggle') {
      var u = PWH.auth.list().filter(function (x) { return x.id === id; })[0]; if (!u) return;
      PWH.auth.updateUser(id, { email: u.email, name: u.name, role: u.role, active: !u.active, code: '' })
        .then(function () { U.msg = ['ok', t(u.active ? 'au.ok.off' : 'au.ok.on', { name: u.name })]; renderUsers(); })
        .catch(function (er) { U.msg = ['bad', errText(er)]; renderUsers(); });
    }
    else if (a === 'del') {
      if (U.confirm !== id) { U.confirm = id; renderUsers(); setTimeout(function () { if (U.confirm === id) { U.confirm = null; renderUsers(); } }, 4000); return; }
      U.confirm = null;
      var dn = (PWH.auth.list().filter(function (x) { return x.id === id; })[0] || {}).name;
      PWH.auth.removeUser(id).then(function () { if (U.edit === id) U.edit = 'new'; U.msg = ['ok', t('au.ok.deleted', { name: dn })]; renderUsers(); })
        .catch(function (er) { U.msg = ['bad', errText(er)]; renderUsers(); });
    }
  });

  /* a short line at the top of a module the signed-in person may only look at */
  function roNote(key) { return '<p class="ronote"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>' + esc(t(key || 'au.ro.note')) + '</p>'; }

  PWH.gate = { show: show, logo: logo, _frame: function (t) { var r = $('.gate'); if (r) frame(r, t); }, _T: TL.T };
  PWH.users = { mount: function (root) { U.root = root; U.edit = 'new'; U.msg = null; U.confirm = null; U.draft = null; renderUsers(); }, roNote: roNote };
})(window);
