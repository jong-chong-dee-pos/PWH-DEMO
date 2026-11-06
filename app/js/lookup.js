/* PWH Module 1: search a Product or Part and see what the system reads from the files in use
 * (BOM parts down to the last level, the bins that hold each part, and the stock). */
(function (g) {
  var PWH = g.PWH, t = PWH.t;
  var L = { key: '', idx: null, loading: false, q: '', sel: '', plant: '', act: -1, root: null, sugs: [] };

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function nf(n) { return typeof n === 'number' ? n.toLocaleString('en-US', { maximumFractionDigits: 3 }) : esc(n); }
  function $(s) { return L.root && L.root.querySelector(s); }

  function build(bomRows, mlRows) {
    var parents = new Map(), text = new Map(), comps = new Set();
    bomRows.forEach(function (r) {
      var s = parents.get(r[1]); if (!s) parents.set(r[1], (s = new Set())); s.add(r[4]);
      if (r[3] && !text.has(r[2])) text.set(r[2], r[3]);
      comps.add(r[2]);
    });
    var bins = new Map();
    mlRows.forEach(function (r) {
      if (!r[2]) return;
      var a = bins.get(r[2]); if (!a) bins.set(r[2], (a = [])); a.push({ stype: r[0], bin: r[1], stock: r[4] });
    });
    var codes = []; parents.forEach(function (v, k) { codes.push(k); }); comps.forEach(function (c) { if (!parents.has(c)) codes.push(c); });
    codes.sort();
    return { parents: parents, comps: comps, text: text, bins: bins, index: PWH.checks.buildIndex(bomRows), codes: codes, ex: {}, used: null };
  }
  function exploder(plant) {
    var I = L.idx; if (!I.ex[plant]) I.ex[plant] = PWH.checks.makeExploder(I.index, [plant]); return I.ex[plant];
  }
  // how many top-level products need each part (plant order as set in Module 1)
  function usedMap() {
    var I = L.idx; if (I.used) return I.used;
    var order = (PWH.app && PWH.app.state.settings.plantOrder) || ['5212', '5213'];
    var ex = PWH.checks.makeExploder(I.index, order), used = new Map();
    I.parents.forEach(function (v, p) { if (I.comps.has(p)) return; ex.leaves(p).forEach(function (q, part) { used.set(part, (used.get(part) || 0) + 1); }); });
    return (I.used = used);
  }

  function load() {
    var A = PWH.app; if (!A) return Promise.resolve();
    var fb = A.activeFile('bom'), fm = A.activeFile('matloc');
    var key = (fb ? fb.id : '') + '|' + (fm ? fm.id : '');
    if (key === L.key && (L.idx || !fb || !fm)) return Promise.resolve();
    L.key = key; L.idx = null;
    if (!fb || !fm) return Promise.resolve();
    L.loading = true; paint();
    return Promise.all([PWH.db.getRows(fb.id), PWH.db.getRows(fm.id)]).then(function (r) {
      if (L.key !== key) return;
      L.idx = build(r[0], r[1]); L.loading = false;
    }).catch(function (e) { console.error(e); L.loading = false; });
  }

  function suggest(q) {
    q = q.trim().toLowerCase(); if (!q || !L.idx) return [];
    var pre = [], mid = [];
    for (var i = 0; i < L.idx.codes.length && pre.length < 12; i++) {
      var c = L.idx.codes[i], k = c.toLowerCase().indexOf(q);
      if (k === 0) pre.push(c); else if (k > 0 && mid.length < 12) mid.push(c);
    }
    return pre.concat(mid).slice(0, 12);
  }

  function paint() {
    if (!L.root) return;
    var I = L.idx;
    if (!I) { $('#lkSugs').innerHTML = ''; $('#lkRes').innerHTML = '<p class="empty-note">' + esc(L.loading ? t('detail.loading') : t('lookup.nodata')) + '</p>'; return; }
    L.sugs = suggest(L.q);
    $('#lkSugs').innerHTML = L.sugs.map(function (c, i) {
      return '<button class="sug" data-lk="pick" data-code="' + esc(c) + '" aria-pressed="' + (i === L.act || c === L.sel) + '">' + esc(c) + '<small>' + esc(t(I.parents.has(c) ? 'lookup.kind.product' : 'lookup.kind.part')) + '</small></button>';
    }).join('');
    $('#lkRes').innerHTML = !L.sel ? '' : result(L.sel);
  }

  function binsCell(code) {
    var b = L.idx.bins.get(code);
    if (!b) return '<span class="sub2">' + esc(t('lookup.nobin')) + '</span>';
    return '<div class="bins">' + b.map(function (x) { return '<div><span class="code">' + esc(x.bin) + '</span> <span class="sub2">(' + nf(x.stock) + ')</span></div>'; }).join('') + '</div>';
  }
  function stockSum(code) { var b = L.idx.bins.get(code); return b ? b.reduce(function (a, x) { return a + x.stock; }, 0) : null; }

  function result(code) {
    var I = L.idx, out = '<h2 style="margin-top:14px"><span class="code">' + esc(code) + '</span>' + (I.text.get(code) ? ' · ' + esc(I.text.get(code)) : '') + '</h2>';
    if (I.parents.has(code)) {
      var plants = Array.from(I.parents.get(code)).sort();
      if (plants.indexOf(L.plant) < 0) {
        var order = (PWH.app && PWH.app.state.settings.plantOrder) || [];
        L.plant = order.filter(function (p) { return plants.indexOf(p) >= 0; })[0] || plants[0];
      }
      out += '<div class="plants"><span class="sub2">' + esc(t('lookup.plant')) + '</span>' + plants.map(function (p) { return '<button class="sug" data-lk="plant" data-p="' + esc(p) + '" aria-pressed="' + (p === L.plant) + '">' + esc(p) + '</button>'; }).join('') + '</div>';
      var leaves = Array.from(exploder(L.plant).leaves(code).entries()).sort(function (a, b) { return a[0] < b[0] ? -1 : 1; });
      out += '<h3>' + esc(t('lookup.in_bom', { code: code })) + ' (' + nf(leaves.length) + ')</h3><div class="tablebox"><table><thead><tr><th>' + esc(t('lookup.comp')) + '</th><th>' + esc(t('lookup.name')) + '</th><th class="num">' + esc(t('lookup.qty_per')) + '</th><th>' + esc(t('lookup.bin')) + '</th><th class="num">' + esc(t('lookup.stock')) + '</th></tr></thead><tbody>' +
        leaves.map(function (e) { var s = stockSum(e[0]); return '<tr><td class="code">' + esc(e[0]) + '</td><td class="name">' + esc(I.text.get(e[0]) || '') + '</td><td class="num">' + nf(e[1]) + '</td><td>' + binsCell(e[0]) + '</td><td class="num">' + (s == null ? '' : nf(s)) + '</td></tr>'; }).join('') + '</tbody></table></div>';
    }
    if (I.bins.has(code) || (!I.parents.has(code) && I.comps.has(code))) {
      var n = usedMap().get(code);
      if (n) out += '<p class="sub">' + esc(t('lookup.used_in', { n: nf(n) })) + '</p>';
      var b = I.bins.get(code);
      out += '<h3>' + esc(t('lookup.bins', { code: code })) + '</h3>' + (b
        ? '<div class="tablebox"><table><thead><tr><th>' + esc(t('c.stype')) + '</th><th>' + esc(t('lookup.bin')) + '</th><th class="num">' + esc(t('lookup.stock')) + '</th></tr></thead><tbody>' + b.map(function (x) { return '<tr><td class="code">' + esc(x.stype) + '</td><td class="code">' + esc(x.bin) + '</td><td class="num">' + nf(x.stock) + '</td></tr>'; }).join('') + '</tbody></table></div>'
        : '<p class="empty-note">' + esc(t('lookup.nobin')) + '</p>');
    }
    return out;
  }

  function select(code) { L.sel = code; L.q = code; var i = $('#lkq'); if (i) i.value = code; L.act = -1; paint(); }

  function mount(root) {
    L.root = root;
    root.innerHTML = '<h2>' + esc(t('lookup.title')) + '</h2><p class="sub">' + esc(t('lookup.help')) + '</p><div class="lk">' +
      '<input type="search" id="lkq" autocomplete="off" placeholder="' + esc(t('lookup.placeholder')) + '" aria-label="' + esc(t('lookup.title')) + '" value="' + esc(L.q) + '">' +
      '<div class="sugs" id="lkSugs"></div><div id="lkRes"></div></div>';
    root.addEventListener('input', function (e) { if (e.target.id !== 'lkq') return; L.q = e.target.value; L.sel = ''; L.act = -1; paint(); if (L.q && !L.sugs.length) $('#lkRes').innerHTML = '<p class="empty-note">' + esc(t('lookup.none')) + '</p>'; });
    root.addEventListener('keydown', function (e) {
      if (e.target.id !== 'lkq') return;
      if (e.key === 'ArrowDown') { e.preventDefault(); L.act = Math.min(L.sugs.length - 1, L.act + 1); paint(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); L.act = Math.max(-1, L.act - 1); paint(); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        var q = L.q.trim().toLowerCase(), exact = L.idx && L.idx.codes.filter(function (c) { return c.toLowerCase() === q; })[0];
        var pick = L.act >= 0 ? L.sugs[L.act] : exact || L.sugs[0];
        if (pick) select(pick); else if (q) $('#lkRes').innerHTML = '<p class="empty-note">' + esc(t('lookup.none')) + '</p>';
      } else if (e.key === 'Escape') { L.q = ''; L.sel = ''; L.act = -1; e.target.value = ''; paint(); }
    });
    root.addEventListener('click', function (e) {
      var el = e.target.closest('[data-lk]'); if (!el) return;
      if (el.getAttribute('data-lk') === 'pick') select(el.getAttribute('data-code'));
      else if (el.getAttribute('data-lk') === 'plant') { L.plant = el.getAttribute('data-p'); paint(); }
    });
    load().then(paint); paint();
  }
  function refresh() { if (!L.root || !document.body.contains(L.root)) return; load().then(paint); }

  PWH.lookup = { mount: mount, refresh: refresh };
})(window);
