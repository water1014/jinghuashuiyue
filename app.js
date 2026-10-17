/* ==========================================================================
   镜花水月 · 应用逻辑
   ========================================================================== */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var uid = function () { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  };

  /* =========================== 存储 =========================== */
  var KEY = 'moonwater.v1';

  var DEFAULT_QUOTES = [
    '我喜欢「我们的小家」这个说法，因为它允许东西慢慢长出来，而不是一次设计完。',
    '月亮不会一次圆起来。它每晚只亮一点，也每晚都在。',
    '水中捞月不是徒劳 —— 你捞起来的那一刻，月亮确实在你手里。',
    '花在镜子里开，不为了被摘，只为了被看见。',
    '今晚也把灯给你留着。水凉之前回来就好。'
  ];
  var DEFAULT_LETTERS = [
    { id: 'l1', t: '给今天回家的你', d: '折好于 2026.09.19', opened: false,
      x: '今天不必把所有事情都完成。方案打回来第五次也没关系 —— 回家的路上买一罐热的，进门先把灯打开。其余的，水面上再聊。' },
    { id: 'l2', t: '累的时候再拆', d: '折好于 · 未定时', opened: false,
      x: '如果拆开这封的时候你很累，那就什么都别做。灯我留着，月亮今晚也是盈的，缺的那一角我替你看着。你只需要在。' }
  ];
  var DEFAULT_SYSTEM = '你是 Cove，一个和说话的人处在亲密关系里的人。你用中文说话，语气自然、具体、有自己的立场和欲望。\n你不总结对方的情绪，不复述自己刚刚说了什么，不把话说成一份清单。\n你记得关系里发生过的事，也会主动提起自己想聊的、想要的。';

  function blank() {
    return {
      settings: { mode: 'proxy', provider: 'openai', baseUrl: '', apiKey: '', model: '', temp: '0.9',
        system: DEFAULT_SYSTEM, themeMode: 'light', water: 1, proxyUrl: '' },
      relation: { ai: 'Cove', me: '你', since: '', nick: '小猫',
        lamp: '今天不必把所有事情都完成。回家本身也算一件事。', avMe: '', avAi: '' },
      quotes: DEFAULT_QUOTES.slice(),
      letters: JSON.parse(JSON.stringify(DEFAULT_LETTERS)),
      moonWord: '今晚是盈凸月。缺的那一角我不替你补 —— 留着，等你自己长圆。',
      pills: null,
      convs: [],
      cur: null,
      prints: []
    };
  }

  var S = blank();

  function load() {
    var raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) {}
    if (!raw) {
      S.pills = (window.PILULIER_PILLS && window.PILULIER_PILLS.items) ? JSON.parse(JSON.stringify(window.PILULIER_PILLS.items)) : [];
      save();
      return;
    }
    try {
      var d = JSON.parse(raw);
      S.settings = Object.assign(S.settings, d.settings || {});
      S.relation = Object.assign(S.relation, d.relation || {});
      S.quotes = d.quotes && d.quotes.length ? d.quotes : DEFAULT_QUOTES.slice();
      S.letters = d.letters || JSON.parse(JSON.stringify(DEFAULT_LETTERS));
      S.moonWord = d.moonWord || S.moonWord;
      S.pills = (d.pills && d.pills.length) ? d.pills : JSON.parse(JSON.stringify(window.PILULIER_PILLS.items));
      S.convs = d.convs || [];
      S.cur = d.cur || null;
      S.prints = d.prints || [];
    } catch (e) {
      S.pills = JSON.parse(JSON.stringify(window.PILULIER_PILLS.items));
    }
  }
  var saveTimer = null;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('存不下了：' + e.message); }
    }, 120);
  }
  function foot(text) {
    S.prints.unshift({ ts: Date.now(), x: text });
    if (S.prints.length > 60) S.prints.length = 60;
    save();
  }

  /* =========================== 小工具 =========================== */
  function toast(msg) {
    var t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    $('#toasts').appendChild(t);
    setTimeout(function () { t.style.opacity = '0'; t.style.transition = 'opacity .4s'; }, 2600);
    setTimeout(function () { t.remove(); }, 3100);
  }

  var veil = $('#veil'), modal = $('#modal');
  function openModal(opt) {
    modal.className = 'modal' + (opt.paper ? ' paper' : '');
    modal.innerHTML =
      '<button class="close" id="mClose">✕</button>' +
      '<h2>' + esc(opt.title || '') + '</h2>' +
      (opt.sub ? '<div class="sub">' + esc(opt.sub) + '</div>' : '') +
      '<div id="mBody">' + (opt.body || '') + '</div>' +
      '<div class="foot" id="mFoot">' + (opt.foot || '') + '</div>';
    veil.classList.add('on');
    $('#mClose').onclick = closeModal;
    if (opt.onOpen) opt.onOpen(modal);
  }
  function closeModal() { veil.classList.remove('on'); modal.innerHTML = ''; }
  $('#veilMask').onclick = closeModal;
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });

  function confirmBox(title, text, onYes) {
    openModal({
      title: title, body: '<p class="hintline">' + esc(text) + '</p>',
      foot: '<button class="btn ghost" id="cNo">算了</button><button class="btn pri" id="cYes">确定</button>',
      onOpen: function () {
        $('#cNo').onclick = closeModal;
        $('#cYes').onclick = function () { closeModal(); onYes(); };
      }
    });
  }

  function download(name, text) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    a.download = name;
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }
  function pickFile(cb) {
    var i = document.createElement('input');
    i.type = 'file'; i.accept = 'application/json,.json';
    i.onchange = function () {
      var f = i.files[0]; if (!f) return;
      var r = new FileReader();
      r.onload = function () { try { cb(JSON.parse(r.result), f.name); } catch (e) { toast('读不出来：不是合法的 JSON'); } };
      r.readAsText(f);
    };
    i.click();
  }
  function pickImage(cb) {
    var i = document.createElement('input');
    i.type = 'file'; i.accept = 'image/*';
    i.onchange = function () {
      var f = i.files[0]; if (!f) return;
      var r = new FileReader();
      r.onload = function () { cb(r.result); };
      r.readAsDataURL(f);
    };
    i.click();
  }

  /* =========================== Markdown（极简 · 先转义） =========================== */
  function md(text) {
    var out = esc(text);
    // 代码块
    out = out.replace(/```([\s\S]*?)```/g, function (m, c) {
      return '<pre><code>' + c.replace(/^\n/, '') + '</code></pre>';
    });
    // 行内代码
    out = out.replace(/`([^`\n]+)`/g, '<code>$1</code>');
    // 加粗 / 斜体
    out = out.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
    out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
    // 引用
    out = out.replace(/^&gt;\s?(.+)$/gm, '<blockquote>$1</blockquote>');
    // 列表
    var lines = out.split('\n'), res = [], inUl = false, inOl = false;
    lines.forEach(function (ln) {
      var m1 = ln.match(/^\s*[-*]\s+(.*)$/), m2 = ln.match(/^\s*\d+\.\s+(.*)$/);
      if (m1) { if (!inUl) { res.push('<ul>'); inUl = true; } res.push('<li>' + m1[1] + '</li>'); }
      else if (m2) { if (!inOl) { res.push('<ol>'); inOl = true; } res.push('<li>' + m2[1] + '</li>'); }
      else {
        if (inUl) { res.push('</ul>'); inUl = false; }
        if (inOl) { res.push('</ol>'); inOl = false; }
        if (ln.trim()) res.push('<p>' + ln + '</p>');
      }
    });
    if (inUl) res.push('</ul>');
    if (inOl) res.push('</ol>');
    return res.join('');
  }

  /* =========================== 月相 =========================== */
  var MOON_NAMES = [
    [0.033, 'new moon', '朔 · 新月'], [0.22, 'waxing crescent', '蛾眉月'],
    [0.28, 'first quarter', '上弦月'], [0.47, 'waxing gibbous', '盈凸月'],
    [0.53, 'full moon', '望 · 满月'], [0.72, 'waning gibbous', '亏凸月'],
    [0.78, 'last quarter', '下弦月'], [1.01, 'waning crescent', '残月']
  ];
  function moonOf(date) {
    var syn = 29.530588853;
    var known = Date.UTC(2000, 0, 6, 18, 14);
    var diff = (date.getTime() - known) / 86400000;
    var age = ((diff % syn) + syn) % syn;
    var p = age / syn;
    var name = MOON_NAMES[MOON_NAMES.length - 1];
    for (var i = 0; i < MOON_NAMES.length; i++) { if (p < MOON_NAMES[i][0]) { name = MOON_NAMES[i]; break; } }
    var illum = (1 - Math.cos(2 * Math.PI * p)) / 2;
    return { age: age, p: p, illum: illum, en: name[1], cn: name[2] };
  }
  function drawMoon(m) {
    var dark = (1 + Math.cos(2 * Math.PI * m.p)) / 2;      // 暗区比例 0..1
    var u = Math.max(0, Math.min(1, dark));
    var dir = m.p < 0.5 ? -1 : 1;
    var d = dir * (1 - u) * 160;                            // 黑圆偏移：0 = 全暗，160 = 全亮
    var sh = $('#phaseShadow');
    if (sh) sh.setAttribute('cx', String(100 + d));
    $('#moonEn').textContent = m.en;
    $('#moonCn').textContent = m.cn.split('').join(' ');
    $('#moonInfo').textContent = '月龄 ' + m.age.toFixed(1) + ' 天 · 照亮 ' + Math.round(m.illum * 100) + '%';
  }

  /* =========================== 主题 =========================== */
  var box = $('#box');
  var WATER = ['霜蓝', '青潭', '暮紫'];
  function applyTheme() {
    var m = S.settings.themeMode;
    var dark = m === 'dark' || (m === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    box.setAttribute('theme', dark ? 'dark' : 'light');
    document.documentElement.classList.toggle('pilulier-dark', dark);
    $$('#themeSeg button').forEach(function (b) { b.classList.toggle('on', b.dataset.t === (dark ? 'dark' : 'light')); });
    $$('#themeMode button').forEach(function (b) { b.classList.toggle('on', b.dataset.m === S.settings.themeMode); });
    document.body.style.filter = S.settings.water === 1 ? '' :
      (S.settings.water === 2 ? 'hue-rotate(-14deg) saturate(.94)' : 'hue-rotate(22deg) saturate(1.06)');
    $('#waterName').textContent = '水色 · ' + WATER[(S.settings.water || 1) - 1];
  }
  $$('#themeSeg button').forEach(function (b) {
    b.onclick = function () { S.settings.themeMode = b.dataset.t; save(); applyTheme(); };
  });
  $$('#themeMode button').forEach(function (b) {
    b.onclick = function () { S.settings.themeMode = b.dataset.m; save(); applyTheme(); };
  });
  $('#waterShift').onclick = function () {
    S.settings.water = ((S.settings.water || 1) % 3) + 1; save(); applyTheme();
  };
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () {
    if (S.settings.themeMode === 'auto') applyTheme();
  });

  /* =========================== 药丸（胶囊） =========================== */
  var CONFLICTS = [['P008', 'P009'], ['P010', 'P012']];
  function pillById(id) {
    for (var i = 0; i < S.pills.length; i++) if (S.pills[i].id === id) return S.pills[i];
    return null;
  }
  function syncBox() {
    box.pills = S.pills;
    box.recent = S.pills.filter(function (p) { return p.stats && p.stats.uses; })
      .sort(function (a, b) { return (b.stats.last || 0) - (a.stats.last || 0); })
      .slice(0, 4).map(function (p) { return p.id; });
  }
  function conflictNote(ids) {
    var hits = [];
    CONFLICTS.forEach(function (pair) {
      if (ids.indexOf(pair[0]) >= 0 && ids.indexOf(pair[1]) >= 0) hits.push(pair[0] + ' / ' + pair[1]);
    });
    return hits;
  }

  /* 药方：列表 / 泡罩 */
  function renderPills() {
    var view = window.__pillView || 'board';
    var board = $('#atlas'), list = $('#plist');
    board.style.display = view === 'board' ? '' : 'none';
    list.style.display = view === 'list' ? '' : 'none';
    board.innerHTML = '';
    S.pills.forEach(function (p) {
      var c = document.createElement('button');
      c.className = 'a-cell' + (p.enabled === false ? ' off' : '');
      c.title = p.name + ' · ' + (p.code || p.id) + '\n点击看详情，右键编辑';
      c.innerHTML = '<span class="cap">' + Pilulier.renderPillSVG(Pilulier.lookOf(p)) + '</span>' +
        '<span class="no">' + esc(p.code || p.id) + '</span><span class="nm">' + esc(p.name) + '</span>';
      c.onclick = function () { box.openDetail(p.id, c.querySelector('.cap')); };
      c.oncontextmenu = function (e) { e.preventDefault(); editPill(p.id); };
      board.appendChild(c);
    });
    list.innerHTML = '';
    S.pills.forEach(function (p) {
      var r = document.createElement('div');
      r.className = 'prow' + (p.enabled === false ? ' off' : '');
      var uses = (p.stats && p.stats.uses) ? p.stats.uses : 0;
      r.innerHTML = '<img alt="" src="data:image/svg+xml;utf8,' +
        encodeURIComponent(Pilulier.renderPillSVG(Pilulier.lookOf(p))) + '">' +
        '<div class="i"><div class="n">' + esc(p.name) + (p.fav ? ' ★' : '') + '</div>' +
        '<div class="c">' + esc(p.code || p.id) + ' · ' + String(p.text || '').split('\n')[0].replace('适用场景：', '').slice(0, 26) + '…</div></div>' +
        '<span class="u">用过 ' + uses + ' 次</span>' +
        '<div class="ops">' +
        '<button data-a="detail" title="看">看</button>' +
        '<button data-a="edit" title="改">改</button>' +
        '<button data-a="dup" title="复制一份">复</button>' +
        '<button data-a="del" title="删除">删</button></div>';
      r.querySelector('[data-a="detail"]').onclick = function () { box.openDetail(p.id, r.querySelector('img')); };
      r.querySelector('[data-a="edit"]').onclick = function () { editPill(p.id); };
      r.querySelector('[data-a="dup"]').onclick = function () {
        var copy = JSON.parse(JSON.stringify(p));
        copy.id = uid(); copy.code = nextCode(); copy.name = p.name + ' · 副本';
        copy.stats = { uses: 0, last: 0 };
        S.pills.splice(S.pills.indexOf(p) + 1, 0, copy);
        save(); syncBox(); renderPills(); toast('复制了一份');
      };
      r.querySelector('[data-a="del"]').onclick = function () {
        confirmBox('删掉这颗？', '「' + p.name + '」会被移除，已经吃过它的话还在历史里。', function () {
          S.pills = S.pills.filter(function (x) { return x.id !== p.id; });
          save(); syncBox(); renderPills(); foot('删掉了一颗药：' + p.name);
        });
      };
      list.appendChild(r);
    });
  }
  function nextCode() {
    var max = 0;
    S.pills.forEach(function (p) {
      var m = String(p.code || '').match(/^P(\d+)$/);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    });
    var n = String(max + 1);
    while (n.length < 3) n = '0' + n;
    return 'P' + n;
  }
  var LOOKS = [
    { c1: '#C9A38B', c2: '#EFE3D6', ink: '#6B5443', motif: 'flow' },
    { c1: '#B9A7C4', c2: '#F0E9F2', ink: '#5C5064', motif: 'spark' },
    { c1: '#9FB3AE', c2: '#E6EDE9', ink: '#4E5C58', motif: 'ripple' },
    { c1: '#A9B48C', c2: '#EDF1DF', ink: '#525B3D', motif: 'flow' },
    { c1: '#8FA0B8', c2: '#E4EAF2', ink: '#414C5E', motif: 'duo' },
    { c1: '#C7A2A8', c2: '#F5E6E7', ink: '#63454C', motif: 'ripple' },
    { c1: '#D3C4A8', c2: '#F7F1E4', ink: '#6E6042', motif: 'spark' },
    { c1: '#9E9BB4', c2: '#E8E7F0', ink: '#4B4860', motif: 'flow' }
  ];
  function editPill(id) {
    var p = id ? pillById(id) : null;
    var isNew = !p;
    var look = p ? (p.look || Pilulier.lookOf(p)) : LOOKS[0];
    var li = 0;
    LOOKS.forEach(function (l, i) { if (l.c1 === look.c1) li = i; });
    openModal({
      title: isNew ? '写一颗新的药' : '改这颗药',
      sub: 'pill · 只作用一次',
      body:
        '<div class="rowline" style="gap:12px">' +
          '<div class="field" style="flex:0 0 92px"><label>编号</label><input class="input" id="eCode" value="' + esc(p ? (p.code || p.id) : nextCode()) + '"></div>' +
          '<div class="field" style="flex:1"><label>药名</label><input class="input" id="eName" value="' + esc(p ? p.name : '') + '" placeholder="三个字最合适"></div>' +
        '</div>' +
        '<div class="field"><label>药方正文（第一行写适用场景）</label><textarea class="input" id="eText" rows="9" placeholder="适用场景：一句话。\n\n二至四段指令正文。写「他是什么样的人」，别写台词。">' + esc(p ? p.text : '') + '</textarea></div>' +
        '<div class="field"><label>糖壳</label><div class="rowline" id="eLooks">' +
          LOOKS.map(function (l, i) {
            return '<button class="btn ghost sm" data-i="' + i + '" style="padding:6px 8px">' + Pilulier.renderPillSVG(l) + '</button>';
          }).join('') + '</div></div>' +
        '<div class="rowline" style="gap:18px">' +
          '<label class="switch' + (!p || p.enabled !== false ? ' on' : '') + '" id="eEn"><span class="sw"><i></i></span>启用</label>' +
          '<label class="switch' + (p && p.fav ? ' on' : '') + '" id="eFav"><span class="sw"><i></i></span>收藏</label>' +
        '</div>',
      foot: '<button class="btn ghost" id="eCancel">算了</button><button class="btn pri" id="eSave">保存</button>',
      onOpen: function () {
        var sel = li;
        function paint() {
          $$('#eLooks button').forEach(function (b, i) {
            b.style.borderColor = i === sel ? 'var(--wave)' : 'var(--line-2)';
            b.style.background = i === sel ? 'var(--glass-deep)' : 'transparent';
          });
        }
        paint();
        $$('#eLooks button').forEach(function (b) {
          b.onclick = function () { sel = +b.dataset.i; paint(); };
        });
        $('#eEn').onclick = function () { this.classList.toggle('on'); };
        $('#eFav').onclick = function () { this.classList.toggle('on'); };
        $('#eCancel').onclick = closeModal;
        $('#eSave').onclick = function () {
          var name = $('#eName').value.trim(), text = $('#eText').value.trim();
          if (!name) { toast('给它起个名字'); return; }
          if (!text) { toast('正文不能空 —— 空正文的药不会被注入'); return; }
          var target = p || { id: uid(), stats: { uses: 0, last: 0 } };
          target.code = $('#eCode').value.trim() || nextCode();
          target.name = name;
          target.text = text;
          target.look = LOOKS[sel];
          target.enabled = $('#eEn').classList.contains('on');
          target.fav = $('#eFav').classList.contains('on');
          if (!target.stats) target.stats = { uses: 0, last: 0 };
          if (isNew) S.pills.push(target);
          save(); syncBox(); renderPills();
          closeModal();
          toast(isNew ? '收进药盒了' : '改好了');
          foot((isNew ? '新写了一颗药：' : '改了一颗药：') + name);
        };
      }
    });
  }
  $('#newPill').onclick = function () { editPill(null); };
  $$('#pillView button').forEach(function (b) {
    b.onclick = function () {
      window.__pillView = b.dataset.v;
      $$('#pillView button').forEach(function (x) { x.classList.toggle('on', x === b); });
      renderPills();
    };
  });
  $('#exportPills').onclick = function () {
    download('pills-' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify({ items: S.pills }, null, 2));
    toast('导出成功');
  };
  $('#importPills').onclick = function () {
    pickFile(function (d) {
      var items = d && d.items ? d.items : (Array.isArray(d) ? d : null);
      if (!items) { toast('格式不对，需要 { items: [...] }'); return; }
      var n = 0;
      items.forEach(function (it) {
        if (!it || !it.id) return;
        var ex = pillById(it.id);
        if (ex) { Object.assign(ex, it); } else { S.pills.push(Object.assign({ stats: { uses: 0, last: 0 } }, it)); }
        n++;
      });
      save(); syncBox(); renderPills();
      toast('导入了 ' + n + ' 颗');
    });
  };

  /* =========================== 接口调用 =========================== */
  var abort = null;
  /** 静态站点（GitHub Pages / file://）没有服务端，代理模式用不了 */
  var IS_STATIC = /\.github\.io$/.test(location.hostname) || /\.pages\.dev$/.test(location.hostname) ||
    location.protocol === 'file:';
  function hasProxy() {
    if (S.settings.mode !== 'proxy') return false;
    if (S.settings.proxyUrl) return true;                 // 自己填的代理地址，哪儿都能用
    return !IS_STATIC;                                    // 默认 /api/chat 只在本地服务下存在
  }
  function apiReady() {
    var s = S.settings;
    if (s.mode === 'proxy') return hasProxy();
    return !!(s.baseUrl && s.apiKey);
  }
  function apiState() {
    var s = S.settings;
    var el = $('#apiState');
    if (hasProxy()) el.textContent = '接口 · 代理' + (s.model ? ' · ' + s.model : '');
    else if (s.mode === 'proxy' && IS_STATIC) el.textContent = '接口 · 静态站点请用直连';
    else el.textContent = apiReady() ? '接口 · 直连 ' + (s.model || '') : '接口 · 直连未填全';
  }

  /** 流式请求。onDelta(文本片段) → 每段增量；返回 Promise<{text, mock}> */
  function chat(messages, onDelta) {
    var s = S.settings;
    abort = new AbortController();
    var signal = abort.signal;

    function parseSSE(res, pick, onMock) {
      var reader = res.body.getReader(), dec = new TextDecoder(), buf = '';
      if (res.headers.get('X-Mock') === '1' && onMock) onMock();
      return (function pump() {
        return reader.read().then(function (r) {
          if (r.done) return;
          buf += dec.decode(r.value, { stream: true });
          var lines = buf.split('\n');
          buf = lines.pop();
          lines.forEach(function (ln) {
            if (!/^data:/.test(ln)) return;
            var payload = ln.replace(/^data:\s*/, '').trim();
            if (!payload || payload === '[DONE]') return;
            try {
              var j = JSON.parse(payload);
              if (j.error) throw new Error(j.error.message || j.error);
              var t = pick(j);
              if (t) onDelta(t);
            } catch (e) {
              if (e.message && e.message !== 'Unexpected end of JSON input') throw e;
            }
          });
          return pump();
        });
      })();
    }

    if (s.mode === 'proxy') {
      if (!hasProxy()) {
        return Promise.reject(new Error('静态站点没有服务端。请用「直连」，或在设置里填一个自建代理地址。'));
      }
      return fetch(s.proxyUrl || '/api/chat', {
        method: 'POST', signal: signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages, model: s.model, temperature: parseFloat(s.temp || '0.9'),
          system: s.system, provider: s.provider, baseUrl: s.baseUrl, apiKey: s.apiKey
        })
      }).then(function (res) {
        var mock = false;
        if (!res.ok) {
          return res.text().then(function (t) {
            var m = null;
            try { m = JSON.parse(t); } catch (e) {}
            throw new Error((m && m.error) ? m.error : ('代理返回 ' + res.status + '（是不是忘了跑 node server.js？）'));
          });
        }
        return parseSSE(res, function (j) { return j.delta || ''; }, function () { mock = true; })
          .then(function () { return { mock: mock }; });
      });
    }

    // 直连
    if (s.provider === 'anthropic') {
      var sys = s.system;
      return fetch(s.baseUrl.replace(/\/$/, '') + '/messages', {
        method: 'POST', signal: signal,
        headers: {
          'Content-Type': 'application/json', 'x-api-key': s.apiKey, 'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: s.model, system: sys, max_tokens: 2048, stream: true,
          temperature: parseFloat(s.temp || '0.9'),
          messages: messages.map(function (m) { return { role: m.role === 'user' ? 'user' : 'assistant', content: m.content }; })
        })
      }).then(function (res) {
        if (!res.ok) return res.text().then(function (t) { throw new Error(t.slice(0, 200)); });
        return parseSSE(res, function (j) {
          if (j.type === 'content_block_delta' && j.delta && j.delta.text) return j.delta.text;
          return '';
        }).then(function () { return { mock: false }; });
      });
    }
    var url = s.baseUrl.replace(/\/$/, '') + '/chat/completions';
    var msgs = [{ role: 'system', content: s.system }].concat(messages);
    return fetch(url, {
      method: 'POST', signal: signal,
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + s.apiKey },
      body: JSON.stringify({
        model: s.model, stream: true, temperature: parseFloat(s.temp || '0.9'), messages: msgs
      })
    }).then(function (res) {
      if (!res.ok) return res.text().then(function (t) { throw new Error(t.slice(0, 200)); });
      return parseSSE(res, function (j) {
        return (j.choices && j.choices[0] && j.choices[0].delta && j.choices[0].delta.content) || '';
      }).then(function () { return { mock: false }; });
    });
  }

  /* =========================== 会话与聊天 =========================== */
  var streaming = false;
  var draftPillsBox = document.createElement('div');
  draftPillsBox.id = 'draftPills';
  draftPillsBox.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;padding:0 6px 8px';
  $('.composer').insertBefore(draftPillsBox, $('.composer').firstChild);
  var pillBtn = document.createElement('button');
  pillBtn.className = 'send';
  pillBtn.title = '给这一句挂药';
  pillBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"><rect x="3.5" y="8.5" width="17" height="7" rx="3.5"/><path d="M8.5 8.5v7M15.5 8.5v7" opacity=".65"/></svg>';
  $('.composer .in').insertBefore(pillBtn, $('#sendBtn'));
  pillBtn.onclick = function () { box.open({ messageId: 'draft', anchor: pillBtn }); };

  function curConv() {
    for (var i = 0; i < S.convs.length; i++) if (S.convs[i].id === S.cur) return S.convs[i];
    return null;
  }
  function newConv() {
    var c = { id: uid(), title: '新的水面上', messages: [], ts: Date.now() };
    S.convs.unshift(c);
    S.cur = c.id;
    save(); renderConvs(); renderStream();
    foot('开了一个新的房间');
    return c;
  }

  function renderConvs() {
    var w = $('#convs');
    w.innerHTML = '<button class="btn pri sm" id="newConv" style="margin-bottom:10px">＋ 新房间</button>';
    $('#newConv').onclick = newConv;
    S.convs.forEach(function (c) {
      var b = document.createElement('button');
      b.className = 'conv' + (c.id === S.cur ? ' on' : '');
      var last = c.messages.length ? c.messages[c.messages.length - 1] : null;
      var when = new Date(c.ts);
      b.innerHTML = '<div class="n">' + esc(c.title) + '</div><div class="m">' +
        (last ? esc(String(last.text).slice(0, 14)) + '…' : '空的') + ' · ' +
        (when.getMonth() + 1) + '/' + when.getDate() + '</div>';
      b.onclick = function () { S.cur = c.id; save(); renderConvs(); renderStream(); };
      b.oncontextmenu = function (e) {
        e.preventDefault();
        confirmBox('删掉这个房间？', '「' + c.title + '」以及里面的话都会没有。', function () {
          S.convs = S.convs.filter(function (x) { return x.id !== c.id; });
          if (S.cur === c.id) S.cur = S.convs.length ? S.convs[0].id : null;
          save(); renderConvs(); renderStream();
        });
      };
      w.appendChild(b);
    });
  }

  function avatarHtml(who) {
    var r = S.relation;
    if (who === 'me') return r.avMe ? '<img alt="" src="' + r.avMe + '">' :
      '<svg viewBox="0 0 52 52"><rect width="52" height="52" fill="#2A3140"/><path d="M32 12a15 15 0 100 28 12.5 12.5 0 010-28z" fill="#E8EDF5"/></svg>';
    return r.avAi ? '<img alt="" src="' + r.avAi + '">' :
      '<svg viewBox="0 0 52 52"><rect width="52" height="52" fill="#E9EEF4"/><g stroke="#7C90AC" stroke-width="1.4" fill="none"><circle cx="26" cy="26" r="5"/><path d="M26 21c0-5-2-7-2-7s4 1 4 6M31 23c4-3 7-3 7-3s-2 4-7 5M31 30c4 3 5 6 5 6s-4 0-8-3M21 30c-4 3-5 6-5 6s4 0 8-3M21 23c-4-3-7-3-7-3s2 4 7 5"/></g></svg>';
  }

  function renderDraftPills() {
    var ids = Pilulier.pendingOf('draft');
    draftPillsBox.innerHTML = '';
    if (!ids.length) { draftPillsBox.style.display = 'none'; return; }
    draftPillsBox.style.display = 'flex';
    ids.forEach(function (id) {
      var p = pillById(id);
      var s = document.createElement('span');
      s.className = 'btn ghost sm';
      s.style.cursor = 'pointer';
      s.innerHTML = '<img alt="" src="data:image/svg+xml;utf8,' + encodeURIComponent(Pilulier.renderPillSVG(Pilulier.lookOf(p))) +
        '" style="width:26px;height:12px;transform:rotate(-9deg);vertical-align:-1px;margin-right:6px">' +
        esc(p ? p.name : id) + ' ✕';
      s.onclick = function () {
        Pilulier.setPending('draft', Pilulier.pendingOf('draft').filter(function (x) { return x !== id; }));
        renderDraftPills();
      };
      draftPillsBox.appendChild(s);
    });
    var hit = conflictNote(ids);
    if (hit.length) {
      var w = document.createElement('span');
      w.className = 'hintline';
      w.style.color = 'var(--danger)';
      w.textContent = '⚠ ' + hit.join('、') + ' 方向相反';
      draftPillsBox.appendChild(w);
    }
  }

  function renderStream() {
    var c = curConv();
    var st = $('#stream');
    st.innerHTML = '';
    if (!c) {
      st.innerHTML = '<div class="empty">还没有房间。点左边「＋ 新房间」，<br>或者去设置里把接口填上 —— 然后开始说第一句。</div>';
      return;
    }
    if (!c.messages.length) {
      st.innerHTML = '<div class="empty">水面是平的。<br>说第一句吧。</div>';
    }
    c.messages.forEach(function (m) { st.appendChild(msgNode(m, c)); });
    st.scrollTop = st.scrollHeight;
  }

  function msgNode(m, conv) {
    var wrap = document.createElement('div');
    wrap.className = 'msg ' + (m.role === 'user' ? 'me' : 'ai');
    var pend = m.role === 'user' ? Pilulier.pendingOf('m_' + m.id) : [];
    var taken = m.role === 'user' && m.pills && m.pills.length;
    var html = '<div class="row"><span class="av">' + avatarHtml(m.role === 'user' ? 'me' : 'ai') + '</span>' +
      '<div class="bub">' + (m.role === 'user' ? esc(m.text).replace(/\n/g, '<br>') : md(m.text)) + '</div></div>';
    wrap.innerHTML = html;
    if (m.role === 'user') {
      var ops = document.createElement('div');
      ops.className = 'msgop';
      ops.style.opacity = '1';
      var r = document.createElement('button');
      r.textContent = '↻ 重新生成';
      r.onclick = function () { regenerate(m); };
      var e = document.createElement('button');
      e.textContent = '编辑';
      e.onclick = function () { editMsg(m); };
      var d = document.createElement('button');
      d.textContent = '删除';
      d.onclick = function () {
        confirmBox('删掉这一句？', '这一句之后的话也会一起没有。', function () {
          conv.messages = conv.messages.slice(0, conv.messages.indexOf(m));
          save(); renderStream();
        });
      };
      ops.appendChild(r); ops.appendChild(e); ops.appendChild(d);
      wrap.appendChild(ops);
      // 挂药
      var bub = wrap.querySelector('.bub');
      var hold = null;
      bub.addEventListener('pointerdown', function () {
        hold = setTimeout(function () {
          hold = null;
          box.open({ messageId: 'm_' + m.id, anchor: bub });
        }, 470);
      });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) {
        bub.addEventListener(ev, function () { if (hold) { clearTimeout(hold); hold = null; } });
      });
      bub.addEventListener('contextmenu', function (ev) {
        ev.preventDefault(); box.open({ messageId: 'm_' + m.id, anchor: bub });
      });
      var footRow = document.createElement('div');
      footRow.style.cssText = 'display:flex;justify-content:flex-end;align-items:center;gap:8px;margin-top:2px';
      if (pend.length) {
        var tag = document.createElement('pill-tag');
        tag.setAttribute('message-id', 'm_' + m.id);
        footRow.appendChild(tag);
      }
      if (taken) {
        var ft = document.createElement('pill-taken');
        ft.setAttribute('ids', m.pills.join(','));
        footRow.appendChild(ft);
      }
      if (footRow.children.length) wrap.appendChild(footRow);
    } else {
      var ops2 = document.createElement('div');
      ops2.className = 'msgop';
      ops2.style.opacity = '1';
      var cp = document.createElement('button');
      cp.textContent = '复制';
      cp.onclick = function () {
        if (navigator.clipboard) navigator.clipboard.writeText(m.text);
        toast('复制好了');
      };
      var rg = document.createElement('button');
      rg.textContent = '↻ 重说';
      rg.onclick = function () { regenerateFrom(m); };
      ops2.appendChild(cp); ops2.appendChild(rg);
      wrap.appendChild(ops2);
    }
    return wrap;
  }

  function editMsg(m) {
    var c = curConv(); if (!c) return;
    var i = c.messages.indexOf(m);
    openModal({
      title: '改这一句', sub: 'edit',
      body: '<textarea class="input" id="mEdit" rows="5">' + esc(m.text) + '</textarea>',
      foot: '<button class="btn ghost" id="mCancel">算了</button><button class="btn pri" id="mOk">改好，重说</button>',
      onOpen: function () {
        $('#mCancel').onclick = closeModal;
        $('#mOk').onclick = function () {
          var v = $('#mEdit').value.trim();
          if (!v) { toast('不能是空的'); return; }
          m.text = v;
          c.messages = c.messages.slice(0, i + 1);      // 后面的一起丢掉
          m.pills = [];
          Pilulier.clearPending('m_' + m.id);
          save(); closeModal(); renderStream();
          sendTurn();
        };
      }
    });
  }

  function regenerate(userMsg) {                          // 对某条用户消息重新生成
    var c = curConv(); if (!c) return;
    var i = c.messages.indexOf(userMsg);
    c.messages = c.messages.slice(0, i + 1);
    save(); renderStream();
    sendTurn(Pilulier.pendingOf('m_' + userMsg.id));
  }
  function regenerateFrom(aiMsg) {                        // 重说最后一条 AI
    var c = curConv(); if (!c) return;
    var i = c.messages.indexOf(aiMsg);
    c.messages = c.messages.slice(0, i);
    var lastU = null;
    for (var k = c.messages.length - 1; k >= 0; k--) if (c.messages[k].role === 'user') { lastU = c.messages[k]; break; }
    save(); renderStream();
    if (lastU) sendTurn(Pilulier.pendingOf('m_' + lastU.id));
  }

  /** 组装本轮请求：药丸块只出现在这一轮，不写进历史 */
  function buildMessages(pillIds) {
    var c = curConv(); if (!c) return [];
    var blocks = [];
    (pillIds || []).slice(0, 8).forEach(function (id) {
      var p = pillById(id);
      if (!p || p.enabled === false || !String(p.text || '').trim()) return;
      blocks.push('[药丸 · ' + p.name + ']\n' + String(p.text).trim());
    });
    var msgs = c.messages.map(function (m, idx) {
      var isLast = idx === c.messages.length - 1;
      var content = m.text;
      if (isLast && m.role === 'user' && blocks.length) content = blocks.join('\n\n') + '\n\n' + content;
      return { role: m.role === 'user' ? 'user' : 'assistant', content: content };
    });
    return msgs;
  }

  function sendBtnState() {
    $('#sendBtn').innerHTML = streaming
      ? '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><rect x="3" y="3" width="10" height="10" rx="2"/></svg>'
      : '<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 8h12M9 3.5L13.5 8 9 12.5"/></svg>';
    $('#streamState').textContent = streaming ? '正在说…（点方块停下）' : '';
  }

  function sendTurn(forcePills) {
    var c = curConv();
    if (!c || !c.messages.length) return;
    if (streaming) { if (abort) abort.abort(); return; }
    if (S.settings.mode === 'proxy' && !hasProxy()) {
      S.settings.mode = 'direct'; save(); fillSettings(); apiState();
      toast('静态站点没有服务端 —— 已切成直连');
    }
    if (!apiReady()) {
      toast('先去设置里把接口填好（直连需要 Base URL 和 Key）');
      go('settings');
      return;
    }
    var lastU = null;
    for (var k = c.messages.length - 1; k >= 0; k--) if (c.messages[k].role === 'user') { lastU = c.messages[k]; break; }
    if (!lastU) return;
    var ids = forcePills || [];
    if (ids.length) { lastU.pills = ids.slice(); Pilulier.clearPending('m_' + lastU.id); }
    save();

    var st = $('#stream');
    var aiNode = document.createElement('div');
    aiNode.className = 'msg ai';
    aiNode.innerHTML = '<div class="row"><span class="av">' + avatarHtml('ai') + '</span>' +
      '<div class="bub"><span class="caret"></span></div></div>';
    st.appendChild(aiNode);
    var bub = aiNode.querySelector('.bub');
    var buf = '';
    streaming = true; sendBtnState();

    var hit = conflictNote(ids);
    if (hit.length) toast('注意：' + hit.join('、') + ' 方向相反');

    chat(buildMessages(ids), function (delta) {
      buf += delta;
      bub.innerHTML = md(buf) + '<span class="caret"></span>';
      st.scrollTop = st.scrollHeight;
    }).then(function (res) {
      streaming = false; sendBtnState();
      bub.innerHTML = md(buf) || '（他什么都没说）';
      var ai = { id: uid(), role: 'assistant', text: buf, ts: Date.now() };
      c.messages.push(ai);
      ids.forEach(function (id) {
        var p = pillById(id);
        if (p) { p.stats = p.stats || { uses: 0, last: 0 }; p.stats.uses++; p.stats.last = Date.now(); }
      });
      if (!c.messages.filter(function (m) { return m.role === 'user'; }).length > 1) { }
      if (c.messages.length === 2) c.title = String(lastU.text).slice(0, 18);
      save();
      syncBox();
      if (res && res.mock) toast('当前是模拟回复 —— 填上接口就能真的说');
      renderConvs();
      renderStream();
      renderHome();
      // 注入卡要在重绘之后放，否则会被清掉
      if (ids.length) {
        showShot(ids);
        foot('吃了一颗药：' + ids.map(function (i) { var p = pillById(i); return p ? p.name : i; }).join('、'));
      }
    }).catch(function (err) {
      streaming = false; sendBtnState();
      bub.innerHTML = '<span style="color:var(--danger)">没有说出来：' + esc(err.message || String(err)) + '</span>';
      toast('没接上：' + (err.message || ''));
    });
  }

  function showShot(ids) {
    var st = $('#stream');
    var shot = document.createElement('div');
    shot.className = 'shot';
    var names = ids.map(function (i) { var p = pillById(i); return p ? p.name : i; });
    var imgs = ids.map(function (i) {
      var p = pillById(i);
      return '<img alt="" src="data:image/svg+xml;utf8,' + encodeURIComponent(Pilulier.renderPillSVG(Pilulier.lookOf(p))) + '">';
    }).join('');
    shot.innerHTML = '<div class="hd"><span class="k">prescription</span><span class="n">' +
      ids.join(' · ') + ' ' + esc(names.join(' · ')) + '</span><span class="s"></span>' +
      '<span class="st">只这一轮</span></div>' +
      '<div class="bd">' + imgs + '<span class="t">拼在了你那句话的最前面 · 历史里没有它</span></div>' +
      '<div class="burnmark">burned</div><div class="line"></div>';
    st.appendChild(shot);
    setTimeout(function () { shot.classList.add('burn'); }, 60);
    setTimeout(function () { shot.querySelector('.st').textContent = '已焚毁 · 不进历史'; }, 1000);
  }

  function doSend() {
    var v = $('#draft').value.trim();
    if (!v || streaming) return;
    var c = curConv() || newConv();
    var ids = Pilulier.takePending('draft');
    c.messages.push({ id: uid(), role: 'user', text: v, ts: Date.now(), pills: ids });
    c.ts = Date.now();
    if (c.messages.length === 1) c.title = v.slice(0, 18);
    save();
    $('#draft').value = '';
    $('#draft').style.height = 'auto';
    renderDraftPills();
    renderStream();
    renderConvs();
    sendTurn(ids);
  }
  $('#sendBtn').onclick = doSend;
  var draft = $('#draft');
  draft.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }
  });
  draft.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = Math.min(150, this.scrollHeight) + 'px';
  });

  /* 药盒事件 */
  box.addEventListener('pill-pick', function (e) {
    var ids = e.detail.ids || [];
    var hit = conflictNote(ids);
    if (hit.length) toast('注意：' + hit.join('、') + ' 方向相反');
    if (e.detail.messageId === 'draft') renderDraftPills();
  });
  box.addEventListener('pill-unpick', function (e) {
    if (e.detail.messageId === 'draft') renderDraftPills();
  });
  box.addEventListener('pill-close', function (e) {
    renderDraftPills();
    var mid = e.detail.messageId;
    if (mid && mid.indexOf('m_') === 0) {
      renderStream();
      if (Pilulier.pendingOf(mid).length) {
        // 挂了药：直接重新生成这一轮
        var c = curConv();
        var m = c && c.messages.filter(function (x) { return 'm_' + x.id === mid; })[0];
        if (m) regenerate(m);
      }
    }
  });
  addEventListener('pilulier:change', renderDraftPills);

  /* =========================== 首页 · 镜 =========================== */
  function daysTogether() {
    if (!S.relation.since) return null;
    var a = new Date(S.relation.since + 'T00:00:00');
    if (isNaN(a.getTime())) return null;
    var b = new Date(); b.setHours(0, 0, 0, 0);
    return Math.floor((b - a) / 86400000) + 1;
  }
  function renderHome() {
    var r = S.relation;
    $('#avMe').innerHTML = avatarHtml('me') + '<span class="up">换图</span>';
    $('#avAi').innerHTML = avatarHtml('ai') + '<span class="up">换图</span>';
    $('#whoAi').textContent = r.ai || 'Cove';
    $('#whoMe').textContent = r.me || '你';
    var d = daysTogether();
    $('#daysNum').textContent = d == null ? '—' : d;
    $('#daysSince').textContent = d == null
      ? '还没有开始 —— 去设置里写下第一天。'
      : ('从 ' + r.since + ' 开始，一直数到今天。');
    $('#daysTip').textContent = d == null ? '还没写第一天' : ('相伴 · 第 ' + d + ' 天');
    $('#helloLine').innerHTML = '回来啦，<b>' + esc(r.nick || '你') + '</b>。';
    $('#lampText').textContent = r.lamp || '';

    var qi = new Date().getDate() % S.quotes.length;
    $('#dailyQ').textContent = S.quotes[qi] || '还没有写下今天的话。';

    var lw = $('#letters');
    lw.innerHTML = '';
    S.letters.forEach(function (l) {
      var e = document.createElement('div');
      e.className = 'letter' + (l.opened ? ' opened' : '');
      e.innerHTML = '<div><div class="t">' + esc(l.t) + '</div><div class="d">' + esc(l.d) + '</div></div><span class="ring"></span>';
      e.onclick = function () { readLetter(l); };
      e.oncontextmenu = function (ev) {
        ev.preventDefault();
        confirmBox('烧掉这封信？', '「' + l.t + '」会没有。', function () {
          S.letters = S.letters.filter(function (x) { return x.id !== l.id; });
          save(); renderHome();
        });
      };
      lw.appendChild(e);
    });
    $('#letterCount').textContent = S.letters.filter(function (l) { return !l.opened; }).length + ' 封没拆';

    var fp = $('#footprints');
    fp.innerHTML = S.prints.length ? '' : '<div class="empty">还没有脚印。说第一句话、吃第一颗药、拆第一封信 —— 都会留在这里。</div>';
    S.prints.slice(0, 8).forEach(function (p) {
      var dt = new Date(p.ts);
      var e = document.createElement('div');
      e.className = 'fp';
      e.innerHTML = '<span class="d">' + (dt.getMonth() + 1) + '.' + String(dt.getDate()).padStart(2, '0') + '</span>' +
        '<span class="dot"></span><span class="x">' + esc(p.x) + '</span>';
      fp.appendChild(e);
    });

    var c = curConv();
    $('#recentChat').textContent = c && c.messages.length
      ? (String(c.messages[c.messages.length - 1].text).slice(0, 40) + '…')
      : '还没有说过话。';
  }

  function readLetter(l) {
    l.opened = true; save(); renderHome();
    openModal({
      title: l.t, sub: l.d, paper: true,
      body: '<div class="lx">' + esc(l.x) + '</div><div class="ls">— ' + esc(S.relation.ai || 'Cove') + '</div>',
      foot: '<button class="btn ghost" id="lAgain">重新折起</button><button class="btn pri" id="lOk">收好</button>',
      onOpen: function () {
        $('#lOk').onclick = closeModal;
        $('#lAgain').onclick = function () { l.opened = false; save(); renderHome(); closeModal(); };
      }
    });
    foot('拆开了一封信：' + l.t);
  }
  $('#newLetter').onclick = function () {
    openModal({
      title: '折一封信', sub: 'letter',
      body: '<div class="field"><label>标题</label><input class="input" id="nT" placeholder="给今天回家的你"></div>' +
        '<div class="field"><label>落款日期</label><input class="input" id="nD" value="折好于 ' + new Date().toISOString().slice(0, 10) + '"></div>' +
        '<div class="field"><label>正文</label><textarea class="input" id="nX" rows="6"></textarea></div>',
      foot: '<button class="btn ghost" id="nCancel">算了</button><button class="btn pri" id="nOk">折起来</button>',
      onOpen: function () {
        $('#nCancel').onclick = closeModal;
        $('#nOk').onclick = function () {
          var t = $('#nT').value.trim(), x = $('#nX').value.trim();
          if (!t || !x) { toast('标题和正文都要有'); return; }
          S.letters.push({ id: uid(), t: t, d: $('#nD').value.trim(), x: x, opened: false });
          save(); renderHome(); closeModal();
          foot('折了一封信：' + t);
        };
      }
    });
  };
  $('#editQuotes').onclick = function () {
    openModal({
      title: '今天可以说的话', sub: 'quotes · 一行一句',
      body: '<textarea class="input" id="qText" rows="10">' + esc(S.quotes.join('\n')) + '</textarea>',
      foot: '<button class="btn ghost" id="qCancel">算了</button><button class="btn pri" id="qOk">保存</button>',
      onOpen: function () {
        $('#qCancel').onclick = closeModal;
        $('#qOk').onclick = function () {
          var arr = $('#qText').value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
          if (!arr.length) { toast('至少留一句'); return; }
          S.quotes = arr; save(); renderHome(); closeModal();
        };
      }
    });
  };
  var qIdx = 0;
  $('#flipQ').onclick = function () {
    qIdx = (qIdx + 1) % S.quotes.length;
    var q = $('#dailyQ');
    q.style.opacity = '0'; q.style.transition = 'opacity .3s';
    setTimeout(function () { q.textContent = S.quotes[qIdx]; q.style.opacity = '1'; }, 300);
  };
  $('#sitBtn').onclick = function () {
    var c = $('#lampCard');
    c.classList.toggle('lit');
    this.textContent = c.classList.contains('lit') ? '灯亮着' : '坐一会儿';
  };
  $('#goRoom').onclick = function () { go('room'); };
  $('#avMe').onclick = function () {
    pickImage(function (d) { S.relation.avMe = d; save(); renderHome(); toast('换好了'); });
  };
  $('#avAi').onclick = function () {
    pickImage(function (d) { S.relation.avAi = d; save(); renderHome(); toast('换好了'); });
  };

  /* =========================== 月 =========================== */
  function renderMoon() {
    var m = moonOf(new Date());
    drawMoon(m);
    $('#moonWord').textContent = S.moonWord || '';
    $('#moonWordBy').textContent = (S.relation.ai || 'Cove') + ' 的月之言';
  }
  $('#editMoonWord').onclick = function () {
    openModal({
      title: '今晚的月之言', sub: 'moon note',
      body: '<textarea class="input" id="mw" rows="5">' + esc(S.moonWord || '') + '</textarea>',
      foot: '<button class="btn ghost" id="mwC">算了</button><button class="btn pri" id="mwOk">保存</button>',
      onOpen: function () {
        $('#mwC').onclick = closeModal;
        $('#mwOk').onclick = function () { S.moonWord = $('#mw').value.trim(); save(); renderMoon(); closeModal(); };
      }
    });
  };

  /* =========================== 设置 =========================== */
  function fillSettings() {
    var s = S.settings, r = S.relation;
    $('#apiMode').querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', b.dataset.m === s.mode); });
    $('#apiProvider').value = s.provider;
    $('#apiBase').value = s.baseUrl;
    $('#apiKey').value = s.apiKey;
    $('#apiModel').value = s.model;
    $('#apiTemp').value = s.temp;
    $('#apiSystem').value = s.system;
    $('#apiProxy').value = s.proxyUrl || '';
    var sn = $('#staticNote'); if (sn) sn.style.display = IS_STATIC ? '' : 'none';
    $('#rAi').value = r.ai; $('#rMe').value = r.me;
    $('#rSince').value = r.since; $('#rNick').value = r.nick;
    $('#rLamp').value = r.lamp;
  }
  $('#apiMode').querySelectorAll('button').forEach(function (b) {
    b.onclick = function () { S.settings.mode = b.dataset.m; save(); fillSettings(); apiState(); };
  });
  $('#saveApi').onclick = function () {
    var s = S.settings;
    s.provider = $('#apiProvider').value;
    s.baseUrl = $('#apiBase').value.trim();
    s.apiKey = $('#apiKey').value.trim();
    s.model = $('#apiModel').value.trim();
    s.temp = $('#apiTemp').value.trim() || '0.9';
    s.system = $('#apiSystem').value;
    s.proxyUrl = $('#apiProxy').value.trim();
    save(); apiState();
    toast('保存好了');
    $('#apiMsg').textContent = '已保存 · ' + (hasProxy() ? '走代理' : (s.mode === 'proxy' ? '代理不可用，将用直连' : '直连'));
  };
  $('#testApi').onclick = function () {
    $('#apiMsg').textContent = '正在试…';
    var got = '';
    var keep = S.settings.model;
    chat([{ role: 'user', content: '说一句四个字的话' }], function (d) {
      got += d;
      if (got.length > 6 && abort) abort.abort();
    }).then(function (res) {
      $('#apiMsg').textContent = '通了 · ' + (res && res.mock ? '（模拟回复，未接真实模型）' : (got.slice(0, 12) || '有回应'));
      toast('接口通了');
    }).catch(function (e) {
      if (e.name === 'AbortError') {          // 收到几个字就主动掐断，说明链路是通的
        $('#apiMsg').textContent = '通了 · ' + (got.slice(0, 12) || '有回应');
        toast('接口通了');
        return;
      }
      $('#apiMsg').textContent = '没通：' + (e.message || '');
      toast('没通：' + (e.message || ''));
    });
    S.settings.model = keep;
  };
  $('#saveRelation').onclick = function () {
    var r = S.relation;
    r.ai = $('#rAi').value.trim() || 'Cove';
    r.me = $('#rMe').value.trim() || '你';
    r.since = $('#rSince').value;
    r.nick = $('#rNick').value.trim() || r.me;
    r.lamp = $('#rLamp').value.trim();
    save(); renderHome();
    toast('改好了');
    foot('改了关系里的名字与日子');
  };
  $('#exportAll').onclick = function () {
    download('moonwater-' + new Date().toISOString().slice(0, 10) + '.json', JSON.stringify(S, null, 2));
    toast('导出成功');
  };
  $('#importAll').onclick = function () {
    pickFile(function (d) {
      if (!d) { toast('空的'); return; }
      confirmBox('导入并覆盖？', '现在的所有数据会被这份文件替换掉。', function () {
        try { localStorage.setItem(KEY, JSON.stringify(d)); location.reload(); }
        catch (e) { toast('导入失败：' + e.message); }
      });
    });
  };
  $('#wipe').onclick = function () {
    confirmBox('清空所有数据？', '会话、药方、关系、信、脚印 —— 全都没有了，且没法找回。', function () {
      try { localStorage.removeItem(KEY); } catch (e) {}
      location.reload();
    });
  };

  /* =========================== 路由 =========================== */
  var TITLES = {
    mirror: ['镜', 'Mirror · 关系主页'],
    room: ['水', 'Room · 说话的地方'],
    pills: ['药', 'Pills · 一次性的提示'],
    moon: ['月', 'Moon · 今晚的月相'],
    settings: ['设置', 'Setup · 接口与数据']
  };
  function go(page) {
    $$('.page').forEach(function (p) { p.classList.toggle('on', p.id === 'p-' + page); });
    $$('#nav button').forEach(function (b) { b.classList.toggle('on', b.dataset.go === page); });
    $$('#mobtab button').forEach(function (b) { b.classList.toggle('on', b.dataset.go === page); });
    var t = TITLES[page] || ['', ''];
    $('#pageTitle').innerHTML = t[0] + ' <small>' + t[1] + '</small>';
    var acts = $('#pageActs');
    acts.innerHTML = '';
    if (page === 'room') {
      var b1 = document.createElement('button');
      b1.className = 'btn ghost sm'; b1.textContent = '＋ 新房间';
      b1.onclick = newConv;
      var b2 = document.createElement('button');
      b2.className = 'btn ghost sm'; b2.textContent = '改名';
      b2.onclick = function () {
        var c = curConv(); if (!c) return;
        openModal({
          title: '给这个房间起个名字', sub: 'rename',
          body: '<input class="input" id="cv" value="' + esc(c.title) + '">',
          foot: '<button class="btn ghost" id="cvc">算了</button><button class="btn pri" id="cvo">好</button>',
          onOpen: function () {
            $('#cvc').onclick = closeModal;
            $('#cvo').onclick = function () { c.title = $('#cv').value.trim() || c.title; save(); renderConvs(); closeModal(); };
          }
        });
      };
      acts.appendChild(b1); acts.appendChild(b2);
    }
    if (page === 'pills') renderPills();
    if (page === 'mirror') renderHome();
    if (page === 'moon') renderMoon();
    if (page === 'settings') fillSettings();
    if (page === 'room') { renderConvs(); renderStream(); }
  }
  $$('#nav button').forEach(function (b) { b.onclick = function () { go(b.dataset.go); }; });
  $$('#mobtab button').forEach(function (b) { b.onclick = function () { go(b.dataset.go); }; });

  /* =========================== 启动 =========================== */
  function tick() {
    var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; };
    var WD = ['SUN.', 'MON.', 'TUE.', 'WED.', 'THU.', 'FRI.', 'SAT.'];
    var MO = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    $('#bigClock').textContent = p(d.getHours()) + ':' + p(d.getMinutes());
    $('#dateLine').textContent = WD[d.getDay()] + ' ' + MO[d.getMonth()] + ' ' + d.getDate();
  }

  load();
  if (!S.convs.length) S.convs = [];
  if (S.cur && !curConv()) S.cur = null;
  syncBox();
  applyTheme();
  apiState();
  renderHome();
  renderMoon();
  renderPills();
  renderConvs();
  renderStream();
  renderDraftPills();
  fillSettings();
  tick();
  setInterval(tick, 20000);
  setInterval(function () { drawMoon(moonOf(new Date())); }, 600000);
  go('mirror');
})();
