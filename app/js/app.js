/* PWH app shell + Module 1 (data management). */
(function (g) {
  var PWH = g.PWH, t = PWH.t;
  var TYPES = ['bom', 'matloc', 'monthly', 'daily'];
  var PREVIEW = {
    bom: { cols: ['c.src', 'c.parent', 'c.comp', 'c.text', 'c.plant', 'c.qty', 'c.unit'], code: [1, 2], num: [5] },
    matloc: { cols: ['c.stype', 'c.bin', 'c.material', 'c.plant', 'c.stock'], code: [1, 2], num: [4] },
    monthly: { cols: ['c.lead', 'c.plant', 'c.order', 'c.material', 'c.desc', 'c.qty', 'c.delivered', 'c.confirmed', 'c.unit', 'c.start', 'c.finish', 'c.status'], code: [0, 2, 3], num: [5, 6, 7] },
    daily: { cols: ['c.job', 'c.product', 'c.desc', 'c.qty', 'c.line', 'c.finish'], code: [0, 1], num: [3] }
  };
  var PAGE = 50;

  var S = {
    module: 1, tab: 'bom', files: [], sel: {}, checks: null, checking: false,
    settings: { plantOrder: ['5212', '5213'] }, msgs: [], confirm: null, confirmUse: null, ask: null, showAll: {}, openList: {},
    pv: { id: null, rows: null, lc: null, filter: '', page: 0, view: null }, mf: '', mrows: true, v1: 'files', dt: 'sum', ul: {}
  };
  try { var v1s = localStorage.getItem('pwh-v1'); if (['files', 'checks', 'lookup'].indexOf(v1s) >= 0) S.v1 = v1s; } catch (e) {}
  try { var mfs = localStorage.getItem('pwh-mf'); if (/^\d{4}-\d{2}$/.test(mfs || '')) S.mf = mfs; } catch (e) {}
  try { var saved = localStorage.getItem('pwh-tab'); if (TYPES.indexOf(saved) >= 0) S.tab = saved; } catch (e) {}

  // ---------- helpers ----------
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function nf(n) { return typeof n === 'number' ? n.toLocaleString('en-US', { maximumFractionDigits: 2 }) : esc(n); }
  function p2(n) { return (n < 10 ? '0' : '') + n; }
  function fmtDT(ms) { var d = new Date(ms); return p2(d.getDate()) + '/' + p2(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + p2(d.getHours()) + ':' + p2(d.getMinutes()); }
  function fmtDate(iso) { return iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4) : ''; }
  function fmtMonth(m) { return m ? m.slice(5, 7) + '/' + m.slice(0, 4) : ''; }
  function $(s, r) { return (r || document).querySelector(s); }
  function keyOf(f) { return f.type === 'bom' || f.type === 'matloc' ? f.type : f.type + ':' + (f.planDate || f.month); }
  function keyLabel(f) { return f.type === 'daily' ? fmtDate(f.planDate) : f.type === 'monthly' ? fmtMonth(f.month) : t('tab.' + f.type); }
  var IGNORED_ISSUES = { row_date_differs: 1, date_missing: 1, rows_other_month: 1 };
  function issuesOf(f) { return (f.issues || []).filter(function (i) { return !IGNORED_ISSUES[i.code]; }); }
  function fileStatus(f) {
    var lv = issuesOf(f).map(function (i) { return i.level; });
    return lv.indexOf('error') >= 0 ? 'error' : lv.indexOf('warning') >= 0 ? 'warn' : 'ok';
  }

  // For every file: is it the one in use for its key? The newest upload wins, unless an older one was
  // made current again with "use this version" (activatedAt).
  function stamp(f) { return f.activatedAt || f.uploadedAt; }
  function usage() {
    var best = {};
    S.files.forEach(function (f) { var k = keyOf(f); if (!best[k] || stamp(f) > stamp(best[k])) best[k] = f; });
    var map = {}; S.files.forEach(function (f) { map[f.id] = best[keyOf(f)].id === f.id; });
    return map;
  }
  function filesOf(type) {
    return S.files.filter(function (f) { return f.type === type; }).sort(function (a, b) {
      if (type === 'daily' && a.planDate !== b.planDate) return a.planDate < b.planDate ? 1 : -1;
      if (type === 'monthly' && a.month !== b.month) return a.month < b.month ? 1 : -1;
      return stamp(b) - stamp(a);
    });
  }

  // ---------- loading ----------
  // ---------- month filter (applies to every tab) ----------
  function ym(ms) { var d = new Date(ms); return d.getFullYear() + '-' + p2(d.getMonth() + 1); }
  function fileMonth(f) { return f.type === 'daily' ? String(f.planDate || '').slice(0, 7) : f.type === 'monthly' ? (f.month || '') : ym(f.uploadedAt); }
  function monthName(m) {
    if (!m) return '';
    try { return new Date(+m.slice(0, 4), +m.slice(5, 7) - 1, 1).toLocaleDateString(PWH.getLang() === 'th' ? 'th-TH-u-ca-gregory' : 'en-GB', { month: 'long', year: 'numeric' }); } catch (e) { return fmtMonth(m); }
  }
  function monthList() {
    var set = {}; set[ym(Date.now())] = 1;
    S.files.forEach(function (f) { var m = fileMonth(f); if (m) set[m] = 1; });
    if (S.mf) set[S.mf] = 1;
    return Object.keys(set).sort().reverse();
  }
  function visibleFiles(type) { var fl = filesOf(type); return S.mf ? fl.filter(function (f) { return fileMonth(f) === S.mf; }) : fl; }
  function setMonth(m) {
    S.mf = m || ''; try { localStorage.setItem('pwh-mf', S.mf); } catch (e) {}
    S.pv.view = null; S.pv.page = 0; S.confirm = null; S.confirmUse = null;
    renderTabs(); renderPanel();
  }
  function renderMonthBar() {
    var el = $('#mbar'); if (!el) return;
    var list = monthList(), i = list.indexOf(S.mf);
    var opts = '<option value=""' + (S.mf ? '' : ' selected') + '>' + esc(t('mf.all')) + '</option>' + list.map(function (m) { return '<option value="' + m + '"' + (m === S.mf ? ' selected' : '') + '>' + esc(monthName(m)) + '</option>'; }).join('');
    var older = S.mf ? list[i + 1] : list[0], newer = S.mf && i > 0 ? list[i - 1] : null;
    el.innerHTML = '<span class="mflbl">' + esc(t('mf.label')) + '</span>' +
      '<button class="btn" data-act="mf" data-v="' + (older || '') + '"' + (older ? '' : ' disabled') + ' aria-label="' + esc(t('mf.prev')) + '">‹</button>' +
      '<select id="mfSel" aria-label="' + esc(t('mf.label')) + '">' + opts + '</select>' +
      '<button class="btn" data-act="mf" data-v="' + (newer || '') + '"' + (newer ? '' : ' disabled') + ' aria-label="' + esc(t('mf.next')) + '">›</button>' +
      (S.mf ? '<button class="btn" data-act="mf" data-v="">' + esc(t('mf.clear')) + '</button>' : '') +
      '<span class="mfnote">' + esc(t(S.mf ? 'mf.note_on' : 'mf.note_off', { m: monthName(S.mf) })) + '</span>';
    var sel = $('#mfSel'); if (sel) sel.addEventListener('change', function () { setMonth(sel.value); });
  }
  function refreshFiles() {
    return PWH.db.listFiles().then(function (list) {
      S.files = list;
      TYPES.forEach(function (ty) {
        var fl = filesOf(ty);
        if (!S.sel[ty] || !S.files.some(function (f) { return f.id === S.sel[ty]; })) S.sel[ty] = fl.length ? fl[0].id : null;
      });
    });
  }
  var checkTimer = null;
  function scheduleChecks() { clearTimeout(checkTimer); checkTimer = setTimeout(runChecks, 50); }
  function runChecks() {
    var use = usage();
    var act = function (ty) { return filesOf(ty).filter(function (f) { return use[f.id]; }); };
    var bom = act('bom')[0], ml = act('matloc')[0], daily = act('daily'), monthly = act('monthly');
    S.checking = true; renderReadiness();
    var jobs = [
      bom ? PWH.db.getRows(bom.id) : Promise.resolve(null),
      ml ? PWH.db.getRows(ml.id) : Promise.resolve(null),
      Promise.all(daily.map(function (f) { return PWH.db.getRows(f.id).then(function (r) { return { date: f.planDate, rows: r }; }); })),
      Promise.all(monthly.map(function (f) { return PWH.db.getRows(f.id).then(function (r) { return { month: f.month, rows: r }; }); })),
      PWH.db.getMeta('layout').catch(function () { return null; })
    ];
    return Promise.all(jobs).then(function (res) {
      S.hasLayout = !!res[4];
      S.checks = PWH.checks.run({ bom: res[0], matloc: res[1], daily: res[2], monthly: res[3], layout: res[4] || null }, { plantOrder: S.settings.plantOrder });
      S.checking = false; renderReadiness(); if (PWH.lookup) PWH.lookup.refresh(); if (PWH.m3) PWH.m3.refresh(); if (PWH.m4) PWH.m4.refresh(); if (PWH.m6) PWH.m6.refresh();
    }).catch(function (e) { S.checking = false; S.checks = null; console.error(e); renderReadiness(); });
  }

  // ---------- upload ----------
  function say(kind, text) {
    var m = { id: Math.random(), kind: kind, text: text }; S.msgs.push(m); renderMsgs();
    if (kind === 'ok' || kind === 'note') setTimeout(function () { clearMsg(m); }, 8000);   // successes fade out; problems stay until dismissed
    return m;
  }
  function clearMsg(m) { S.msgs = S.msgs.filter(function (x) { return x !== m; }); renderMsgs(); }
  function tick() { return new Promise(function (r) { setTimeout(r, 30); }); }

  function reasonText(r) { return t(r[0], r[1]); }
  function handleFiles(type, list) {
    if (!PWH.auth.can('data.edit')) return Promise.resolve();
    var files = Array.prototype.slice.call(list).filter(function (f) { return /\.xlsx?$/i.test(f.name); });
    var chain = Promise.resolve();
    files.forEach(function (file) { chain = chain.then(function () { return handleOne(type, file); }); });
    return chain.then(function () { return refreshFiles(); }).then(function () { renderTabs(); renderPanel(); renderReadiness(); scheduleChecks(); });
  }
  // Ask the admin for the plan date (daily) or month (monthly). The file name is never used.
  function askFor(type, name, suggestion) {
    return new Promise(function (resolve) { S.ask = { type: type, name: name, value: suggestion || '', suggestion: suggestion || '', err: '', resolve: resolve }; renderAsk(); });
  }
  function answerAsk(ok) {
    var a = S.ask; if (!a) return;
    var inp = $('#askVal'), v = inp ? inp.value : a.value;
    if (ok) {
      var good = a.type === 'daily' ? /^\d{4}-\d{2}-\d{2}$/.test(v) : /^\d{4}-\d{2}$/.test(v);
      if (!good) { a.value = v; a.err = t(a.type === 'daily' ? 'ask.invalid_date' : 'ask.invalid_month'); renderAsk(); return; }
    }
    S.ask = null; renderAsk(); a.resolve(ok ? v : null);
  }
  var STOP = {};
  function handleOne(type, file) {
    var busy = say('busy', t('upload.reading', { name: file.name }));
    var buffer, wb, res, meta, prev = null;
    function reject(reason) { clearMsg(busy); say('bad', t('upload.rejected', { name: file.name, reason: reason })); return STOP; }
    return tick().then(function () { return file.arrayBuffer(); }).then(function (buf) {
      buffer = buf;
      return tick();
    }).then(function () {
      try { wb = PWH.parsers.readWorkbook(buffer); } catch (e) { wb = null; }
      if (!wb) return reject(t('upload.readerr'));
      var detected = PWH.parsers.detectType(wb);
      if (!detected) return reject(t('upload.unknown'));
      if (detected !== type) return reject(t('upload.wrongtype', { type: t('tab.' + detected) }));
      if (type !== 'daily' && type !== 'monthly') return {};
      clearMsg(busy);
      return askFor(type, file.name, PWH.parsers.suggest(type, wb)).then(function (v) {
        if (v == null) { say('note', t('ask.cancelled', { name: file.name })); return STOP; }
        busy = say('busy', t('upload.reading', { name: file.name }));
        return type === 'daily' ? { date: v } : { month: v };
      });
    }).then(function (opts) {
      if (opts === STOP) return STOP;
      return tick().then(function () {
        res = PWH.parsers.parse(type, wb, file.name, opts);
        if (!res.ok) return reject(reasonText(res.fatal));
        meta = {
          id: PWH.db.newId(), type: type, name: file.name, size: file.size, uploadedAt: Date.now(),
          uploadedBy: (PWH.user && PWH.user.email) || '',
          rows: res.rows.length, planDate: res.meta.planDate || null, month: res.meta.month || null,
          issues: res.issues, stats: res.stats
        };
        var use = usage();
        prev = S.files.filter(function (f) { return keyOf(f) === keyOf(meta) && use[f.id]; })[0] || null;
        return prev ? PWH.db.getRows(prev.id) : null;
      });
    }).then(function (prevRows) {
      if (prevRows === STOP) return STOP;
      if (prev && prevRows) { var c = PWH.changes.compute(type, prevRows, res.rows); c.prevName = prev.name; c.prevAt = stamp(prev); meta.changes = c; }
      busy.text = t('upload.saving', { name: file.name }); renderMsgs();
      return PWH.db.saveFile(meta, res.rows, buffer).then(function () {
        S.files.push(meta); S.sel[type] = meta.id;
        var text = prev ? t('upload.ok_replace', { name: file.name, rows: nf(meta.rows), key: keyLabel(meta) }) : t('upload.ok', { name: file.name, rows: nf(meta.rows) });
        clearMsg(busy); say('ok', text);
      });
    }).catch(function (e) {
      console.error(e); clearMsg(busy); say('bad', t('upload.rejected', { name: file.name, reason: String(e && e.message || e) }));
    });
  }

  // ---------- render: shell ----------
  var ICON = {
    9: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.8c2 .7 3.2 2.4 3.6 5.2"/>',
    1: '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v12c0 1.7 3.1 3 7 3s7-1.3 7-3V6"/><path d="M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3"/>',
    2: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 9v12M15 3v6"/>',
    3: '<circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h6a3 3 0 0 0 0-6h-4a3 3 0 0 1 0-6h6"/>',
    4: '<path d="M4 20V11M10 20V4M16 20v-7M2 20h20"/>',
    5: '<path d="M4 6h8M18 6h2M4 12h2M12 12h8M4 18h10M20 18h0"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
    6: '<rect x="3" y="3" width="8" height="10" rx="1"/><rect x="13" y="3" width="8" height="6" rx="1"/><rect x="13" y="11" width="8" height="10" rx="1"/><rect x="3" y="15" width="8" height="6" rx="1"/>'
  };
  function renderShell() {
    var lang = PWH.getLang();
    var nav = '';
    for (var i = 1; i <= 6; i++) {
      nav += '<button class="rb" data-act="module" data-m="' + i + '"' + (S.module === i ? ' aria-current="page"' : '') + '><svg viewBox="0 0 24 24" aria-hidden="true">' + ICON[i] + '</svg><span>' + esc(t('nav.m' + i)) + '</span>' + '' + '</button>';
    }
    if (PWH.auth.can('users.manage')) nav += '<span class="rsep" aria-hidden="true"></span><button class="rb" data-act="module" data-m="9"' + (S.module === 9 ? ' aria-current="page"' : '') + '><svg viewBox="0 0 24 24" aria-hidden="true">' + ICON[9] + '</svg><span>' + esc(t('nav.users')) + '</span></button>';
    $('#app').innerHTML =
      '<div class="shell"><nav class="rail" aria-label="Modules"><div class="logo">' + esc(t('app.sub')) + '</div>' + nav + '</nav>' +
      '<div class="main"><header class="topbar"><div class="pt">' + esc(t('app.name')) + '</div><span class="sp"></span><span id="topstat"></span>' +
      '<div class="lang" role="group" aria-label="Language"><button data-act="lang" data-l="th" aria-pressed="' + (lang === 'th') + '">TH</button><button data-act="lang" data-l="en" aria-pressed="' + (lang === 'en') + '">EN</button></div><span id="um">' + userMenu() + '</span></header>' +
      (PWH.db.isPersistent() ? '' : '<div class="banner" style="margin:12px 24px 0">' + esc(t('nav.storage_mem')) + '</div>') +
      '<div id="view"></div></div></div>';
    renderTop();
    renderView();
  }
  function userMenu() {
    var me = PWH.auth.me(); if (!me) return '';
    return '<details class="um"><summary aria-label="' + esc(t('au.menu')) + '"><span class="uav" aria-hidden="true">' + esc((me.name || me.email).charAt(0).toUpperCase()) + '</span><span class="umn"><b>' + esc(me.name) + '</b><span>' + esc(t('au.role.' + me.role)) + '</span></span></summary>' +
      '<div class="ump"><div class="umi"><b>' + esc(me.name) + '</b><span class="sub2">' + esc(me.email) + '</span><span class="sub2">' + esc(t('au.idle')) + '</span></div><button class="btn" data-act="logout">' + esc(t('au.logout')) + '</button></div></details>';
  }
  function refreshUser() { var el = $('#um'); if (el) el.innerHTML = userMenu(); }
  // top bar chip: is the data complete, and how fresh is it
  function renderTop() {
    var el = $('#topstat'); if (!el) return;
    var use = usage(), inUse = S.files.filter(function (f) { return use[f.id]; });
    if (!inUse.length) { el.innerHTML = '<span class="asof">' + esc(t('asof.none')) + '</span>'; return; }
    var have = function (ty) { return inUse.some(function (f) { return f.type === ty; }); };
    var miss = [];
    if (!have('bom')) miss.push(t('need.bom'));
    if (!have('matloc')) miss.push(t('need.matloc'));
    if (!S.hasLayout) miss.push(t('need.layout'));
    var last = inUse.reduce(function (a, f) { return Math.max(a, stamp(f)); }, 0);
    el.innerHTML = '<span class="chip ' + (miss.length ? 'warn' : 'ok') + '">' + (miss.length ? '! ' + esc(t('topbar.missing', { list: miss.join(', ') })) : '&#10003; ' + esc(t('topbar.ready'))) + '</span> <span class="asof">' + esc(t('ready.asof', { when: fmtDT(last) })) + '</span>';
  }
  function renderView() {
    var v = $('#view');
    v.className = S.module === 3 ? 'wide m3view' : ''; document.documentElement.classList.toggle('pwh-m3', S.module === 3);
    if (S.module === 2) { PWH.m2.mount(v); return; }
    if (S.module === 3) { PWH.m3.mount(v); return; }
    if (S.module === 4) { PWH.m4.mount(v); return; }
    if (S.module === 5) { PWH.m5.mount(v); return; }
    if (S.module === 6) { PWH.m6.mount(v); return; }
    if (S.module === 9) { if (PWH.auth.can('users.manage')) { PWH.users.mount(v); return; } S.module = 1; }
    if (S.module !== 1) {
      v.innerHTML = '<div class="ph"><div class="ph-l"><div class="cap">' + esc(t('mod.cap', { n: S.module })) + '</div><h1>' + esc(t('nav.m' + S.module)) + '</h1></div></div><div class="panel soonbox"><h2>' + esc(t('soon.title')) + '</h2><p>' + esc(t('soon.body')) + '</p><p class="sub">' + esc(t('soon.m' + S.module)) + '</p></div>';
      return;
    }
    var body = S.v1 === 'checks' ? '<section class="panel" id="checks"></section>'
      : S.v1 === 'lookup' ? '<section class="panel" id="lookup"></section>'
      : '<div class="tiles4" role="tablist" id="tabs"></div><div id="panel"></div>';
    v.innerHTML = '<div class="ph"><div class="ph-l"><div class="cap">' + esc(t('m1.cap')) + '</div><h1>' + esc(t('m1.title')) + '</h1><p class="lede">' + esc(t('m1.intro2')) + '</p></div>' +
      '<div class="ph-r"><div class="mbar" id="mbar"></div></div></div>' +
      (PWH.auth.can('data.edit') ? '' : PWH.users.roNote('au.ro.m1')) + '<div class="vnav" role="tablist" id="v1nav"></div><div id="msgs" class="msgs"></div><div id="ask"></div>' + body;
    renderV1Nav(); renderReadiness(); renderMsgs(); renderAsk(); renderPanel();
    if (S.v1 === 'lookup' && PWH.lookup) PWH.lookup.mount($('#lookup'));
  }
  function renderV1Nav() {
    var el = $('#v1nav'); if (!el) return;
    var bad = S.checks && S.checks.items ? S.checks.items.filter(function (c) { return c.level === 'warning' || c.level === 'error'; }).length : 0;
    var items = [['files', t('v1.files'), ''], ['checks', t('v1.checks'), bad ? '<span class="cnt warn">' + bad + '</span>' : ''], ['lookup', t('v1.lookup'), '']];
    el.innerHTML = items.map(function (i) { return '<button role="tab" data-act="v1" data-v="' + i[0] + '" aria-selected="' + (S.v1 === i[0]) + '">' + esc(i[1]) + i[2] + '</button>'; }).join('');
    var mb = $('#mbar'); if (mb) mb.parentNode.hidden = S.v1 !== 'files';
  }
  function renderAsk() {
    var el = $('#ask'); if (!el) return;
    var a = S.ask;
    if (!a) { el.innerHTML = ''; return; }
    var isD = a.type === 'daily';
    el.innerHTML = '<div class="ask" role="dialog" aria-label="' + esc(t(isD ? 'ask.date.title' : 'ask.month.title', { name: a.name })) + '"><b>' + esc(t(isD ? 'ask.date.title' : 'ask.month.title', { name: a.name })) + '</b>' +
      '<div class="hint">' + esc(t(isD ? 'ask.date.help' : 'ask.month.help')) + '</div>' +
      '<div class="row"><input id="askVal" type="' + (isD ? 'date' : 'month') + '" value="' + esc(a.value) + '">' +
      '<button class="btn primary" data-act="ask-go">' + esc(t('ask.go')) + '</button><button class="btn" data-act="ask-cancel">' + esc(t('ask.cancel')) + '</button>' +
      (a.suggestion ? '<span class="hint">' + esc(t('ask.suggest', { value: isD ? fmtDate(a.suggestion) : fmtMonth(a.suggestion) })) + '</span>' : '') + '</div>' +
      (a.err ? '<div class="hint" style="color:var(--err)">' + esc(a.err) + '</div>' : '') + '</div>';
    var inp = $('#askVal'); if (inp) inp.focus();
  }

  // ---------- render: readiness ----------
  // Top strip: one tile per file kind (version in use, date, rows, who uploaded it).
  function renderReadiness() {
    renderTop(); renderTabs(); renderV1Nav(); renderChecks();
  }
  // Cross-file checks, plant-order setting and what each module still needs. Every check lists exactly what is missing.
  function renderChecks() {
    var el = $('#checks'); if (!el) return;
    var use = usage();
    var body;
    if (S.checking) body = '<p class="sub">' + esc(t('ready.checking')) + '</p>';
    else if (!S.checks) body = '';
    else if (!S.checks.have.bom || !S.checks.have.matloc) body = '<p class="sub">' + esc(t('ready.need_more')) + '</p>';
    else body = '<div class="checks">' + S.checks.items.map(checkRow).join('') + '</div>';
    var order = S.settings.plantOrder;
    var settings = '<div class="row-set"><label for="plantOrder">' + esc(t('ready.settings')) + '</label><select id="plantOrder" data-act="plant"' + (PWH.auth.can('data.edit') ? '' : ' disabled') + '><option value="5212,5213"' + (order[0] === '5212' ? ' selected' : '') + '>5212 → 5213</option><option value="5213,5212"' + (order[0] === '5213' ? ' selected' : '') + '>5213 → 5212</option></select><span class="sub" style="margin:0">' + esc(t('ready.settings_help')) + '</span></div>';
    var have = { bom: filesOf('bom').some(function (f) { return use[f.id]; }), matloc: filesOf('matloc').some(function (f) { return use[f.id]; }),
      plan: filesOf('daily').concat(filesOf('monthly')).some(function (f) { return use[f.id]; }) };
    var NEEDS = { 2: ['matloc', 'layout'], 3: ['bom', 'matloc', 'layout'], 4: ['bom', 'matloc', 'plan', 'layout'], 5: ['matloc', 'layout'], 6: ['bom', 'matloc', 'plan', 'layout'] };
    var need = '<h2 style="margin-top:20px">' + esc(t('need.title')) + '</h2><p class="sub">' + esc(t('need.sub')) + '</p><div class="needs">' + [2, 3, 4, 5, 6].map(function (m) {
      var miss = NEEDS[m].filter(function (k) { return k !== 'layout' && !have[k]; });
      var chips = NEEDS[m].map(function (k) {
        var cls = k === 'layout' ? (S.hasLayout ? 'ok' : 'pending') : have[k] ? 'ok' : 'warn';
        return '<span class="chip ' + cls + '">' + esc(t('need.' + k)) + '</span>';
      }).join('');
      var state = miss.length ? '<span class="dsc">' + esc(t('need.waiting', { list: miss.map(function (k) { return t('need.' + k); }).join(', ') })) + '</span>' : '<span class="chip ok">' + esc(t('need.ready')) + '</span>';
      return '<div class="need"><b>' + m + ' ' + esc(t('nav.m' + m)) + '</b><div class="chips">' + chips + '</div>' + state + '</div>';
    }).join('') + '</div>';
    el.innerHTML = '<h2>' + esc(t('ready.checks')) + '</h2>' + body + settings + need;
  }
  var LEVEL_ICON = { ok: '✓', info: 'i', warning: '!', error: '✕', pending: '…' };
  var LIST_CAP = 20;
  // table of the exact items behind a cross-file check
  function listTable(c) {
    var list = c.list || []; if (!list.length) return '';
    var hasV = list.some(function (x) { return x.v != null; }), hasW = list.some(function (x) { return x.where; }), hasN = list.some(function (x) { return x.why; });
    var isDate = list.some(function (x) { return x.date; });
    var all = S.showAll['c:' + c.id], shown = all ? list : list.slice(0, LIST_CAP);
    var rows = shown.map(function (x) {
      return '<tr><td class="code">' + esc(x.date ? fmtDate(x.k) : x.k) + '</td>' + (hasV ? '<td class="num">' + nf(x.v) + '</td>' : '') + (hasW ? '<td class="code">' + esc(x.where) + '</td>' : '') + (hasN ? '<td>' + esc(x.why ? t(x.why) : '') + '</td>' : '') + '</tr>';
    }).join('');
    var more = list.length > LIST_CAP ? '<button class="btn" data-act="showall" data-k="c:' + c.id + '">' + esc(all ? t('list.show_less') : t('list.show_all', { n: nf(list.length) })) + '</button>' : '';
    return '<details class="lst" data-id="' + c.id + '"' + (S.openList[c.id] ? ' open' : '') + '><summary>' + esc(t('list.title')) + ' (' + nf(list.length) + ')</summary>' +
      '<div class="tablebox"><table class="loc"><thead><tr><th>' + esc(t(isDate ? 'list.date' : 'list.code')) + '</th>' + (hasV ? '<th class="num">' + esc(t('list.qty')) + '</th>' : '') + (hasW ? '<th>' + esc(t('list.where')) + '</th>' : '') + (hasN ? '<th>' + esc(t('list.note')) + '</th>' : '') + '</tr></thead><tbody>' + rows + '</tbody></table></div>' + more + '</details>';
  }
  function checkRow(c) {
    var level = c.level, key = 'check.' + c.id;
    var title = t(key + '.title');
    var p = { n: nf(c.count), total: nf(c.total), pct: c.pct, order: (c.plantOrder || []).join(' → ') };
    var desc;
    if (c.id === 'plant_both' || c.id === 'ml_multi_bin' || c.id === 'layout_pending') desc = t(key + '.desc', p);
    else desc = t(key + (level === 'ok' ? '.ok' : '.bad'), p);
    var todo = level !== 'ok' && level !== 'pending' && PWH.en[key + '.todo'] ? '<span class="dsc todo"><b>' + esc(t('todo.label')) + ':</b> ' + esc(t(key + '.todo')) + '</span>' : '';
    return '<div class="check"><span class="chip ' + level + '"><span aria-hidden="true">' + (LEVEL_ICON[level] || '') + '</span> ' + esc(t('check.' + level)) + '</span><span class="ttl">' + esc(title) + '</span><span class="dsc">' + esc(desc) + '</span>' + todo + listTable(c) + '</div>';
  }

  // ---------- render: tabs and panel ----------
  function renderTabs() {
    renderMonthBar();
    var el = $('#tabs'); if (!el) return;
    var use = usage(), tiles = '';
    TYPES.forEach(function (ty) {
      var fl = filesOf(ty), act = fl.filter(function (f) { return use[f.id]; }), n = visibleFiles(ty).length;
      var v, sub, dot = 'ok';
      if (!act.length) { v = t('ready.none'); sub = t('tile.empty'); dot = 'empty'; }
      else if (ty === 'daily') {
        var ds = act.map(function (f) { return f.planDate; }).sort();
        v = t('ready.dates', { n: act.length }); sub = fmtDate(ds[0]) + (ds.length > 1 ? ' – ' + fmtDate(ds[ds.length - 1]) : '');
      } else if (ty === 'monthly') {
        v = t('ready.months', { n: act.length }); sub = act.map(function (f) { return fmtMonth(f.month); }).sort().join(', ');
      } else {
        var f0 = act[0];
        v = t('ready.rows', { n: nf(f0.rows) }); sub = fmtDT(stamp(f0));
      }
      var nWarn = act.filter(function (f) { return fileStatus(f) !== 'ok'; }).length;
      if (nWarn) dot = 'warn';
      var state = !act.length ? '' : nWarn ? '<span class="chip warn">' + esc(t('tile.warn', { n: nWarn })) + '</span>' : '<span class="chip ok">' + esc(t('tile.ok2')) + '</span>';
      tiles += '<button class="tile t4" role="tab" data-act="tab" data-t="' + ty + '" aria-selected="' + (S.tab === ty) + '"><div class="k"><span>' + esc(t('tab.' + ty)) + '</span>' + (n ? '<span class="count">' + esc(t('tile.files', { n: n })) + '</span>' : '') + '</div><div class="v">' + esc(v) + '</div><div class="s">' + esc(sub) + '</div><div class="st">' + state + '</div></button>';
    });
    el.innerHTML = tiles;
  }
  function renderMsgs() {
    var el = $('#msgs'); if (!el) return;
    el.innerHTML = S.msgs.map(function (m, i) {
      return '<div class="msg ' + m.kind + '" role="status"><span>' + esc(m.text) + '</span>' + (m.kind === 'busy' ? '' : '<button data-act="dismiss" data-i="' + i + '">' + esc(t('upload.dismiss')) + '</button>') + '</div>';
    }).join('');
  }
  // ---------- render: one column, top to bottom: files -> file details -> (tools) -> raw data ----------
  var SAPH = {
    bom: ['Sheet', 'Material - Key', 'Material Component - Key', 'Material Component - Text', 'Plant - Key', 'Component Quantity', 'Component Unit - Key'],
    matloc: ['Storage Type', 'Storage Bin', 'Material', 'Plant', 'Total Stock'],
    daily: ['JOB No.', 'MAT', 'PRODUCT CODE', 'PLAN', 'U-LINE'],
    monthly: ['Leading order', 'Plant', 'Order', 'Material Number', 'Material description', 'Order quantity (GMEIN)']
  };
  function selFile() { return S.files.filter(function (x) { return x.id === S.sel[S.tab]; })[0] || null; }
  function ensureRows(f, then) {
    if (S.pv.id !== f.id) S.pv = { id: f.id, rows: null, lc: null, filter: '', page: 0, view: null };
    if (S.pv.rows) return;
    var id = f.id;
    PWH.db.getRows(id).then(function (rows) { if (S.pv.id !== id) return; S.pv.rows = rows; S.pv.bad = null; then(); });
  }
  function renderPanel() {
    var el = $('#panel'); if (!el) return;
    var ty = S.tab, fl = visibleFiles(ty), use = usage(), canEd = PWH.auth.can('data.edit');
    if (fl.length && !fl.some(function (f) { return f.id === S.sel[ty]; })) S.sel[ty] = (fl.filter(function (f) { return use[f.id]; })[0] || fl[0]).id;
    if (!fl.length) S.sel[ty] = null;
    var keyCol = ty === 'daily' ? t('col.planDate') : ty === 'monthly' ? t('col.month') : null;
    var rows = fl.map(function (f) {
      var st = fileStatus(f), inUse = use[f.id], confirming = S.confirm === f.id, confirmingUse = S.confirmUse === f.id;
      var acts = '<td><div class="acts">' + (inUse || !canEd ? '' : '<button class="btn sm' + (confirmingUse ? ' confirm' : '') + '" data-act="use" data-id="' + f.id + '">' + esc(t(confirmingUse ? 'act.use_confirm' : 'act.use_this')) + '</button>') + '<button class="btn sm" data-act="download" data-id="' + f.id + '">' + esc(t('act.download')) + '</button>' + (PWH.auth.can('data.edit') ? '<button class="btn sm danger' + (confirming ? ' confirm' : '') + '" data-act="delete" data-id="' + f.id + '">' + esc(t(confirming ? 'act.confirm' : 'act.delete')) + '</button>' : '') + '</div></td>';
      var stChip = '<span class="chip ' + (st === 'ok' ? 'ok' : st === 'warn' ? 'warn' : 'error') + '">' + esc(t('status.' + st)) + '</span>';
      if (ty === 'daily') // compact: date + file name in one cell, status and "replaced" in one cell
        return '<tr class="file ' + (S.sel[ty] === f.id ? 'sel ' : '') + (inUse ? '' : 'old') + '" data-act="select" data-id="' + f.id + '" tabindex="0">' +
          '<td class="name"><span class="fk">' + esc(fmtDate(f.planDate)) + '</span><span class="fn sub2" title="' + esc(f.name) + '">' + esc(f.name) + '</span></td>' +
          '<td class="when">' + fmtDT(f.uploadedAt) + (f.uploadedBy ? '<div class="sub2">' + esc(f.uploadedBy) + '</div>' : '') + '</td><td class="num">' + nf(f.rows) + '</td>' +
          '<td><div class="chips">' + stChip + (inUse ? '' : '<span class="chip pending">' + esc(t('use.replaced')) + '</span>') + '</div></td></tr>';
      return '<tr class="file ' + (S.sel[ty] === f.id ? 'sel ' : '') + (inUse ? '' : 'old') + '" data-act="select" data-id="' + f.id + '" tabindex="0">' +
        (keyCol ? '<td class="fk">' + esc(ty === 'daily' ? fmtDate(f.planDate) : monthName(f.month)) + '</td>' : '') +
        '<td class="name"><span class="fn" title="' + esc(f.name) + '">' + esc(f.name) + '</span></td><td>' + fmtDT(f.uploadedAt) + (f.uploadedBy ? '<div class="sub2">' + esc(f.uploadedBy) + '</div>' : '') + '</td><td class="num">' + nf(f.rows) + '</td>' +
        '<td><span class="chip ' + (st === 'ok' ? 'ok' : st === 'warn' ? 'warn' : 'error') + '">' + esc(t('status.' + st)) + '</span></td>' +
        '<td><span class="chip ' + (inUse ? 'info' : 'pending') + '">' + esc(t(inUse ? 'use.active' : 'use.replaced')) + '</span></td>' +
        '<td><div class="acts">' + (inUse || !canEd ? '' : '<button class="btn sm' + (confirmingUse ? ' confirm' : '') + '" data-act="use" data-id="' + f.id + '">' + esc(t(confirmingUse ? 'act.use_confirm' : 'act.use_this')) + '</button>') + '<button class="btn sm" data-act="download" data-id="' + f.id + '">' + esc(t('act.download')) + '</button>' + (PWH.auth.can('data.edit') ? '<button class="btn sm danger' + (confirming ? ' confirm' : '') + '" data-act="delete" data-id="' + f.id + '">' + esc(t(confirming ? 'act.confirm' : 'act.delete')) + '</button>' : '') + '</div></td></tr>';
    }).join('');
    var head = ty === 'daily' ? '<th>' + esc(keyCol) + '</th><th>' + esc(t('col.uploaded')) + '</th><th class="num">' + esc(t('col.rows')) + '</th><th>' + esc(t('col.status')) + '</th>' : (keyCol ? '<th>' + esc(keyCol) + '</th>' : '') + '<th>' + esc(t('col.name')) + '</th><th>' + esc(t('col.uploaded')) + '</th><th class="num">' + esc(t('col.rows')) + '</th><th>' + esc(t('col.status')) + '</th><th>' + esc(t('col.use')) + '</th><th></th>';
    var list = fl.length ? '<div class="tablebox ftable"><table><thead><tr>' + head + '</tr></thead><tbody>' + rows + '</tbody></table></div>'
      : '<div class="fempty"><p>' + esc(S.mf && filesOf(ty).length ? t('mf.empty', { m: monthName(S.mf) }) : t('files.empty2')) + '</p>' + (S.mf ? curNote(ty, use) : '') + '</div>';
    var files = '<section class="panel fcard" id="drop"><div class="chd"><div class="chd-l"><h2>' + esc(t('files.of', { t: t('tab.' + ty) })) + (S.mf ? ' <span class="chip info">' + esc(monthName(S.mf)) + '</span>' : '') + '</h2><p class="sub">' + esc(t('help.' + ty)) + '</p></div>' +
      (canEd ? '<div class="chd-r"><label class="btn primary upl">' + esc(t('upload.btn')) + '<input type="file" id="fileIn" accept=".xlsx,.xls" multiple hidden></label><span class="sub2">' + esc(t('upload.hint2')) + '</span></div>' : '') + '</div>' +
      (ty === 'daily' ? '<div class="dgrid"><div id="cal"></div><div class="dlist">' + list + '</div></div>' : list) + '</section>';
    el.innerHTML = files + '<section class="panel" id="detail"></section>' + (ty === 'bom' ? '<section class="panel" id="bomq"></section>' : '') + '<section class="panel" id="raw"></section>';
    wireDrop();
    if (ty === 'daily') renderCal();
    renderDetail();
  }

  // daily plan calendar: which days of the month have a plan, click a day to open it
  function calMonth() {
    if (S.mf) return S.mf;
    var f = selFile(); if (f && f.planDate) return f.planDate.slice(0, 7);
    return ym(Date.now());
  }
  function renderCal() {
    var el = $('#cal'); if (!el) return;
    var m = calMonth(), y = +m.slice(0, 4), mo = +m.slice(5, 7), use = usage();
    var by = {}; filesOf('daily').forEach(function (f) { if (use[f.id]) by[f.planDate] = f; });
    var first = new Date(y, mo - 1, 1), days = new Date(y, mo, 0).getDate(), lead = (first.getDay() + 6) % 7;
    var today = (function () { var d = new Date(); return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); })();
    var cells = '', have = 0, miss = 0;
    for (var i = 0; i < lead; i++) cells += '<span class="cd blank"></span>';
    for (var d = 1; d <= days; d++) {
      var iso = m + '-' + p2(d), f = by[iso], wd = (lead + d - 1) % 7, sun = wd === 6;
      var cls = 'cd' + (f ? (fileStatus(f) === 'ok' ? ' has' : ' haswarn') : '') + (sun ? ' sun' : '') + (iso === today ? ' today' : '') + (f && S.sel.daily === f.id ? ' sel' : '');
      if (f) have++; else if (iso <= today && !sun) miss++;
      cells += f ? '<button class="' + cls + '" data-act="select" data-id="' + f.id + '" title="' + esc(fmtDate(iso) + ' · ' + nf(f.rows) + ' JOB · ' + f.name) + '" aria-label="' + esc(fmtDate(iso) + ', ' + nf(f.rows) + ' JOB') + '"><b>' + d + '</b><i aria-hidden="true"></i></button>'
        : '<span class="' + cls + '"><b>' + d + '</b></span>';
    }
    var wk = t('cal.week').split(',').map(function (x) { return '<span class="cw">' + esc(x) + '</span>'; }).join('');
    var list = monthList(), i0 = list.indexOf(m);
    el.innerHTML = '<div class="cal"><div class="calh"><button class="btn sm" data-act="mf" data-v="' + (list[i0 + 1] || prevMonth(m)) + '" aria-label="' + esc(t('mf.prev')) + '">‹</button><b>' + esc(monthName(m)) + '</b><button class="btn sm" data-act="mf" data-v="' + nextMonth(m) + '" aria-label="' + esc(t('mf.next')) + '">›</button></div><div class="calg">' + wk + cells + '</div>' +
      '<div class="calf"><span class="calk"><i class="k has"></i>' + esc(t('cal.has', { n: have })) + '</span><span class="calk" title="' + esc(t('cal.miss_tip')) + '"><i class="k miss"></i>' + esc(t('cal.miss', { n: miss })) + '</span></div></div>';
  }
  function prevMonth(m) { var y = +m.slice(0, 4), mo = +m.slice(5, 7) - 1; if (!mo) { mo = 12; y--; } return y + '-' + p2(mo); }
  function nextMonth(m) { var y = +m.slice(0, 4), mo = +m.slice(5, 7) + 1; if (mo > 12) { mo = 1; y++; } return y + '-' + p2(mo); }

  // U-line summary "ACC (4), AP-LASER (6), ..." -> one tile per line with its JOB count
  function ulineBox(str) {
    if (!str) return '';
    var items = String(str).split(/,\s*(?![^()]*\))/).map(function (x) { var m = /^(.*)\s\((\d+)\)$/.exec(x.trim()); return m ? [m[1], +m[2]] : [x.trim(), null]; }).filter(function (x) { return x[0]; });
    var tot = items.reduce(function (a, x) { return a + (x[1] || 0); }, 0);
    return '<div class="ulbox"><div class="ulh"><b>' + esc(t('ul.title')) + '</b><span class="sub2">' + esc(t('ul.sum', { n: items.length, j: nf(tot) })) + '</span></div><ul class="ulg">' +
      items.map(function (x) { return '<li><span class="uln">' + esc(x[0]) + '</span>' + (x[1] != null ? '<b class="ulc">' + nf(x[1]) + '</b>' : '') + '</li>'; }).join('') + '</ul></div>';
  }
  function fileActs(f) {
    var inUse = usage()[f.id];
    return (inUse || !PWH.auth.can('data.edit') ? '' : '<button class="btn sm' + (S.confirmUse === f.id ? ' confirm' : '') + '" data-act="use" data-id="' + f.id + '">' + esc(t(S.confirmUse === f.id ? 'act.use_confirm' : 'act.use_this')) + '</button>') +
      '<button class="btn sm" data-act="download" data-id="' + f.id + '">' + esc(t('act.download')) + '</button>' + (PWH.auth.can('data.edit') ? '<button class="btn sm danger' + (S.confirm === f.id ? ' confirm' : '') + '" data-act="delete" data-id="' + f.id + '">' + esc(t(S.confirm === f.id ? 'act.confirm' : 'act.delete')) + '</button>' : '') + '';
  }
  // file details: facts in one row, check results as a one-line summary that opens, change summary
  function renderDetail() {
    var el = $('#detail'); if (!el) return;
    var f = selFile();
    if (!f) { el.hidden = true; var r0 = $('#raw'); if (r0) r0.hidden = true; var b0 = $('#bomq'); if (b0) b0.hidden = true; return; }
    el.hidden = false;
    var st = fileStatus(f), iss = issuesOf(f);
    var lineStat = null;
    var facts = '<dl class="facts row">' + (f.stats || []).filter(function (s) { if (s[0] === 'stat.lines') { lineStat = s[1]; return false; } return true; }).map(function (s) { return '<div><dt>' + esc(t(s[0])) + '</dt><dd>' + (typeof s[1] === 'number' ? nf(s[1]) : esc(s[1])) + '</dd></div>'; }).join('') + '</dl>' +
      (f.type === 'daily' && f.planDate ? '<div class="ulbox" id="ulbox"></div>' : ulineBox(lineStat));
    var n = { error: 0, warning: 0, info: 0 }; iss.forEach(function (i) { n[i.level] = (n[i.level] || 0) + 1; });
    var parts = []; if (n.error) parts.push(t('sum.err', { n: n.error })); if (n.warning) parts.push(t('sum.warn', { n: n.warning })); if (n.info) parts.push(t('sum.info', { n: n.info }));
    var checks = iss.length
      ? '<details class="isum ' + (n.error ? 'error' : n.warning ? 'warn' : 'info') + '"' + (S.issOpen === f.id ? ' open' : '') + ' data-id="' + f.id + '"><summary><b>' + esc(t('detail.checks')) + ':</b> ' + esc(parts.join(' · ')) + '<span class="more">' + esc(t('sum.open')) + '</span></summary><div class="issues">' + iss.map(function (i) {
        return '<div class="issue"><span class="chip ' + (i.level === 'warning' ? 'warn' : i.level) + '"><span aria-hidden="true">' + (LEVEL_ICON[i.level === 'warning' ? 'warning' : i.level] || '') + '</span> ' + esc(t('level.' + i.level)) + '</span><div>' + esc(t('issue.' + i.code, { n: nf(i.count) })) + (PWH.en['issue.' + i.code + '.todo'] ? '<div class="todo"><b>' + esc(t('todo.label')) + ':</b> ' + esc(t('issue.' + i.code + '.todo')) + '</div>' : '') + issueTable(f, i) + '</div></div>';
      }).join('') + '<p class="sub">' + esc(t('detail.legend')) + '</p></div></details>'
      : '<div class="isum ok"><b>' + esc(t('detail.checks')) + ':</b> ' + esc(t('detail.clean')) + '</div>';
    var who = esc(f.uploadedBy ? t('detail.by', { who: f.uploadedBy, when: fmtDT(f.uploadedAt) }) : t('col.uploaded') + ': ' + fmtDT(f.uploadedAt)) + (f.activatedAt ? ' · ' + esc(t('detail.activated', { when: fmtDT(f.activatedAt) })) : '');
    el.innerHTML = '<div class="chd"><div class="chd-l"><h2 class="dttl" title="' + esc(f.name) + '">' + esc(f.name) + '</h2><p class="sub">' + who + '</p></div>' +
      '<div class="dacts"><span class="chip ' + (st === 'ok' ? 'ok' : st === 'warn' ? 'warn' : 'error') + '">' + esc(t('status.' + st)) + '</span>' + (S.tab === 'daily' ? fileActs(f) : '') + '</div></div>' + facts + checks + '<div class="chg-line">' + changeBox(f) + '</div>';
    ensureRows(f, function () { renderPreview(); renderBomQ(); });
    renderRawShell(f); renderBomQ();
    if (f.type === 'daily' && f.planDate) { if (S.ul.file !== f.id) S.ul = { file: f.id, from: f.planDate, to: f.planDate }; renderUline(); }
  }

  // ---------- JOBs per U-line over a period (agreed 10/11/2026) ----------
  // The plan file in use for each date in the period. JOB = counted once per day it is planned (date + U-line + JOB,
  // the same "round" Modules 4 and 6 count). Product = distinct codes per U-line over the whole period.
  var ulRows = new Map();
  function rowsOf(f) { if (ulRows.has(f.id)) return Promise.resolve(ulRows.get(f.id)); return PWH.db.getRows(f.id).then(function (r) { ulRows.set(f.id, r || []); return r || []; }); }
  function renderUline() {
    var box = $('#ulbox'); if (!box) return;
    var U = S.ul, from = U.from <= U.to ? U.from : U.to, to = U.from <= U.to ? U.to : U.from;
    var files = activeFiles('daily').filter(function (x) { return x.planDate >= from && x.planDate <= to; });
    var nDays = Math.round((Date.parse(to) - Date.parse(from)) / 864e5) + 1, f = selFile();
    var head = '<div class="ulh"><b>' + esc(t('ul.title')) + '</b>' +
      '<label class="ulf"><span>' + esc(t('ul.from')) + '</span><input type="date" id="ulfrom" value="' + esc(from) + '"></label>' +
      '<label class="ulf"><span>' + esc(t('ul.to')) + '</span><input type="date" id="ulto" value="' + esc(to) + '"></label>' +
      (f && (from !== f.planDate || to !== f.planDate) ? '<button type="button" class="btn sm" data-act="ul-day">' + esc(t('ul.day', { d: fmtDate(f.planDate) })) + '</button>' : '') + '</div>';
    box.innerHTML = head + '<p class="sub2 ulwait">' + esc(t('ul.loading')) + '</p>';
    wireUl();
    var id = U.n = (U.n || 0) + 1;
    Promise.all(files.map(function (x) { return rowsOf(x).then(function (r) { return { date: x.planDate, rows: r }; }); })).then(function (days) {
      if (id !== S.ul.n || !document.body.contains(box)) return;
      var by = new Map(), jobs = 0, prods = new Set();
      days.forEach(function (d) {
        var seen = new Set();
        d.rows.forEach(function (r) {
          var job = String(r[0] == null ? '' : r[0]).trim(), prod = String(r[1] == null ? '' : r[1]).trim(), line = String(r[4] == null ? '' : r[4]).trim() || t('ul.noline');
          var L = by.get(line); if (!L) by.set(line, (L = { line: line, jobs: 0, prods: new Set() }));
          if (job && !seen.has(line + '|' + job)) { seen.add(line + '|' + job); L.jobs++; jobs++; }
          if (prod) { L.prods.add(prod); prods.add(prod); }
        });
      });
      var list = Array.from(by.values()).sort(function (a, b) { return a.line < b.line ? -1 : a.line > b.line ? 1 : 0; });
      var sum = t('ul.sum2', { n: list.length, j: nf(jobs), p: nf(prods.size) }) + ' · ' + t('ul.days', { a: files.length, b: nDays });
      box.innerHTML = head + '<p class="sub2 ulsum">' + esc(sum) + '</p>' +
        (list.length ? '<ul class="ulg ulg2">' + list.map(function (L) { return '<li><span class="uln">' + esc(L.line) + '</span><span class="ulv"><b class="ulc">' + nf(L.jobs) + '</b><small>' + esc(t('ul.job')) + '</small><span class="ulp">' + esc(t('ul.prod', { n: nf(L.prods.size) })) + '</span></span></li>'; }).join('') + '</ul>'
          : '<p class="empty-note">' + esc(t('ul.none')) + '</p>');
      wireUl();
    });
  }
  function wireUl() {
    ['#ulfrom', '#ulto'].forEach(function (sel) {
      var el = $(sel); if (!el) return;
      el.addEventListener('change', function () { var a = $('#ulfrom').value, b = $('#ulto').value; if (!a || !b) return; S.ul.from = a; S.ul.to = b; renderUline(); });
    });
  }

  // ---------- BOM search: Product -> first-level Parts (+ Bin, stock); Part -> where it is used ----------
  function bomIndex() {
    var rows = S.pv.rows; if (!rows) return null;
    if (S.pv.bi) return S.pv.bi;
    var down = new Map(), up = new Map(), codes = [];
    rows.forEach(function (r) {
      var d = down.get(r[1]); if (!d) { down.set(r[1], (d = [])); codes.push(r[1]); } d.push(r);
      var u = up.get(r[2]); if (!u) { up.set(r[2], (u = [])); if (!down.has(r[2])) codes.push(r[2]); } u.push(r);
    });
    S.pv.bi = { down: down, up: up, codes: Array.from(new Set(codes)).sort() };
    return S.pv.bi;
  }
  function loadBins() {
    if (S.binsP) return S.binsP;
    var ml = activeFile('matloc'); var key = ml ? ml.id : '';
    if (S.binsFor === key && S.bins) return Promise.resolve(S.bins);
    S.binsP = (ml ? PWH.db.getRows(ml.id) : Promise.resolve([])).then(function (rows) {
      var m = new Map(); (rows || []).forEach(function (r) { if (!r[2]) return; var a = m.get(r[2]); if (!a) m.set(r[2], (a = [])); a.push({ bin: r[1], stock: r[4] }); });
      S.bins = m; S.binsFor = key; S.binsP = null; return m;
    });
    return S.binsP;
  }
  function renderBomQ() {
    var el = $('#bomq'); if (!el) return;
    var f = selFile(); if (!f) { el.hidden = true; return; } el.hidden = false;
    if (!$('#bq')) {
      el.innerHTML = '<div class="chd"><div class="chd-l"><h2>' + esc(t('bq.title')) + '</h2><p class="sub">' + esc(t('bq.help')) + '</p></div></div>' +
        '<div class="bqbar"><input type="search" id="bq" autocomplete="off" placeholder="' + esc(t('bq.ph')) + '" value="' + esc(S.bq || '') + '"></div><div id="bqres"></div>';
    }
    var res = $('#bqres'), bi = bomIndex(), q = String(S.bq || '').trim().toUpperCase();
    if (!bi) { res.innerHTML = '<p class="empty-note">' + esc(t('detail.loading')) + '</p>'; return; }
    if (!q) { res.innerHTML = ''; return; }
    var exact = bi.down.has(q) || bi.up.has(q);
    if (!exact) {
      var hits = bi.codes.filter(function (c) { return c.indexOf(q) >= 0; });
      res.innerHTML = hits.length ? '<p class="sub">' + esc(t('bq.pick', { n: hits.length })) + '</p><div class="bqchips">' + hits.slice(0, 40).map(function (c) { return '<button class="btn sm code" data-act="bqpick" data-v="' + esc(c) + '">' + esc(c) + '</button>'; }).join('') + (hits.length > 40 ? '<span class="sub2">' + esc(t('bq.more', { n: hits.length - 40 })) + '</span>' : '') + '</div>'
        : '<p class="empty-note">' + esc(t('bq.none')) + '</p>';
      return;
    }
    loadBins().then(function (bins) {
      if (String(S.bq || '').trim().toUpperCase() !== q) return;
      var html = '', down = bi.down.get(q) || [], up = bi.up.get(q) || [];
      var name = (up[0] && up[0][3]) || '';
      html += '<div class="bqhead"><span class="code bqcode">' + esc(q) + '</span>' + (name ? '<span class="sub2">' + esc(name) + '</span>' : '') +
        (down.length ? '<span class="chip info">' + esc(t('bq.is_parent', { n: down.length })) + '</span>' : '') + (up.length ? '<span class="chip pending">' + esc(t('bq.is_comp', { n: up.length })) + '</span>' : '') + '</div>';
      if (down.length) {
        var byPlant = {}; down.forEach(function (r) { (byPlant[r[4]] = byPlant[r[4]] || []).push(r); });
        Object.keys(byPlant).sort().forEach(function (pl) {
          var rs = byPlant[pl].slice().sort(function (a, b) { return a[2] < b[2] ? -1 : 1; });
          html += '<h3>' + esc(t('bq.uses', { plant: pl, n: rs.length })) + '</h3><div class="tablebox"><table><thead><tr><th class="num">#</th><th>' + esc(t('bq.c.part')) + '</th><th>' + esc(t('bq.c.name')) + '</th><th class="num">' + esc(t('bq.c.qty')) + '</th><th>' + esc(t('bq.c.unit')) + '</th><th>' + esc(t('bq.c.bin')) + '</th><th class="num">' + esc(t('bq.c.stock')) + '</th></tr></thead><tbody>' +
            rs.map(function (r, i) {
              var b = bins.get(r[2]) || [], sub = bi.down.has(r[2]);
              var binTxt = b.length ? b.map(function (x) { return '<span class="loc">' + esc(x.bin) + '</span>'; }).join('<br>') : '<span class="chip ' + (sub ? 'pending' : 'warn') + '">' + esc(t(sub ? 'bq.subasm' : 'bq.nobin')) + '</span>';
              var stk = b.length ? b.map(function (x) { return nf(x.stock); }).join('<br>') : '';
              return '<tr><td class="num m2no">' + (i + 1) + '</td><td class="code"><button class="lnk code" data-act="bqpick" data-v="' + esc(r[2]) + '">' + esc(r[2]) + '</button></td><td>' + esc(r[3]) + '</td><td class="num">' + nf(r[5]) + '</td><td>' + esc(r[6]) + '</td><td>' + binTxt + '</td><td class="num">' + stk + '</td></tr>';
            }).join('') + '</tbody></table></div>';
        });
      }
      if (up.length) {
        var us = up.slice().sort(function (a, b) { return a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : a[4] < b[4] ? -1 : 1; });
        html += '<h3>' + esc(t('bq.usedin', { n: us.length })) + '</h3><div class="tablebox"><table><thead><tr><th class="num">#</th><th>' + esc(t('bq.c.parent')) + '</th><th>' + esc(t('bq.c.kind')) + '</th><th>' + esc(t('bq.c.plant')) + '</th><th class="num">' + esc(t('bq.c.qty')) + '</th><th>' + esc(t('bq.c.unit')) + '</th></tr></thead><tbody>' +
          us.map(function (r, i) { return '<tr><td class="num m2no">' + (i + 1) + '</td><td class="code"><button class="lnk code" data-act="bqpick" data-v="' + esc(r[1]) + '">' + esc(r[1]) + '</button></td><td>' + esc(r[0] === 'Z' ? t('bq.kind.z') : t('bq.kind.s')) + '</td><td>' + esc(r[4]) + '</td><td class="num">' + nf(r[5]) + '</td><td>' + esc(r[6]) + '</td></tr>'; }).join('') + '</tbody></table></div>';
      }
      res.innerHTML = html;
    });
  }

  // ---------- raw data table: columns the system uses, SAP header names, search, month rows, problem rows ----------
  function rowDateCols() { return null; }   // FINISH (daily) and Start/Finish dates (monthly) are ignored
  function badRows(f) {
    if (S.pv.bad) return S.pv.bad;
    var H = SAPH[f.type], col = {}, rules = [], bad = new Map();
    H.forEach(function (h, i) { col[h] = i; });
    issuesOf(f).forEach(function (is) {
      if (is.level === 'error') return;   // those rows were dropped
      if (is.level === 'info' && is.code !== 'bin_special') return;   // notes, not problems
      (is.samples || []).forEach(function (sm) {
        var ci = col[sm.col]; if (ci == null || sm.val == null || sm.val === '') return;
        var m = String(sm.note || '').match(/^(.*) \((\w+)\)$/);
        rules.push({ ci: ci, val: String(sm.val), code: is.code, extra: (is.code === 'dup_row' && m) ? { 1: m[1], 4: m[2] } : (is.code === 'dup_row_ml' && m) ? { 1: m[1] } : null });
      });
    });
    var byVal = new Map(); rules.forEach(function (r) { var k = r.ci + '|' + r.val; var a = byVal.get(k); if (!a) byVal.set(k, (a = [])); a.push(r); });
    S.pv.rows.forEach(function (row, i) {
      for (var c = 0; c < row.length; c++) {
        var rs = byVal.get(c + '|' + String(row[c])); if (!rs) continue;
        for (var k = 0; k < rs.length; k++) {
          var ex = rs[k].extra, ok = true;
          if (ex) for (var e in ex) if (String(row[e]) !== ex[e]) ok = false;
          if (ok) { var s0 = bad.get(i); if (!s0) bad.set(i, (s0 = {})); s0[c] = rs[k].code; }
        }
      }
    });
    S.pv.bad = bad; return bad;
  }
  function renderRawShell(f) {
    var el = $('#raw'); if (!el) return; el.hidden = false;
    var dc = rowDateCols(f.type);
    var ph = t('raw.ph.' + f.type);
    el.innerHTML = '<div class="chd"><div class="chd-l"><h2>' + esc(t('raw.title')) + '</h2><p class="sub">' + esc(t('raw.help')) + '</p></div></div>' +
      '<div class="rawbar"><input type="search" id="pvFilter" placeholder="' + esc(ph) + '" aria-label="' + esc(ph) + '" value="' + esc(S.pv.id === f.id ? S.pv.filter : '') + '">' +
      (S.mf && dc ? '<label class="tgl"><input type="checkbox" data-act="mrows"' + (S.mrows ? ' checked' : '') + '> ' + esc(t('mf.rows.' + f.type, { m: monthName(S.mf) })) + '</label>' : '') +
      (issuesOf(f).some(function (i) { return i.level === 'warning' || i.code === 'bin_special'; }) ? '<label class="tgl"><input type="checkbox" data-act="onlybad"' + (S.onlyBad ? ' checked' : '') + '> ' + esc(t('raw.onlybad')) + '</label>' : '') +
      '<span class="grow"></span><span id="pvCount" class="sub2"></span></div><div id="pv"></div>';
    renderPreview();
  }
  function renderPreview() {
    var el = $('#pv'); if (!el) return;
    var f = selFile(); if (!f || S.pv.id !== f.id) return;
    if (!S.pv.rows) { el.innerHTML = '<p class="empty-note">' + esc(t('detail.loading')) + '</p>'; return; }
    var cfg = PREVIEW[f.type], H = SAPH[f.type];
    var dc = rowDateCols(f.type), byMonth = !!(S.mf && dc && S.mrows), bad = badRows(f), onlyBad = S.onlyBad && bad.size;
    if (!S.pv.view) {
      var q = S.pv.filter.trim().toLowerCase();
      if (q || byMonth || onlyBad) {
        if (q && !S.pv.lc) S.pv.lc = S.pv.rows.map(function (r) { return r.join('\u0001').toLowerCase(); });
        S.pv.view = [];
        for (var i = 0; i < S.pv.rows.length; i++) {
          if (q && S.pv.lc[i].indexOf(q) < 0) continue;
          if (byMonth && !dc.some(function (c) { return String(S.pv.rows[i][c] || '').slice(0, 7) === S.mf; })) continue;
          if (onlyBad && !bad.has(i)) continue;
          S.pv.view.push(i);
        }
      } else S.pv.view = null;
    }
    var total = S.pv.view ? S.pv.view.length : S.pv.rows.length;
    var pages = Math.max(1, Math.ceil(total / PAGE));
    if (S.pv.page >= pages) S.pv.page = pages - 1;
    var from = S.pv.page * PAGE, to = Math.min(total, from + PAGE), trs = '';
    for (var k = from; k < to; k++) {
      var ri = S.pv.view ? S.pv.view[k] : k, row = S.pv.rows[ri], bm = bad.get(ri);
      trs += '<tr' + (bm ? ' class="badrow"' : '') + '><td class="num rn">' + nf(ri + 1) + '</td>' + H.map(function (c, ci) {
        var v = row[ci]; if (f.type === 'bom' && ci === 0) v = v === 'Z' ? 'ZBOM' : v === 'S' ? 'SBOM' : v;
        var cls = (cfg.num.indexOf(ci) >= 0 ? 'num ' : '') + (cfg.code.indexOf(ci) >= 0 ? 'code ' : '') + (bm && bm[ci] ? 'badcell' : '');
        return '<td class="' + cls + '"' + (bm && bm[ci] ? ' title="' + esc(t('issue.' + bm[ci], { n: '' })) + '"' : '') + '>' + (typeof v === 'number' ? nf(v) : esc(v)) + '</td>';
      }).join('') + '</tr>';
    }
    var cnt = $('#pvCount'); if (cnt) cnt.textContent = t('raw.count', { n: nf(total), t: nf(S.pv.rows.length) }) + (bad.size ? ' · ' + t('raw.badcount', { n: nf(bad.size) }) : '');
    el.innerHTML = '<div class="tablebox rawbox"><table class="preview"><thead><tr><th class="num">' + esc(t('raw.no')) + '</th>' + H.map(function (c, ci) { return '<th' + (cfg.num.indexOf(ci) >= 0 ? ' class="num"' : '') + '>' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>' + (trs || '<tr><td colspan="' + (H.length + 1) + '" class="empty-note">' + esc(t('raw.empty')) + '</td></tr>') + '</tbody></table></div>' +
      '<div class="pager"><button class="btn sm" data-act="prev"' + (S.pv.page === 0 ? ' disabled' : '') + '>' + esc(t('detail.prev')) + '</button><button class="btn sm" data-act="next"' + (S.pv.page >= pages - 1 ? ' disabled' : '') + '>' + esc(t('detail.next')) + '</button><span>' + esc(t('detail.showing', { from: total ? nf(from + 1) : 0, to: nf(to), total: nf(total) })) + '</span></div>';
  }
  function curNote(ty, use) {
    var cur = filesOf(ty).filter(function (f) { return use[f.id]; });
    if (!cur.length || ty === 'daily' || ty === 'monthly') return '';
    return '<p class="sub">' + esc(t('mf.in_use', { name: cur[0].name, m: monthName(fileMonth(cur[0])) })) + '</p>';
  }
  function issueTable(f, i) {
    var sm = (i.samples || []).filter(function (x) { return x; }); if (!sm.length) return '';
    var key = 'i:' + f.id + ':' + i.code, all = S.showAll[key], shown = all ? sm : sm.slice(0, LIST_CAP);
    var hasRow = sm.some(function (x) { return x.row != null; });
    var rows = shown.map(function (x) {
      return '<tr><td>' + esc(x.sheet || '') + '</td>' + (hasRow ? '<td class="num">' + esc(x.row == null ? '' : x.row) + '</td>' : '') + '<td>' + esc(x.col || '') + '</td><td class="v">' + esc(x.val == null ? '' : x.val) + '</td><td>' + esc(x.note || '') + '</td></tr>';
    }).join('');
    var more = sm.length > LIST_CAP ? '<button class="btn" data-act="showall" data-k="' + key + '">' + esc(all ? t('list.show_less') : t('loc.show_all', { n: nf(sm.length) })) + '</button>' : '';
    var lim = i.count > sm.length ? '<p class="limit">' + esc(t('loc.limit', { shown: nf(sm.length), total: nf(i.count) })) + '</p>' : '';
    return '<div class="tablebox"><table class="loc"><thead><tr><th>' + esc(t('loc.sheet')) + '</th>' + (hasRow ? '<th class="num">' + esc(t('loc.row')) + '</th>' : '') + '<th>' + esc(t('loc.col')) + '</th><th>' + esc(t('loc.val')) + '</th><th>' + esc(t('loc.note')) + '</th></tr></thead><tbody>' + rows + '</tbody></table></div>' + more + lim;
  }
  // What changed compared with the version this one replaced
  function changeBox(f) {
    var c = f.changes;
    if (!c) return '<h3>' + esc(t('change.title')) + '</h3><p class="sub">' + esc(t('change.none')) + '</p>';
    var body = c.same ? '<p class="clean">' + esc(t('change.same')) + '</p>' : '<div class="chg">' + c.items.filter(function (x) { return x[1]; }).map(function (x) { return '<div><b>' + nf(x[1]) + '</b><span>' + esc(t(x[0])) + '</span></div>'; }).join('') + '</div>';
    return '<h3>' + esc(t('change.title')) + '</h3><p class="sub">' + esc(t('change.compared', { name: c.prevName, when: fmtDT(c.prevAt) })) + '</p>' + body;
  }

  // ---------- events ----------
  function wireDrop() {
    var d = $('#drop'), inp = $('#fileIn'); if (!d || !inp || !PWH.auth.can('data.edit')) return;
    inp.addEventListener('change', function () { var l = inp.files; handleFiles(S.tab, l).then(function () { inp.value = ''; }); });
    ['dragenter', 'dragover'].forEach(function (ev) { d.addEventListener(ev, function (e) { e.preventDefault(); d.classList.add('over'); }); });
    ['dragleave', 'drop'].forEach(function (ev) { d.addEventListener(ev, function (e) { e.preventDefault(); d.classList.remove('over'); }); });
    d.addEventListener('drop', function (e) { if (e.dataTransfer && e.dataTransfer.files.length) handleFiles(S.tab, e.dataTransfer.files); });
  }
  function setTab(ty) {
    S.tab = ty; S.confirm = null; S.confirmUse = null; try { localStorage.setItem('pwh-tab', ty); } catch (e) {}
    renderTabs(); renderPanel();
  }
  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]'); if (!el) return;
    var act = el.getAttribute('data-act'), id = el.getAttribute('data-id');
    if (el.tagName === 'SELECT') return;
    if (act === 'module') { S.module = +el.getAttribute('data-m'); renderShell(); }
    else if (act === 'logout') { PWH.auth.logout(); }
    else if (act === 'ul-day') { var fd = selFile(); if (fd) { S.ul.from = S.ul.to = fd.planDate; renderUline(); } }
    else if (act === 'lang') { PWH.setLang(el.getAttribute('data-l')); renderShell(); }
    else if (act === 'tab') { if (S.module !== 1 || S.v1 !== 'files') { S.module = 1; S.v1 = 'files'; renderShell(); } setTab(el.getAttribute('data-t')); }
    else if (act === 'v1') { S.v1 = el.getAttribute('data-v'); try { localStorage.setItem('pwh-v1', S.v1); } catch (x) {} renderView(); }
    else if (act === 'dt') { S.dt = el.getAttribute('data-v'); renderDetail(); }
    else if (act === 'mf') { setMonth(el.getAttribute('data-v')); }
    else if (act === 'mrows') { S.mrows = el.checked; S.pv.view = null; S.pv.page = 0; renderPreview(); }
    else if (act === 'onlybad') { S.onlyBad = el.checked; S.pv.view = null; S.pv.page = 0; renderPreview(); }
    else if (act === 'bqpick') { S.bq = el.getAttribute('data-v'); var bqi = $('#bq'); if (bqi) bqi.value = S.bq; renderBomQ(); }
    else if (act === 'dismiss') { S.msgs.splice(+el.getAttribute('data-i'), 1); renderMsgs(); }
    else if (act === 'ask-go') answerAsk(true);
    else if (act === 'ask-cancel') answerAsk(false);
    else if (act === 'showall') { var k = el.getAttribute('data-k'); S.showAll[k] = !S.showAll[k]; if (k.indexOf('c:') === 0) renderChecks(); else renderDetail(); }
    else if (act === 'use') {
      e.stopPropagation(); if (!PWH.auth.can('data.edit')) return;
      if (S.confirmUse !== id) { S.confirmUse = id; renderPanel(); setTimeout(function () { if (S.confirmUse === id) { S.confirmUse = null; renderPanel(); } }, 4000); return; }
      S.confirmUse = null;
      var uf = S.files.filter(function (x) { return x.id === id; })[0];
      PWH.db.updateFile(id, { activatedAt: Date.now() }).then(refreshFiles).then(function () {
        say('ok', t('use.switched', { name: uf.name, key: keyLabel(uf) }));
        renderTabs(); renderPanel(); renderReadiness(); scheduleChecks();
      });
    }
    else if (act === 'select') { if (S.sel[S.tab] !== id) { S.sel[S.tab] = id; S.confirm = null; renderPanel(); } }
    else if (act === 'prev') { S.pv.page = Math.max(0, S.pv.page - 1); renderPreview(); }
    else if (act === 'next') { S.pv.page++; renderPreview(); }
    else if (act === 'download') {
      e.stopPropagation();
      var f = S.files.filter(function (x) { return x.id === id; })[0];
      PWH.db.getBuffer(id).then(function (buf) {
        if (!buf) return;
        var url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
        var a = document.createElement('a'); a.href = url; a.download = f.name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
      });
    }
    else if (act === 'delete') {
      e.stopPropagation(); if (!PWH.auth.can('data.edit')) return;
      if (S.confirm !== id) { S.confirm = id; renderPanel(); setTimeout(function () { if (S.confirm === id) { S.confirm = null; renderPanel(); } }, 4000); return; }
      S.confirm = null;
      PWH.db.deleteFile(id).then(refreshFiles).then(function () { S.pv = { id: null, rows: null, lc: null, filter: '', page: 0, view: null }; renderTabs(); renderPanel(); renderReadiness(); scheduleChecks(); });
    }
  });
  document.addEventListener('toggle', function (e) {
    var d = e.target; if (d && d.classList && d.classList.contains('lst')) S.openList[d.getAttribute('data-id')] = d.open;
    if (d && d.classList && d.classList.contains('isum')) S.issOpen = d.open ? d.getAttribute('data-id') : null;
  }, true);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target && e.target.classList && (e.target.classList.contains('frow') || e.target.classList.contains('file'))) { e.target.click(); return; }
    if (e.target && e.target.id === 'askVal' && e.key === 'Enter') { e.preventDefault(); answerAsk(true); }
    else if (e.target && e.target.id === 'askVal' && e.key === 'Escape') answerAsk(false);
  });
  document.addEventListener('input', function (e) {
    if (e.target.id === 'bq') { S.bq = e.target.value; clearTimeout(S.bqT); S.bqT = setTimeout(renderBomQ, 150); return; }
    if (e.target.id === 'pvFilter') { S.pv.filter = e.target.value; S.pv.page = 0; S.pv.view = null; renderPreview(); }
  });
  document.addEventListener('change', function (e) {
    if (e.target.id === 'plantOrder' && PWH.auth.can('data.edit')) {
      S.settings.plantOrder = e.target.value.split(',');
      PWH.db.setMeta('settings', S.settings).catch(function () {});
      scheduleChecks();
    }
  });

  // ---------- start ----------
  function start() {
    PWH.auth.onSignedOut(function (why) { S.module = 1; S.msgs = []; S.confirm = S.confirmUse = null; S.ask = null; PWH.gate.show('login', why); });
    PWH.auth.ready().then(function (st) { if (st === 'in') enter(); else PWH.gate.show(st, st === 'idle' ? 'idle' : ''); })
      .catch(function (e) { console.error(e); PWH.gate.show('login'); });
  }
  function enter() {
    var boot = PWH.db.getMeta('settings').then(function (s) { if (s && s.plantOrder) S.settings = s; }).catch(function () {});
    boot.then(refreshFiles).then(function () { renderShell(); scheduleChecks(); }).catch(function (e) { console.error(e); renderShell(); });
  }
  function activeRows(type) {
    var use = usage(), f = filesOf(type).filter(function (x) { return use[x.id]; })[0];
    return f ? PWH.db.getRows(f.id) : Promise.resolve(null);
  }
  function activeFiles(type) { var use = usage(); return filesOf(type).filter(function (x) { return use[x.id]; }); }
  function activeFile(type) { var use = usage(); return filesOf(type).filter(function (x) { return use[x.id]; })[0] || null; }
  // open another module from inside one (e.g. the dashboard sends the date range along first)
  function go(m) { S.module = m; renderShell(); window.scrollTo(0, 0); }
  PWH.app = { go: go, start: start, enter: enter, refreshUser: function () { refreshUser(); var r = $('.rail'); if (r && S.module !== 9) renderShell(); }, state: S, activeRows: activeRows, activeFile: activeFile, activeFiles: activeFiles, rerunChecks: scheduleChecks };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})(window);
