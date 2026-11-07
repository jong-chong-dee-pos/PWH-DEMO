/* PWH route planner (Module 3).
 * Turns the warehouse layout (racks, aisles, START / DROP, lifts) into a walking grid, then orders the stops
 * of a pick list so the walk START -> stops -> DROP is short.
 *
 * Grid      : cells of G sheet pixels; walkable = cart aisles + START / DROP / door / lift / exit areas.
 *             A rack is reached from any walkable cell touching it.
 * Distance  : shortest walk along walkable cells (up and down / left and right only, like a cart).
 * Floors    : the lifts of different floors are linked by one fixed extra distance (LIFT_M).
 * Ordering  : nearest-neighbour tour improved by 2-opt, with START and DROP fixed. When a Part is in several
 *             bins the planner uses the bin that adds the least walking, and still lists every bin.
 * Distances are in metres only as far as the layout scale (sheet px per metre) is right.
 */
(function (g) {
  var PWH = (g.PWH = g.PWH || {});
  var G = 4;               // sheet px per grid cell
  var LIFT_M = 25;         // walking-equivalent metres for going up or down the lift (assumed)
  var INF = 1 << 29;
  var CAND_MAX = 6;        // bins per Part considered when choosing the route

  var cache = { key: '', graph: null };

  function build(layout) {
    var key = layout.importedAt + ':' + layout.scale;
    if (cache.key === key) return cache.graph;
    var fl = layout.floors, F = [], N = 0;
    fl.forEach(function (f) {
      var x0 = f.bbox[0] - 2 * G, y0 = f.bbox[1] - 2 * G;
      var W = Math.ceil((f.bbox[2] - x0) / G) + 3, H = Math.ceil((f.bbox[3] - y0) / G) + 3;
      F.push({ f: f, x0: x0, y0: y0, W: W, H: H, off: N });
      N += W * H;
    });
    var walk = new Uint8Array(N), floorOf = new Uint8Array(N);
    F.forEach(function (o, fi) {
      for (var i = 0; i < o.W * o.H; i++) floorOf[o.off + i] = fi;
      function paint(r) {
        var cx0 = Math.floor((r.x - o.x0) / G), cx1 = Math.ceil((r.x + r.w - o.x0) / G), cy0 = Math.floor((r.y - o.y0) / G), cy1 = Math.ceil((r.y + r.h - o.y0) / G);
        for (var cy = Math.max(0, cy0); cy < Math.min(o.H, cy1); cy++) for (var cx = Math.max(0, cx0); cx < Math.min(o.W, cx1); cx++) {
          // cell centre must be inside the rectangle
          var px = o.x0 + (cx + 0.5) * G, py = o.y0 + (cy + 0.5) * G;
          if (px >= r.x && px < r.x + r.w && py >= r.y && py < r.y + r.h) walk[o.off + cy * o.W + cx] = 1;
        }
      }
      o.f.aisles.forEach(paint);
      o.f.markers.forEach(paint);
    });
    var block = new Uint8Array(N);
    F.forEach(function (o) {
      function mark(r) {
        var cx0 = Math.floor((r.x - o.x0) / G), cx1 = Math.ceil((r.x + r.w - o.x0) / G), cy0 = Math.floor((r.y - o.y0) / G), cy1 = Math.ceil((r.y + r.h - o.y0) / G);
        for (var cy = Math.max(0, cy0); cy < Math.min(o.H, cy1); cy++) for (var cx = Math.max(0, cx0); cx < Math.min(o.W, cx1); cx++) block[o.off + cy * o.W + cx] = 1;
      }
      o.f.racks.forEach(mark); o.f.outside.forEach(mark);
    });
    var graph = { F: F, N: N, walk: walk, floorOf: floorOf, scale: layout.scale, links: {}, rackAccess: new Map(), bridges: 0 };
    dropZone(graph, block);
    bridge(graph, block);
    // racks stay blocked (they are never painted); find the walkable cells that touch each rack
    F.forEach(function (o) {
      o.f.racks.forEach(function (r) {
        var cx0 = Math.floor((r.x - o.x0) / G), cx1 = Math.ceil((r.x + r.w - o.x0) / G) - 1, cy0 = Math.floor((r.y - o.y0) / G), cy1 = Math.ceil((r.y + r.h - o.y0) / G) - 1;
        var cells = [];
        for (var ring = 1; ring <= 5 && !cells.length; ring++) {
          for (var cy = cy0 - ring; cy <= cy1 + ring; cy++) for (var cx = cx0 - ring; cx <= cx1 + ring; cx++) {
            var onRing = cx === cx0 - ring || cx === cx1 + ring || cy === cy0 - ring || cy === cy1 + ring;
            if (!onRing || cx < 0 || cy < 0 || cx >= o.W || cy >= o.H) continue;
            var n = o.off + cy * o.W + cx; if (walk[n]) cells.push(n);
          }
          if (graph.zone) { var outZ = cells.filter(function (c) { return !graph.zone[c]; }); if (outZ.length) cells = outZ; }
        }
        graph.rackAccess.set(r.id, cells);
      });
    });
    // marker nodes: a representative walkable cell for START / DROP / lifts / doors
    function repNode(m, fi) {
      var o = F[fi], cx = Math.floor((m.x + m.w / 2 - o.x0) / G), cy = Math.floor((m.y + m.h / 2 - o.y0) / G), best = -1, bd = 1e9;
      for (var dy = -6; dy <= 6; dy++) for (var dx = -6; dx <= 6; dx++) {
        var x = cx + dx, y = cy + dy; if (x < 0 || y < 0 || x >= o.W || y >= o.H) continue;
        var n = o.off + y * o.W + x, d = dx * dx + dy * dy;
        if (walk[n] && d < bd) { bd = d; best = n; }
      }
      return best;
    }
    var lifts = [], doors = [];
    F.forEach(function (o, fi) {
      o.f.markers.forEach(function (m) {
        var n = repNode(m, fi); if (n < 0) return;
        if (m.type === 'start' && !graph.start) graph.start = n;
        else if (m.type === 'drop' && !graph.drop) graph.drop = n;
        else if (m.type === 'lift') lifts.push(n);
        else if (m.type === 'door') { if (!graph.door) graph.door = n; doors.push(n); }
      });
    });
    if (graph.start == null) graph.start = graph.door != null ? graph.door : (lifts[0] != null ? lifts[0] : -1);
    if (graph.drop == null) graph.drop = graph.start;
    graph.doors = doors;
    graph.liftOf = {};
    lifts.forEach(function (n) { var fi = floorOf[n]; if (graph.liftOf[fi] == null) graph.liftOf[fi] = n; });
    var lw = Math.round(LIFT_M * layout.scale / G);
    for (var a = 0; a < lifts.length; a++) for (var b = 0; b < lifts.length; b++) {
      if (a !== b && floorOf[lifts[a]] !== floorOf[lifts[b]]) (graph.links[lifts[a]] = graph.links[lifts[a]] || []).push([lifts[b], lw]);
    }
    cache = { key: key, graph: graph };
    return graph;
  }

  /* The lift / START / DROP corner of the DROP floor is walled off: its only opening is the door nearest DROP.
   * Zone = box around that door, START, the lifts and the exit on that floor, plus the DROP strip and the gap between
   * them. Every open cell inside is walkable (the file does not colour that floor); a step between the zone and the
   * rest of the floor is allowed only through the door, across it (north-south for a wide door, east-west for a tall one). */
  function dropZone(gr, block) {
    var F = gr.F, fi = -1, drop = null;
    F.forEach(function (o, i) { o.f.markers.forEach(function (m) { if (m.type === 'drop' && !drop) { drop = m; fi = i; } }); });
    if (!drop) return;
    var o = F[fi], mk = o.f.markers, cx = drop.x + drop.w / 2, cy = drop.y + drop.h / 2, door = null, bd = Infinity;
    mk.forEach(function (m) { if (m.type !== 'door') return; var d = Math.pow(m.x + m.w / 2 - cx, 2) + Math.pow(m.y + m.h / 2 - cy, 2); if (d < bd) { bd = d; door = m; } });
    if (!door) return;
    var inBox = mk.filter(function (m) { return m === door || m.type === 'start' || m.type === 'lift' || m.type === 'exit'; });
    var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    inBox.forEach(function (m) { x0 = Math.min(x0, m.x); y0 = Math.min(y0, m.y); x1 = Math.max(x1, m.x + m.w); y1 = Math.max(y1, m.y + m.h); });
    var rects = [{ x: x0, y: y0, w: x1 - x0, h: y1 - y0 }, drop];
    if (drop.y + drop.h < y0) rects.push({ x: drop.x, y: drop.y + drop.h, w: drop.w, h: y0 - drop.y - drop.h });   // DROP strip down to the zone
    else if (drop.y > y1) rects.push({ x: drop.x, y: y1, w: drop.w, h: drop.y - y1 });
    var zone = new Uint8Array(gr.N), dcell = new Uint8Array(gr.N);
    function inside(r, px, py) { return px >= r.x && px < r.x + r.w && py >= r.y && py < r.y + r.h; }
    for (var yy = 0; yy < o.H; yy++) for (var xx = 0; xx < o.W; xx++) {
      var n = o.off + yy * o.W + xx, px = o.x0 + (xx + 0.5) * G, py = o.y0 + (yy + 0.5) * G;
      if (rects.some(function (r) { return inside(r, px, py); })) { zone[n] = 1; if (!block[n]) gr.walk[n] = 1; if (inside(door, px, py)) dcell[n] = 1; }
    }
    gr.zone = zone; gr.zoneDoor = dcell; gr.doorNS = door.w >= door.h;
  }
  function canStep(gr, a, b, vertical) {
    if (!gr.zone || gr.zone[a] === gr.zone[b]) return true;
    var z = gr.zone[a] ? a : b;
    return gr.zoneDoor[z] === 1 && vertical === gr.doorNS;
  }

  // Parts of the walkable area that are not joined to the main aisles (the file only colours the cart aisles, so
  // a START / DROP / lift area can float a few cells away). Join each one to the main network across open floor.
  function bridge(gr, block) {
    var walk = gr.walk, F = gr.F, comp = new Int32Array(gr.N).fill(-1), sizes = [], floors = [];
    function nbrs(n, fn) {
      var o = F[gr.floorOf[n]], rel = n - o.off, y = (rel / o.W) | 0, x = rel - y * o.W;
      if (x > 0) fn(n - 1); if (x < o.W - 1) fn(n + 1); if (y > 0) fn(n - o.W); if (y < o.H - 1) fn(n + o.W);
    }
    for (var n0 = 0; n0 < gr.N; n0++) {
      if (!walk[n0] || comp[n0] >= 0) continue;
      var id = sizes.length, st = [n0], c = 0; comp[n0] = id;
      while (st.length) { var n = st.pop(); c++; nbrs(n, function (m) { if (walk[m] && comp[m] < 0) { comp[m] = id; st.push(m); } }); }
      sizes.push(c); floors.push(gr.floorOf[n0]);
    }
    var main = {}; sizes.forEach(function (c, i) { var f = floors[i]; if (main[f] == null || c > sizes[main[f]]) main[f] = i; });
    var order = sizes.map(function (_, i) { return i; }).filter(function (i) { return main[floors[i]] !== i; }).sort(function (a, b) { return sizes[b] - sizes[a]; });
    order.forEach(function (ci) {
      // breadth-first over open floor from this component until a cell of the main network is met
      var prev = new Map(), q = [], found = -1, r;
      for (var n = 0; n < gr.N; n++) if (comp[n] === ci) { q.push(n); prev.set(n, -1); }
      for (var h = 0; h < q.length && found < 0; h++) {
        var cur = q[h];
        nbrs(cur, function (m) {
          if (found >= 0 || prev.has(m)) return;
          if (walk[m] && comp[m] === main[floors[ci]]) { prev.set(m, cur); found = m; return; }
          if (!walk[m] && block[m]) return;
          prev.set(m, cur); q.push(m);
        });
      }
      if (found < 0) return;
      for (var n2 = found; n2 >= 0; n2 = prev.get(n2)) { walk[n2] = 1; comp[n2] = main[floors[ci]]; }
      for (var n3 = 0; n3 < gr.N; n3++) if (comp[n3] === ci) comp[n3] = main[floors[ci]];
      gr.bridges++;
    });
  }

  // shortest walking distance (in cells) from a set of source nodes to every node
  function dijkstra(gr, srcs, parent) {
    var dist = new Int32Array(gr.N).fill(INF), buckets = [], walk = gr.walk, F = gr.F, floorOf = gr.floorOf;
    srcs.forEach(function (n) { if (dist[n] > 0) { dist[n] = 0; (buckets[0] = buckets[0] || []).push(n); } });
    function relax(m, nd, from) {
      if (nd < dist[m]) { dist[m] = nd; if (parent) parent[m] = from; (buckets[nd] = buckets[nd] || []).push(m); }
    }
    for (var d = 0; d < buckets.length; d++) {
      var b = buckets[d]; if (!b) continue;
      for (var i = 0; i < b.length; i++) {
        var n = b[i]; if (dist[n] !== d) continue;
        var o = F[floorOf[n]], rel = n - o.off, y = (rel / o.W) | 0, x = rel - y * o.W;
        if (x > 0 && walk[n - 1] && canStep(gr, n, n - 1, false)) relax(n - 1, d + 1, n);
        if (x < o.W - 1 && walk[n + 1] && canStep(gr, n, n + 1, false)) relax(n + 1, d + 1, n);
        if (y > 0 && walk[n - o.W] && canStep(gr, n, n - o.W, true)) relax(n - o.W, d + 1, n);
        if (y < o.H - 1 && walk[n + o.W] && canStep(gr, n, n + o.W, true)) relax(n + o.W, d + 1, n);
        var lk = gr.links[n];
        if (lk) for (var k = 0; k < lk.length; k++) relax(lk[k][0], d + lk[k][1], n);
      }
      buckets[d] = null;
    }
    return dist;
  }
  function minTo(dist, nodes) { var m = INF; for (var i = 0; i < nodes.length; i++) if (dist[nodes[i]] < m) m = dist[nodes[i]]; return m; }

  /* plan(layout, parts, opts)
   *   parts: [{key, cands:[{bin, rack, level, floor(id), stock}]}]   (bins already limited to those on the layout)
   * returns { ok, order:[{key, cand, from:metres}], total:metres, legs:[{floor, pts:[[x,y]..], lift?}], unreachable:[key] } */
  function plan(layout, parts) {
    var gr = build(layout), cell = layout.scale / G;
    if (gr.start < 0) return { ok: false, reason: 'no_start', order: [], total: 0, legs: [], unreachable: parts.map(function (p) { return p.key; }) };
    var unreachable = [], items = [];
    parts.forEach(function (p) {
      var cs = [];
      p.cands.forEach(function (c) { var acc = gr.rackAccess.get(c.rack); if (acc && acc.length) cs.push({ c: c, nodes: acc }); });
      cs.sort(function (a, b) { return (b.c.stock || 0) - (a.c.stock || 0); });
      if (!cs.length) { unreachable.push(p.key); return; }
      items.push({ key: p.key, cs: cs.slice(0, CAND_MAX) });
    });
    if (!items.length) return { ok: true, order: [], total: 0, legs: [], unreachable: unreachable };

    // every candidate becomes a node; distances between all of them, START, DROP and the lift of each floor
    var nodes = [{ nodes: [gr.start], kind: 'S' }], idx = [];
    items.forEach(function (it, i) { idx[i] = []; it.cs.forEach(function (cc, j) { idx[i][j] = nodes.length; nodes.push({ nodes: cc.nodes, item: i, cand: j }); }); });
    var di = nodes.length; nodes.push({ nodes: [gr.drop], kind: 'D' });
    var liftIdx = {};
    Object.keys(gr.liftOf).forEach(function (fi) { liftIdx[fi] = nodes.length; nodes.push({ nodes: [gr.liftOf[fi]], kind: 'L' }); });
    // House rule for the way to DROP: every walk reaches DROP through the door nearest DROP
    // (finishing on floor 1, or coming back down by lift and walking up past START to the door)
    var doorIdx = null, dropFl = gr.floorOf[gr.drop], dd = dijkstra(gr, [gr.drop]), bestDoor = -1;
    (gr.doors || []).forEach(function (n) { if (gr.floorOf[n] === dropFl && dd[n] < INF && (bestDoor < 0 || dd[n] < dd[bestDoor])) bestDoor = n; });
    if (bestDoor >= 0) { doorIdx = nodes.length; nodes.push({ nodes: [bestDoor], kind: 'R' }); }
    var K = nodes.length, D = [];
    for (var a = 0; a < K; a++) {
      var dist = dijkstra(gr, nodes[a].nodes); D[a] = new Int32Array(K);
      for (var b = 0; b < K; b++) D[a][b] = a === b ? 0 : minTo(dist, nodes[b].nodes);
    }
    // Parts that cannot be walked to from START are left out of the tour
    var live = [];
    items.forEach(function (it, i) {
      var okAny = false; for (var j = 0; j < it.cs.length; j++) if (D[0][idx[i][j]] < INF) okAny = true;
      if (okAny) live.push(i); else unreachable.push(it.key);
    });
    // start with the bin nearest START (the caller normally gives one bin per Part)
    var choice = items.map(function (it, i) {
      var best = 0; for (var j = 1; j < it.cs.length; j++) if (D[0][idx[i][j]] < D[0][idx[i][best]]) best = j;
      return best;
    });
    function floorOfNode(n) { return gr.floorOf[nodes[n].nodes[0]]; }
    function itemNode(it) { return idx[it][choice[it]]; }

    // best order of `set` between two fixed nodes: nearest neighbour, then 2-opt and or-opt
    function optimizePath(set, sN, eN) {
      var order = set.slice();
      function nodeOf(pos) { return pos < 0 ? sN : pos >= order.length ? eN : itemNode(order[pos]); }
      function tourLen() { var s2 = 0; for (var p = -1; p < order.length; p++) s2 += D[nodeOf(p)][nodeOf(p + 1)]; return s2; }
      var left = order.slice(), seq = [], cur = sN;
      while (left.length) {
        var bi = 0, bd = INF;
        for (var q = 0; q < left.length; q++) { var dd = D[cur][itemNode(left[q])]; if (dd < bd) { bd = dd; bi = q; } }
        var pick = left.splice(bi, 1)[0]; seq.push(pick); cur = itemNode(pick);
      }
      order = seq;
      for (var round = 0; round < 4; round++) {
        var before = tourLen();
        var improved = true, guard = 0;
        while (improved && guard++ < 60) {
          improved = false;
          for (var i = 0; i < order.length - 1; i++) for (var j = i + 1; j < order.length; j++) {
            var A = nodeOf(i - 1), B = nodeOf(i), C = nodeOf(j), E = nodeOf(j + 1);
            if (D[A][C] + D[B][E] < D[A][B] + D[C][E]) {
              var seg = order.slice(i, j + 1).reverse(); order = order.slice(0, i).concat(seg, order.slice(j + 1)); improved = true;
            }
          }
        }
        // or-opt: move a run of 1 to 3 stops to the place where it adds the least walking
        var moved = true, guard3 = 0;
        while (moved && guard3++ < 40) {
          moved = false;
          for (var len = 1; len <= 3 && !moved; len++) {
            for (var i3 = 0; i3 + len <= order.length && !moved; i3++) {
              var segA = nodeOf(i3), segB = nodeOf(i3 + len - 1), pv = nodeOf(i3 - 1), nx = nodeOf(i3 + len);
              var gain = D[pv][segA] + D[segB][nx] - D[pv][nx];
              if (gain <= 0) continue;
              var rest = order.slice(0, i3).concat(order.slice(i3 + len)), seg3 = order.slice(i3, i3 + len), bestAdd = gain, bestPos = -1, bestRev = false;
              for (var pos = 0; pos <= rest.length; pos++) {
                if (pos === i3) continue;
                var L2 = pos === 0 ? sN : itemNode(rest[pos - 1]), R2 = pos === rest.length ? eN : itemNode(rest[pos]);
                var add1 = D[L2][segA] + D[segB][R2] - D[L2][R2], add2 = D[L2][segB] + D[segA][R2] - D[L2][R2];
                if (add1 < bestAdd) { bestAdd = add1; bestPos = pos; bestRev = false; }
                if (add2 < bestAdd) { bestAdd = add2; bestPos = pos; bestRev = true; }
              }
              if (bestPos >= 0) { if (bestRev) seg3.reverse(); order = rest.slice(0, bestPos).concat(seg3, rest.slice(bestPos)); moved = true; }
            }
          }
        }
        // best bin for each Part given its neighbours (same floor only, so the floor groups stay as they are)
        for (var p2 = 0; p2 < order.length; p2++) {
          var it2 = order[p2], prev = nodeOf(p2 - 1), next = nodeOf(p2 + 1), bj = choice[it2], bc = D[prev][idx[it2][bj]] + D[idx[it2][bj]][next], f0 = floorOfNode(idx[it2][bj]);
          for (var j2 = 0; j2 < items[it2].cs.length; j2++) {
            if (floorOfNode(idx[it2][j2]) !== f0) continue;
            var c2 = D[prev][idx[it2][j2]] + D[idx[it2][j2]][next];
            if (c2 < bc) { bc = c2; bj = j2; }
          }
          choice[it2] = bj;
        }
        if (tourLen() >= before && round > 0) break;
      }
      return { order: order, cost: tourLen() };
    }

    // one floor at a time, floor 1 first, then the upper floors; the walk inside each floor is optimised
    var floorsHere = [];
    live.forEach(function (i) { var f = floorOfNode(itemNode(i)); if (floorsHere.indexOf(f) < 0) floorsHere.push(f); });
    function perms(arr) {
      if (arr.length <= 1) return [arr];
      var res = [];
      arr.forEach(function (x, i) { perms(arr.slice(0, i).concat(arr.slice(i + 1))).forEach(function (r) { res.push([x].concat(r)); }); });
      return res;
    }
    var dropFloor = floorOfNode(di), best = null;
    // the picker always starts on floor 1: floors are taken in ascending order
    floorsHere.sort(function (a, b) { return gr.F[a].f.id < gr.F[b].f.id ? -1 : gr.F[a].f.id > gr.F[b].f.id ? 1 : 0; });
    [floorsHere].forEach(function (pm) {
      var cur = 0, cost = 0, ord = [], okp = true;
      pm.forEach(function (gf, k) {
        var set = live.filter(function (i) { return floorOfNode(itemNode(i)) === gf; });
        var entry = floorOfNode(cur) === gf ? cur : liftIdx[gf];
        var nextFloor = k < pm.length - 1 ? pm[k + 1] : dropFloor;
        var exit = nextFloor === gf ? (doorIdx != null ? doorIdx : di) : liftIdx[gf];
        if (entry == null || exit == null) { okp = false; return; }
        cost += D[cur][entry];
        var r = optimizePath(set, entry, exit);
        cost += r.cost; ord = ord.concat(r.order); cur = exit;
      });
      if (!okp) return;
      if (floorOfNode(cur) !== dropFloor && doorIdx != null) cost += D[cur][doorIdx] + D[doorIdx][di];   // down by lift, then through the door
      else cost += D[cur][di];
      if (!best || cost < best.cost) best = { cost: cost, order: ord };
    });
    var order = best ? best.order : live.slice();

    // walk the final tour again to draw it
    var lastN = order.length ? idx[order[order.length - 1]][choice[order[order.length - 1]]] : 0;
    var via = order.length && doorIdx != null ? [doorIdx] : [];
    var legs = [], total = 0, out = [], path = [0].concat(order.map(function (it) { return idx[it][choice[it]]; }), via, [di]);
    for (var s = 0; s < path.length - 1; s++) {
      var A2 = path[s], B2 = path[s + 1], par = new Int32Array(gr.N).fill(-1), dist2 = dijkstra(gr, nodes[A2].nodes, par);
      var tgt = nodes[B2].nodes, end = tgt[0];
      for (var t2 = 1; t2 < tgt.length; t2++) if (dist2[tgt[t2]] < dist2[end]) end = tgt[t2];
      total += D[A2][B2];
      if (s < order.length) out.push({ key: items[order[s]].key, cand: items[order[s]].cs[choice[order[s]]].c, from: D[A2][B2] / cell });
      // trace back, split where the path changes floor
      var cells = [], n2 = end, srcSet = new Set(nodes[A2].nodes), guard2 = 0;
      while (n2 >= 0 && guard2++ < 200000) { cells.push(n2); if (srcSet.has(n2) && dist2[n2] === 0) break; n2 = par[n2]; }
      cells.reverse();
      var segPts = [], curFloor = cells.length ? gr.floorOf[cells[0]] : 0;
      cells.forEach(function (n3) {
        var fi = gr.floorOf[n3];
        if (fi !== curFloor) { legs.push({ floor: gr.F[curFloor].f.id, pts: segPts }); segPts = []; curFloor = fi; }
        var o = gr.F[fi], rel = n3 - o.off, y = (rel / o.W) | 0, x = rel - y * o.W;
        segPts.push([o.x0 + (x + 0.5) * G, o.y0 + (y + 0.5) * G]);
      });
      if (segPts.length) legs.push({ floor: gr.F[curFloor].f.id, pts: simplify(segPts) });
    }
    // reorder "out" by tour (already in order); metres from the previous stop
    return { ok: true, order: out, total: total / cell, legs: legs, unreachable: unreachable, start: nodeXY(gr, gr.start), drop: nodeXY(gr, gr.drop) };
  }
  function nodeXY(gr, n) { var o = gr.F[gr.floorOf[n]], rel = n - o.off, y = (rel / o.W) | 0, x = rel - y * o.W; return { floor: o.f.id, x: o.x0 + (x + 0.5) * G, y: o.y0 + (y + 0.5) * G }; }
  // drop points that lie on a straight line
  function simplify(pts) {
    if (pts.length < 3) return pts;
    var out = [pts[0]];
    for (var i = 1; i < pts.length - 1; i++) {
      var a = out[out.length - 1], b = pts[i], c = pts[i + 1];
      if ((b[0] - a[0]) * (c[1] - b[1]) !== (b[1] - a[1]) * (c[0] - b[0])) out.push(b);
    }
    out.push(pts[pts.length - 1]); return out;
  }

  PWH.route = { build: build, plan: plan, G: G };
})(window);
