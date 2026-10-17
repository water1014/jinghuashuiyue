/*!
 * pilulier · <pill-box> 药盒组件  (v1.0 · MIT)
 * 零依赖 Web Component。长相按「新拟态 + 轻玻璃拟态」重做过：低饱和莫兰迪色、大圆角胶囊、
 * 弥散柔和阴影、无硬边；排版为英文衬线标题 + 中文纤细无衬线正文。
 * 一个文件放进任何前端（React / Vue / 纯 HTML 都行）。
 *
 * 用法见 README；API 与上游 pilulier 仓库保持一致，方便直接替换。
 */
(function () {
  'use strict';

  var PILL_BRAND = { mark: 'Pilulier', plate: 'Pilulier', sign: 'Pilulier', colophon: 'pilulier · 药盒' };
  var MAX_PILLS = 8;
  var PAGE_SIZE = 8;
  var REDUCED = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------------------------------------------- 药丸外观 */

  var FALLBACK_LOOKS = [
    { c1: '#C9A38B', c2: '#EFE3D6', ink: '#6B5443', motif: 'flow' },
    { c1: '#B9A7C4', c2: '#F0E9F2', ink: '#5C5064', motif: 'spark' },
    { c1: '#9FB3AE', c2: '#E6EDE9', ink: '#4E5C58', motif: 'ripple' },
    { c1: '#A9B48C', c2: '#EDF1DF', ink: '#525B3D', motif: 'flow' },
    { c1: '#8FA0B8', c2: '#E4EAF2', ink: '#414C5E', motif: 'duo' },
    { c1: '#C7A2A8', c2: '#F5E6E7', ink: '#63454C', motif: 'ripple' },
    { c1: '#D3C4A8', c2: '#F7F1E4', ink: '#6E6042', motif: 'spark' },
    { c1: '#9E9BB4', c2: '#E8E7F0', ink: '#4B4860', motif: 'flow' }
  ];

  function hashOf(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 16777619) >>> 0; }
    return h;
  }

  function lookOf(pill) {
    if (!pill) return FALLBACK_LOOKS[0];
    if (pill.look) return pill.look;
    var key = String(pill.code || pill.id || '').toUpperCase();
    var h = hashOf(key || 'pill');
    var base = FALLBACK_LOOKS[h % FALLBACK_LOOKS.length];
    if (pill.fav) {
      var frost = { lueur: '#F6EFE2', argent: '#E7EAEE', iris: '#E9E3F0', duo: '#F2E7E7' };
      return { c1: base.c1, c2: frost[pill.favStyle] || '#F6EFE2', ink: base.ink, motif: pill.favStyle === 'duo' ? 'duo' : 'spark', fav: true };
    }
    return base;
  }

  function roundRectPath(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  /** 画一颗糖壳胶囊。w/h 为逻辑尺寸，dpr 放大后绘制。 */
  function paintPill(ctx, look, w, h, dpr) {
    var c1 = look.c1 || '#C9A38B', c2 = look.c2 || '#EFE3D6', ink = look.ink || '#6B5443';
    var motif = look.motif || 'flow';
    var r = h / 2;

    ctx.save();
    ctx.scale(dpr, dpr);

    // 外弥散阴影（新拟态：柔和无硬边）
    ctx.save();
    ctx.shadowColor = 'rgba(58,48,40,.30)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;
    roundRectPath(ctx, 1.5, 1.5, w - 3, h - 3, r);
    ctx.fillStyle = c1;
    ctx.fill();
    ctx.restore();

    // 糖壳本体：斜切两色
    ctx.save();
    roundRectPath(ctx, 0, 0, w, h, r);
    ctx.clip();
    ctx.fillStyle = c1;
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.beginPath();
    var sx = w * 0.46;
    ctx.moveTo(sx, 0);
    ctx.lineTo(sx + h * 0.62, 0);
    ctx.lineTo(sx + h * 0.10, h);
    ctx.lineTo(sx - h * 0.52, h);
    ctx.closePath();
    ctx.clip();
    ctx.fillStyle = c2;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();

    // 顶部柔光箱高光
    var hg = ctx.createRadialGradient(w * 0.32, h * 0.20, 1, w * 0.32, h * 0.22, h * 0.78);
    hg.addColorStop(0, 'rgba(255,255,255,.62)');
    hg.addColorStop(0.55, 'rgba(255,255,255,.14)');
    hg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hg;
    ctx.fillRect(0, 0, w, h);

    // 底部回光
    var bg = ctx.createLinearGradient(0, h, 0, h * 0.55);
    bg.addColorStop(0, 'rgba(255,255,255,.30)');
    bg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, h * 0.55, w, h * 0.45);

    // 墨纹
    ctx.globalAlpha = 0.30;
    ctx.strokeStyle = ink;
    ctx.fillStyle = ink;
    ctx.lineCap = 'round';
    if (motif === 'flow') {
      ctx.lineWidth = 1.6;
      for (var i = 0; i < 3; i++) {
        var y0 = h * (0.30 + i * 0.20);
        ctx.beginPath();
        ctx.moveTo(w * 0.10, y0);
        ctx.bezierCurveTo(w * 0.36, y0 - h * 0.22, w * 0.62, y0 + h * 0.22, w * 0.92, y0);
        ctx.stroke();
      }
    } else if (motif === 'spark') {
      for (var s = 0; s < 5; s++) {
        var px = w * (0.18 + s * 0.17), py = h * (0.34 + (s % 2) * 0.32), rr = 1.5 + (s % 3) * 0.9;
        ctx.beginPath(); ctx.arc(px, py, rr, 0, 6.2832); ctx.fill();
        ctx.globalAlpha = 0.16;
        ctx.beginPath(); ctx.moveTo(px - rr * 3.2, py); ctx.lineTo(px + rr * 3.2, py);
        ctx.moveTo(px, py - rr * 3.2); ctx.lineTo(px, py + rr * 3.2);
        ctx.lineWidth = 0.9; ctx.stroke();
        ctx.globalAlpha = 0.30;
      }
    } else if (motif === 'ripple') {
      ctx.lineWidth = 1.3;
      for (var k = 0; k < 3; k++) {
        ctx.beginPath();
        ctx.arc(w * 0.70, h * 0.52, h * (0.16 + k * 0.17), -0.9, 2.1);
        ctx.stroke();
      }
    } else { // duo
      ctx.globalAlpha = 0.22;
      ctx.beginPath(); ctx.arc(w * 0.30, h * 0.42, h * 0.24, 0, 6.2832); ctx.fill();
      ctx.globalAlpha = 0.34;
      ctx.beginPath(); ctx.arc(w * 0.72, h * 0.58, h * 0.17, 0, 6.2832); ctx.fill();
      ctx.globalAlpha = 0.30;
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // 内壁反光 + 细描边
    ctx.save();
    roundRectPath(ctx, 0.75, 0.75, w - 1.5, h - 1.5, r);
    ctx.strokeStyle = 'rgba(255,255,255,.42)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    roundRectPath(ctx, 0.5, 0.5, w - 1, h - 1, r);
    ctx.strokeStyle = 'rgba(72,60,50,.14)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }

  var PW = 148, PH = 66, dpr = (typeof devicePixelRatio === 'number' ? Math.min(devicePixelRatio, 2.5) : 1);
  var bmpCache = Object.create(null);

  function pillDataURL(look) {
    var key = look.c1 + look.c2 + look.ink + look.motif;
    if (bmpCache[key]) return bmpCache[key];
    var cvs = document.createElement('canvas');
    cvs.width = Math.round(PW * dpr); cvs.height = Math.round(PH * dpr);
    cvs.style.width = PW + 'px'; cvs.style.height = PH + 'px';
    var ctx = cvs.getContext('2d');
    paintPill(ctx, look, PW, PH, dpr);
    var url = cvs.toDataURL('image/png');
    bmpCache[key] = url;
    return url;
  }

  /** 实时 SVG 大预览（编辑器用；列表请用位图） */
  function renderPillSVG(look) {
    look = lookOf({ look: look, code: 'P000' });
    var w = 240, h = 107, r = h / 2, uid = 'g' + hashOf(look.c1 + look.c2).toString(36);
    var ink = look.ink;
    var marks = '';
    if (look.motif === 'flow') {
      for (var i = 0; i < 3; i++) {
        var y0 = h * (0.30 + i * 0.20);
        marks += '<path d="M' + (w * 0.10) + ' ' + y0 + ' C' + (w * 0.36) + ' ' + (y0 - h * 0.22) + ', ' +
          (w * 0.62) + ' ' + (y0 + h * 0.22) + ', ' + (w * 0.92) + ' ' + y0 + '" fill="none" stroke="' + ink +
          '" stroke-opacity=".30" stroke-width="2.6" stroke-linecap="round"/>';
      }
    } else if (look.motif === 'spark') {
      for (var s = 0; s < 5; s++) {
        var px = w * (0.18 + s * 0.17), py = h * (0.34 + (s % 2) * 0.32), rr = 2.4 + (s % 3) * 1.4;
        marks += '<circle cx="' + px + '" cy="' + py + '" r="' + rr + '" fill="' + ink + '" fill-opacity=".30"/>' +
          '<path d="M' + (px - rr * 3) + ' ' + py + 'H' + (px + rr * 3) + 'M' + px + ' ' + (py - rr * 3) + 'V' + (py + rr * 3) +
          '" stroke="' + ink + '" stroke-opacity=".16" stroke-width="1.4"/>';
      }
    } else if (look.motif === 'ripple') {
      for (var k = 0; k < 3; k++) {
        marks += '<path d="M' + (w * 0.70 - h * (0.16 + k * 0.17) * 0.8) + ' ' + (h * 0.52 - h * (0.16 + k * 0.17) * 0.42) +
          ' a' + h * (0.16 + k * 0.17) + ' ' + h * (0.16 + k * 0.17) + ' 0 1 1 ' + (h * (0.16 + k * 0.17) * 1.5) + ' ' +
          (h * (0.16 + k * 0.17) * 0.7) + '" fill="none" stroke="' + ink + '" stroke-opacity=".30" stroke-width="2"/>';
      }
    } else {
      marks = '<circle cx="' + w * 0.30 + '" cy="' + h * 0.42 + '" r="' + h * 0.24 + '" fill="' + ink + '" fill-opacity=".22"/>' +
        '<circle cx="' + w * 0.72 + '" cy="' + h * 0.58 + '" r="' + h * 0.17 + '" fill="' + ink + '" fill-opacity=".34"/>';
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '" width="' + w + '" height="' + h + '">' +
      '<defs><clipPath id="' + uid + 'c"><rect x="0" y="0" width="' + w + '" height="' + h + '" rx="' + r + '"/></clipPath>' +
      '<radialGradient id="' + uid + 'h" cx="32%" cy="20%" r="78%"><stop offset="0" stop-color="#fff" stop-opacity=".62"/>' +
      '<stop offset=".55" stop-color="#fff" stop-opacity=".14"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>' +
      '<linearGradient id="' + uid + 'b" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".30"/>' +
      '<stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>' +
      '<g clip-path="url(#' + uid + 'c)">' +
      '<rect x="0" y="0" width="' + w + '" height="' + h + '" fill="' + look.c1 + '"/>' +
      '<path d="M' + w * 0.46 + ' 0L' + (w * 0.46 + h * 0.62) + ' 0L' + (w * 0.46 + h * 0.10) + ' ' + h + 'L' +
      (w * 0.46 - h * 0.52) + ' ' + h + 'Z" fill="' + look.c2 + '"/>' +
      '<rect x="0" y="0" width="' + w + '" height="' + h + '" fill="url(#' + uid + 'h)"/>' +
      '<rect x="0" y="' + h * 0.55 + '" width="' + w + '" height="' + h * 0.45 + '" fill="url(#' + uid + 'b)"/>' +
      marks + '</g>' +
      '<rect x="1.2" y="1.2" width="' + (w - 2.4) + '" height="' + (h - 2.4) + '" rx="' + r + '" fill="none" stroke="#fff" stroke-opacity=".42" stroke-width="2.4"/>' +
      '<rect x="0.8" y="0.8" width="' + (w - 1.6) + '" height="' + (h - 1.6) + '" rx="' + r + '" fill="none" stroke="#483c32" stroke-opacity=".14" stroke-width="1.6"/>' +
      '</svg>';
  }

  /* ------------------------------------------------------------ 待服用状态 */

  var pending = Object.create(null);
  var REGISTRY = [];

  function known(id) {
    for (var i = 0; i < REGISTRY.length; i++) if (REGISTRY[i].id === id) return REGISTRY[i];
    return null;
  }
  function injectable(p) {
    return !!p && p.enabled !== false && String(p.text || '').trim().length > 0;
  }
  function ordered(list) { return list.slice(0, MAX_PILLS); }

  function emit(messageId) {
    try {
      window.dispatchEvent(new CustomEvent('pilulier:change', { detail: { messageId: messageId } }));
    } catch (e) { /* noop */ }
  }

  function pendingOf(messageId) { return (pending[messageId] || []).slice(); }

  function setPending(messageId, ids) {
    var out = [];
    (ids || []).forEach(function (id) {
      var p = known(id);
      if (injectable(p) && out.indexOf(id) < 0) out.push(id);
    });
    pending[messageId] = ordered(out);
    emit(messageId);
    return pendingOf(messageId);
  }

  function clearPending(messageId) { delete pending[messageId]; emit(messageId); }

  /** 取走 = 吃掉：返回真正会注入的 id，并立刻清空 */
  function takePending(messageId) {
    var ids = pendingOf(messageId);
    delete pending[messageId];
    emit(messageId);
    return ids;
  }

  /* ------------------------------------------------------------------ 工具 */

  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }
  function fire(host, type, detail) {
    host.dispatchEvent(new CustomEvent(type, { detail: detail || {}, bubbles: true, composed: true }));
  }
  function clsx(o) { return Object.keys(o).filter(function (k) { return o[k]; }).join(' '); }

  /* ------------------------------------------------------------ 飞行药丸层 */

  var flyLayer = null;
  function layer() {
    if (!flyLayer) {
      flyLayer = document.createElement('div');
      flyLayer.className = 'pilulier-fly-layer';
      (document.body || document.documentElement).appendChild(flyLayer);
    }
    return flyLayer;
  }

  function fly(fromRect, toRect, url, opts) {
    opts = opts || {};
    var L = layer();
    var img = document.createElement('img');
    img.src = url;
    img.className = 'pilulier-fly';
    var w0 = opts.w0 || 74, w1 = opts.w1 || 40;
    var x0 = fromRect.left + fromRect.width / 2, y0 = fromRect.top + fromRect.height / 2;
    var x1 = toRect.left + toRect.width / 2, y1 = toRect.top + toRect.height / 2;
    img.style.width = w0 + 'px';
    img.style.transform = 'translate(-50%,-50%) translate(' + x0 + 'px,' + y0 + 'px) rotate(' + (opts.rot0 || -8) + 'deg) scale(1)';
    L.appendChild(img);
    var dx = x1 - x0, dy = y1 - y0;
    var scale = w1 / w0;
    var dur = REDUCED ? 1 : (opts.dur || 560);
    if (typeof img.animate === 'function' && !REDUCED) {
      img.animate([
        { transform: 'translate(-50%,-50%) translate(' + x0 + 'px,' + y0 + 'px) rotate(' + (opts.rot0 || -8) + 'deg) scale(1)', opacity: 1, offset: 0 },
        { transform: 'translate(-50%,-50%) translate(' + (x0 + dx * 0.5) + 'px,' + (y0 + dy * 0.5 - 46) + 'px) rotate(' + (opts.rot1 || 6) + 'deg) scale(' + (1 + (1 - scale) * 0.55) + ')', opacity: 1, offset: 0.62 },
        { transform: 'translate(-50%,-50%) translate(' + x1 + 'px,' + y1 + 'px) rotate(' + (opts.rot1 || 6) + 'deg) scale(' + scale + ')', opacity: opts.fade ? 0 : 1, offset: 1 }
      ], { duration: dur, easing: 'cubic-bezier(.32,.72,.24,1)', fill: 'forwards' }).onfinish = function () {
        img.remove();
        if (opts.done) opts.done();
      };
    } else {
      img.style.transform = 'translate(-50%,-50%) translate(' + x1 + 'px,' + y1 + 'px) rotate(' + (opts.rot1 || 6) + 'deg) scale(' + scale + ')';
      setTimeout(function () { img.remove(); if (opts.done) opts.done(); }, 30);
    }
  }

  /* ------------------------------------------------------------- 组件样式 */

  var CSS = [
    ':host{--pill-paper:#FBFAF7;--pill-paper-2:#F3F0EA;--pill-ink:#4A453F;--pill-ink-2:#7C766D;--pill-ink-3:#A6A099;',
    '--pill-line:rgba(74,69,63,.08);--pill-bub:#FFFFFF;--pill-hi:#FFFDFA;--pill-glow:rgba(201,163,139,.42);',
    '--pill-sh-1:-10px -10px 24px rgba(255,255,255,.86);--pill-sh-2:12px 14px 30px rgba(96,84,70,.13);',
    '--pill-accent:#A9947F;--pill-r:26px;',
    'font-family:"Noto Sans SC","PingFang SC","Hiragino Sans GB","Microsoft YaHei",system-ui,sans-serif;',
    'font-weight:300;color:var(--pill-ink);position:fixed;inset:0;z-index:920;pointer-events:none;display:none}',
    ':host(.pill-dark){--pill-paper:#22222A;--pill-paper-2:#1B1B21;--pill-ink:#EAE5DE;--pill-ink-2:#A49C93;--pill-ink-3:#7B756E;',
    '--pill-line:rgba(255,255,255,.07);--pill-bub:#2B2B34;--pill-hi:#35353F;--pill-glow:rgba(143,166,191,.34);',
    '--pill-sh-1:-8px -8px 20px rgba(255,255,255,.045);--pill-sh-2:12px 14px 34px rgba(0,0,0,.42);',
    '--pill-accent:#9FB0C4}',
    '.scrim{position:absolute;inset:0;background:var(--pill-scrim,rgba(60,52,44,.22));opacity:0;transition:opacity .34s ease;pointer-events:none}',
    ':host(.open){display:block}:host(.open) .scrim{opacity:1;pointer-events:auto}',
    '.serif{font-family:"Cormorant Garamond","Noto Serif SC",Georgia,"Songti SC",serif}',

    /* 药盒本体：轻玻璃拟态 + 新拟态 */
    '.sheet{position:absolute;left:0;right:0;bottom:0;margin:0 auto;max-width:440px;',
    'background:linear-gradient(180deg,var(--pill-hi),var(--pill-paper));',
    'border-radius:32px 32px 0 0;box-shadow:var(--pill-sh-1),var(--pill-sh-2),0 -1px 0 rgba(255,255,255,.5) inset;',
    'padding:14px 16px 22px;transform:translateY(102%);transition:transform .5s cubic-bezier(.22,.9,.24,1);',
    'overflow:hidden;pointer-events:auto;backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}',
    ':host(.open) .sheet{transform:translateY(0)}',
    '.grip{width:44px;height:5px;border-radius:99px;background:var(--pill-line);margin:2px auto 12px}',

    '.head{display:flex;align-items:center;gap:12px;margin-bottom:10px}',
    '.brand{display:flex;flex-direction:column;line-height:1.1}',
    '.brand b{font-size:22px;font-weight:500;letter-spacing:.02em}',
    '.brand i{font-style:normal;font-size:10px;letter-spacing:.34em;text-transform:uppercase;color:var(--pill-ink-3)}',
    '.tray{flex:1;display:flex;gap:6px;align-items:center;overflow-x:auto;min-height:40px;padding:5px 8px;',
    'border-radius:99px;background:var(--pill-paper-2);box-shadow:inset 3px 3px 8px rgba(96,84,70,.10),inset -3px -3px 8px rgba(255,255,255,.7)}',
    ':host(.pill-dark) .tray{box-shadow:inset 3px 3px 8px rgba(0,0,0,.32),inset -3px -3px 8px rgba(255,255,255,.045)}',
    '.tray .empty{font-size:11px;color:var(--pill-ink-3);letter-spacing:.06em;white-space:nowrap}',
    '.tray .t{position:relative;flex:0 0 auto;width:38px;height:38px;border-radius:50%;display:grid;place-items:center;',
    'background:var(--pill-bub);box-shadow:0 3px 8px rgba(96,84,70,.14)}',
    '.tray .t img{width:34px;height:15px;transform:rotate(-9deg);opacity:.95}',
    '.tray .t span.x{position:absolute;top:-2px;right:-2px;width:15px;height:15px;border-radius:50%;font-size:9px;',
    'display:grid;place-items:center;background:var(--pill-paper);color:var(--pill-ink-3);cursor:pointer;',
    'box-shadow:0 1px 3px rgba(96,84,70,.18)}',
    '.ok{flex:0 0 auto;padding:9px 16px;border:0;border-radius:99px;cursor:pointer;font-size:12px;letter-spacing:.1em;',
    'color:#fff;background:linear-gradient(135deg,#A9947F,#8E7C6B);box-shadow:0 6px 16px rgba(150,124,99,.34);',
    'font-family:inherit;font-weight:300;opacity:.42;transition:opacity .25s,transform .25s}',
    '.ok.on{opacity:1}:host(.pill-dark) .ok{background:linear-gradient(135deg,#9FB0C4,#7E8FA6);box-shadow:0 6px 16px rgba(120,145,175,.30)}',
    '.ok:active{transform:scale(.96)}',

    /* 胶囊带 / 泡罩药板：切换时高度与圆角逐帧变化，形态间是"水面浮起" */
    '.body{position:relative;overflow:hidden;transition:height .46s cubic-bezier(.22,.9,.24,1)}',
    '.pane{position:absolute;left:0;right:0;top:0;transition:opacity .3s ease,transform .42s cubic-bezier(.22,.9,.24,1)}',
    '.pane.hide{opacity:0;transform:translateY(14px) scale(.97);pointer-events:none}',
    '.strip{display:flex;gap:12px;overflow-x:auto;padding:6px 2px 12px;scroll-snap-type:x proximity;-webkit-overflow-scrolling:touch}',
    '.strip::-webkit-scrollbar{display:none}',
    '.board{display:grid;grid-template-columns:repeat(4,1fr);gap:10px 8px;padding:4px 0 6px}',

    '.cell{position:relative;border:0;padding:0;background:transparent;cursor:pointer;font-family:inherit;color:inherit;',
    'display:flex;flex-direction:column;align-items:center;gap:4px;width:78px;flex:0 0 auto}',
    '.cell .cap{width:100%;height:52px;border-radius:18px;display:grid;place-items:center;position:relative;',
    'background:var(--pill-paper);box-shadow:var(--pill-sh-1),var(--pill-sh-2);transition:box-shadow .3s,transform .3s}',
    '.cell .cap img{width:74px;height:33px;transform:rotate(-8deg);transition:transform .34s cubic-bezier(.22,.9,.24,1)}',
    '.cell:hover .cap img{transform:rotate(-8deg) translateY(-2px)}',
    '.cell.on .cap{box-shadow:var(--pill-sh-1),var(--pill-sh-2),0 0 0 1.5px var(--pill-accent),0 8px 22px var(--pill-glow)}',
    '.cell.on .cap::after{content:"";position:absolute;inset:0;border-radius:18px;background:radial-gradient(60% 60% at 50% 40%,var(--pill-glow),transparent 70%);opacity:.55;animation:breathe 2.6s ease-in-out infinite}',
    '@keyframes breathe{0%,100%{opacity:.35}50%{opacity:.7}}',
    '.cell.act .cap img{animation:shake .6s ease}',
    '@keyframes shake{0%{transform:rotate(-8deg) scale(1)}30%{transform:rotate(-16deg) scale(1.10) translateY(-7px)}100%{transform:rotate(-8deg) scale(1)}}',
    '.cell .no{font-size:9px;letter-spacing:.14em;color:var(--pill-ink-3)}',
    '.cell .nm{font-size:11px;color:var(--pill-ink-2);white-space:nowrap}',
    '.cell.on .nm{color:var(--pill-ink)}',
    '.cell .more{position:absolute;right:2px;bottom:2px;font-size:9px;color:var(--pill-ink-3)}',

    '.pager{display:flex;align-items:center;justify-content:center;gap:14px;padding:2px 0 0}',
    '.pager button{border:0;background:transparent;color:var(--pill-ink-3);font-size:14px;cursor:pointer;padding:2px 6px;font-family:inherit}',
    '.pager button:disabled{opacity:.25}',
    '.pager .pi{font-size:10px;letter-spacing:.2em;color:var(--pill-ink-3)}',
    '.toggle{display:block;margin:8px auto 0;border:0;background:transparent;color:var(--pill-ink-3);',
    'font-size:10px;letter-spacing:.2em;cursor:pointer;font-family:inherit}',

    /* 详情：药从原处飞出，竖斜悬浮缓转；下面是整份药方 */
    '.detail{position:absolute;inset:0;display:none;flex-direction:column;pointer-events:auto}',
    '.detail.open{display:flex}',
    '.d-scrim{flex:1;background:var(--pill-scrim2,rgba(48,42,36,.34));backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);opacity:0;transition:opacity .3s}',
    '.detail.on .d-scrim{opacity:1}',
    '.d-card{position:relative;max-height:0;overflow:hidden;transition:max-height .5s cubic-bezier(.22,.9,.24,1);',
    'background:linear-gradient(180deg,var(--pill-hi),var(--pill-paper));border-radius:32px 32px 0 0;',
    'box-shadow:var(--pill-sh-1),var(--pill-sh-2);margin:0 auto;width:100%;max-width:440px}',
    '.detail.on .d-card{max-height:82vh}',
    '.d-in{padding:24px 22px 30px;overflow-y:auto;max-height:82vh}',
    '.d-pill{height:150px;display:grid;place-items:center;position:relative}',
    '.d-pill img{width:230px;height:103px;transform-origin:50% 50%;animation:float 7s ease-in-out infinite}',
    '@keyframes float{0%{transform:rotate(-12deg) translateY(0)}50%{transform:rotate(-4deg) translateY(-9px)}100%{transform:rotate(-12deg) translateY(0)}}',
    '.d-card .grip{margin-top:0}',
    '.d-h{display:flex;align-items:baseline;gap:10px;margin:6px 0 2px}',
    '.d-no{font-size:11px;letter-spacing:.24em;color:var(--pill-ink-3)}',
    '.d-nm{font-size:30px;font-weight:500;letter-spacing:.03em}',
    '.d-sig{font-size:10px;letter-spacing:.3em;text-transform:uppercase;color:var(--pill-ink-3);margin:0 0 16px}',
    '.d-txt{font-size:13px;line-height:2.05;color:var(--pill-ink-2);font-weight:300}',
    '.d-txt p{margin:0 0 14px}',
    '.d-txt p:first-child{color:var(--pill-ink)}',
    '.d-foot{display:flex;align-items:center;gap:10px;margin-top:18px;padding-top:14px;border-top:1px solid var(--pill-line)}',
    '.d-foot .star{border:0;background:transparent;font-size:17px;cursor:pointer;color:var(--pill-ink-3);padding:0}',
    '.d-foot .star.on{color:#D8B982}',
    '.d-foot .sp{flex:1}',
    '.d-foot .colophon{font-size:9px;letter-spacing:.28em;text-transform:uppercase;color:var(--pill-ink-3)}',
    '.d-foot .edit{border:0;background:transparent;color:var(--pill-ink-3);font-size:11px;letter-spacing:.12em;cursor:pointer;font-family:inherit}',

    /* 气泡旁标签 / 页脚 */
    ':host-context(pill-tag),:host-context(pill-taken){all:unset}'
  ].join('');

  var TAG_CSS = [
    'pill-tag, pill-taken {',
    '--pill-ink:#4A453F; --pill-ink-2:#7C766D; --pill-ink-3:#A6A099; --pill-bub:#FFFFFF; --pill-paper:#FBFAF7;',
    'font-family:"Noto Sans SC","PingFang SC",system-ui,sans-serif; font-weight:300; display:inline-flex; }',
    'html.pilulier-dark pill-tag, html.pilulier-dark pill-taken, .pilulier-dark pill-tag, .pilulier-dark pill-taken {',
    '--pill-ink:#EAE5DE; --pill-ink-2:#A49C93; --pill-ink-3:#7B756E; --pill-bub:#2B2B34; --pill-paper:#22222A; }',
    'pill-tag{ align-items:center; gap:6px; margin-top:6px; padding:5px 12px 5px 8px; border-radius:99px;',
    'background:var(--pill-bub); box-shadow:0 3px 10px rgba(96,84,70,.13); font-size:11px; color:var(--pill-ink-2);',
    'cursor:pointer; animation:tagin .4s cubic-bezier(.22,.9,.24,1) both; }',
    '@keyframes tagin{from{opacity:0;transform:translateY(6px) scale(.96)}to{opacity:1;transform:none}}',
    'pill-tag .row{display:inline-flex;align-items:center;gap:3px}',
    'pill-tag img{width:30px;height:13px;transform:rotate(-9deg)}',
    'pill-tag .lb{letter-spacing:.08em;font-size:10px;color:var(--pill-ink-3)}',
    'pill-taken{align-items:center;gap:7px;font-size:10px;letter-spacing:.1em;color:var(--pill-ink-3)}',
    'pill-taken .pr{font-family:"Cormorant Garamond","Noto Serif SC",Georgia,serif;font-style:italic;font-size:12px}',
    'pill-taken img{width:24px;height:11px;transform:rotate(-9deg);opacity:.9}',
    '.pilulier-fly-layer{position:fixed;inset:0;pointer-events:none;z-index:1200}',
    '.pilulier-fly{position:absolute;left:0;top:0;will-change:transform;filter:drop-shadow(0 8px 18px rgba(80,66,52,.32))}'
  ].join('');

  if (typeof document !== 'undefined') {
    var st = document.createElement('style');
    st.textContent = TAG_CSS;
    (document.head || document.documentElement).appendChild(st);
  }

  /* ------------------------------------------------------------ <pill-box> */

  var BoxProto = {
    __init: function () {
      var self = this;
      var sr = this.attachShadow({ mode: 'open' });
      var s = document.createElement('style');
      s.textContent = CSS;
      sr.appendChild(s);

      var root = el('div', 'root');
      this.__scrim = el('div', 'scrim');
      var sheet = el('div', 'sheet');
      var grip = el('div', 'grip');

      var head = el('div', 'head');
      var brand = el('div', 'brand');
      var b1 = el('b'); b1.className = 'serif'; b1.textContent = PILL_BRAND.mark;
      var b2 = el('i', null, 'pill box');
      brand.appendChild(b1); brand.appendChild(b2);
      this.__tray = el('div', 'tray');
      this.__ok = el('button', 'ok', '好了');
      head.appendChild(brand); head.appendChild(this.__tray); head.appendChild(this.__ok);

      var body = el('div', 'body');
      this.__stripPane = el('div', 'pane');
      this.__strip = el('div', 'strip');
      this.__stripPane.appendChild(this.__strip);
      this.__boardPane = el('div', 'pane hide');
      this.__board = el('div', 'board');
      var pager = el('div', 'pager');
      this.__prev = el('button', null, '‹');
      this.__pi = el('span', 'pi', '1 / 1');
      this.__next = el('button', null, '›');
      pager.appendChild(this.__prev); pager.appendChild(this.__pi); pager.appendChild(this.__next);
      this.__boardPane.appendChild(this.__board);
      this.__boardPane.appendChild(pager);
      body.appendChild(this.__stripPane);
      body.appendChild(this.__boardPane);
      this.__toggle = el('button', 'toggle', '全部 ›');

      sheet.appendChild(grip); sheet.appendChild(head); sheet.appendChild(body); sheet.appendChild(this.__toggle);

      // 详情
      var detail = el('div', 'detail');
      this.__dScrim = el('div', 'd-scrim');
      var dcard = el('div', 'd-card');
      var din = el('div', 'd-in');
      var dgrip = el('div', 'grip');
      this.__dPill = el('div', 'd-pill');
      this.__dHead = el('div', 'd-h');
      this.__dNo = el('span', 'd-no');
      this.__dNm = el('span', 'd-nm');
      this.__dNm.className = 'serif';
      this.__dHead.appendChild(this.__dNo); this.__dHead.appendChild(this.__dNm);
      this.__dSig = el('div', 'd-sig');
      this.__dTxt = el('div', 'd-txt');
      var dfoot = el('div', 'd-foot');
      this.__star = el('button', 'star', '☆');
      var sp = el('span', 'sp');
      this.__colophon = el('span', 'colophon', PILL_BRAND.colophon);
      this.__edit = el('button', 'edit', '编辑');
      dfoot.appendChild(this.__star); dfoot.appendChild(sp);
      dfoot.appendChild(this.__colophon); dfoot.appendChild(this.__edit);
      din.appendChild(dgrip); din.appendChild(this.__dPill); din.appendChild(this.__dHead);
      din.appendChild(this.__dSig); din.appendChild(this.__dTxt); din.appendChild(dfoot);
      dcard.appendChild(din);
      detail.appendChild(this.__dScrim); detail.appendChild(dcard);

      root.appendChild(this.__scrim); root.appendChild(sheet); root.appendChild(detail);
      sr.appendChild(root);

      this.__body = body; this.__sheet = sheet; this.__detail = detail; this.__dCard = dcard;
      this.__sroot = sr;
      this.__list = [];
      this.__picked = [];
      this.__page = 0;
      this.__mode = 'strip';
      this.__mid = null;
      this.__anchor = null;
      this.__long = null;

      this.__scrim.addEventListener('click', function () { self.close(); });
      this.__dScrim.addEventListener('click', function () { self.__closeDetail(); });
      this.__ok.addEventListener('click', function () { self.__confirm(); });
      this.__toggle.addEventListener('click', function () { self.__setMode(self.__mode === 'strip' ? 'board' : 'strip'); });
      this.__prev.addEventListener('click', function () { self.__go(-1); });
      this.__next.addEventListener('click', function () { self.__go(1); });
      this.__star.addEventListener('click', function () { self.__toggleFav(); });
      this.__edit.addEventListener('click', function () {
        if (self.__detailId) fire(self, 'pill-edit', { id: self.__detailId });
      });
      this.__tray.addEventListener('click', function (e) {
        var x = e.target.closest ? e.target.closest('.x') : null;
        if (x) { self.__unpick(x.dataset.id); }
      });
      this.__strip.addEventListener('scroll', function () { /* 惯性由浏览器给出 */ }, { passive: true });

      // 下滑收起
      var sy = 0;
      sheet.addEventListener('pointerdown', function (e) { sy = e.clientY; });
      sheet.addEventListener('pointerup', function (e) {
        if (e.clientY - sy > 90 && e.target.closest('.strip') === null) self.close();
      });

      this.__applyTheme();
    },

    __applyTheme: function () {
      var t = this.getAttribute('theme') || 'auto';
      var dark = t === 'dark' || (t === 'auto' && typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches);
      if (dark) this.classList.add('pill-dark'); else this.classList.remove('pill-dark');
      this.__dark = dark;
    },

    __build: function () {
      var self = this;
      var recent = this.__recent || [];
      var list = this.__list.slice().sort(function (a, b) {
        var ia = recent.indexOf(a.id), ib = recent.indexOf(b.id);
        if (ia >= 0 && ib >= 0) return ia - ib;
        if (ia >= 0) return -1;
        if (ib >= 0) return 1;
        return 0;
      });
      this.__ordered = list;

      var build = function (parent, withMore) {
        parent.innerHTML = '';
        var slice = withMore ? list.slice(self.__page * PAGE_SIZE, self.__page * PAGE_SIZE + PAGE_SIZE) : list;
        slice.forEach(function (p) {
          parent.appendChild(self.__cell(p, withMore));
        });
      };
      build(this.__strip, false);
      build(this.__board, true);
      var pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
      this.__pi.textContent = (this.__page + 1) + ' / ' + pages;
      this.__prev.disabled = this.__page === 0;
      this.__next.disabled = this.__page >= pages - 1;
      this.__toggle.textContent = this.__mode === 'strip' ? '全部 ›' : '收起 ‹';
    },

    __cell: function (p, withMore) {
      var self = this;
      var look = lookOf(p);
      var c = el('button', 'cell');
      c.dataset.id = p.id;
      var cap = el('div', 'cap');
      var img = document.createElement('img');
      img.src = pillDataURL(look);
      img.alt = p.name;
      cap.appendChild(img);
      c.appendChild(cap);
      c.appendChild(el('span', 'no', p.code || p.id));
      c.appendChild(el('span', 'nm', p.name));
      if (withMore) c.appendChild(el('span', 'more', '详情 ›'));
      if (this.__picked.indexOf(p.id) >= 0) c.classList.add('on');

      var lp = null;
      c.addEventListener('pointerdown', function () {
        lp = setTimeout(function () { lp = null; self.__openDetail(p.id, c); }, 480);
      });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) {
        c.addEventListener(ev, function () { if (lp) { clearTimeout(lp); lp = null; } });
      });
      c.addEventListener('click', function (e) {
        if (e.shiftKey) { self.__openDetail(p.id, c); return; }
        if (self.__picked.indexOf(p.id) >= 0) self.__unpick(p.id); else self.__pick(p.id, c);
      });
      return c;
    },

    __pick: function (id, node) {
      if (this.__picked.length >= MAX_PILLS) return;
      if (this.__picked.indexOf(id) >= 0) return;
      this.__picked.push(id);
      setPending(this.__mid, this.__picked);
      if (node) {
        node.classList.add('on', 'act');
        setTimeout(function () { node.classList.remove('act'); }, 620);
        // 药浮起晃一下，飞进头部托盘
        if (!REDUCED) {
          var cap = node.querySelector('.cap');
          var r = cap.getBoundingClientRect();
          this.__flyToTray(id, r);
        }
      }
      this.__refreshTray();
      fire(this, 'pill-pick', { messageId: this.__mid, id: id, ids: this.__picked.slice() });
    },

    __unpick: function (id) {
      var i = this.__picked.indexOf(id);
      if (i < 0) return;
      this.__picked.splice(i, 1);
      setPending(this.__mid, this.__picked);
      var cells = this.__sroot.querySelectorAll('.cell');
      for (var k = 0; k < cells.length; k++) {
        if (cells[k].dataset.id === id) cells[k].classList.remove('on');
      }
      this.__refreshTray();
      fire(this, 'pill-unpick', { messageId: this.__mid, id: id, ids: this.__picked.slice() });
    },

    __flyToTray: function (id, fromRect) {
      var self = this;
      var p = this.__byId(id);
      var url = pillDataURL(lookOf(p));
      var tr = this.__tray.getBoundingClientRect();
      var to = { left: tr.left + tr.width - 26, top: tr.top + 6, width: 40, height: 40 };
      setTimeout(function () {
        fly(fromRect, to, url, { w0: 74, w1: 34, dur: 520, fade: true, rot0: -8, rot1: 4 });
        setTimeout(function () { self.__refreshTray(); }, 380);
      }, 60);
    },

    __refreshTray: function () {
      var self = this;
      var t = this.__tray;
      t.innerHTML = '';
      if (!this.__picked.length) {
        t.appendChild(el('span', 'empty', '这一剂 · 长按看药方'));
      } else {
        this.__picked.forEach(function (id) {
          var p = self.__byId(id);
          var d = el('div', 't');
          var img = document.createElement('img');
          img.src = pillDataURL(lookOf(p));
          img.alt = p ? p.name : id;
          d.appendChild(img);
          var x = el('span', 'x', '×');
          x.dataset.id = id;
          d.appendChild(x);
          t.appendChild(d);
        });
      }
      this.__ok.classList.toggle('on', this.__picked.length > 0);
      if (this.__picked.length >= MAX_PILLS) this.__ok.textContent = '满了'; else this.__ok.textContent = '好了';
    },

    __byId: function (id) {
      var l = this.__list;
      for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i];
      return known(id);
    },

    __syncBodyHeight: function () {
      var pane = this.__mode === 'strip' ? this.__stripPane : this.__boardPane;
      var meas = pane.cloneNode(true);
      meas.style.position = 'absolute';
      meas.style.visibility = 'hidden';
      meas.classList.remove('hide');
      this.__body.appendChild(meas);
      var h = meas.offsetHeight;
      this.__body.removeChild(meas);
      this.__body.style.height = h + 'px';
    },

    __setMode: function (m) {
      var self = this;
      this.__mode = m;
      var from = m === 'strip' ? this.__boardPane : this.__stripPane;
      var to = m === 'strip' ? this.__stripPane : this.__boardPane;
      var h0 = this.__body.offsetHeight;
      from.classList.add('hide');
      to.classList.remove('hide');
      var h1 = 0;
      var meas = to.cloneNode(true);
      meas.style.position = 'absolute';
      meas.style.visibility = 'hidden';
      meas.classList.remove('hide');
      this.__body.appendChild(meas);
      h1 = meas.offsetHeight;
      this.__body.removeChild(meas);
      if (REDUCED) { this.__body.style.height = h1 + 'px'; this.__toggle.textContent = m === 'strip' ? '全部 ›' : '收起 ‹'; return; }
      this.__body.style.height = h0 + 'px';
      requestAnimationFrame(function () {
        self.__body.style.height = h1 + 'px';
        self.__toggle.textContent = m === 'strip' ? '全部 ›' : '收起 ‹';
      });
    },

    __go: function (d) {
      var pages = Math.max(1, Math.ceil((this.__ordered || this.__list).length / PAGE_SIZE));
      this.__page = Math.min(pages - 1, Math.max(0, this.__page + d));
      this.__build();
    },

    __openDetail: function (id, fromEl) {
      var self = this;
      var p = this.__byId(id);
      if (!p) return;
      this.__detailId = id;
      var look = lookOf(p);
      this.__dNo.textContent = p.code || p.id;
      this.__dNm.textContent = p.name;
      this.__dSig.textContent = PILL_BRAND.sign;
      this.__dTxt.innerHTML = '';
      String(p.text || '').split('\n').forEach(function (seg) {
        seg = seg.trim();
        if (seg) self.__dTxt.appendChild(el('p', null, seg));
      });
      this.__star.textContent = p.fav ? '★' : '☆';
      this.__star.classList.toggle('on', !!p.fav);
      this.__edit.style.display = this.hasAttribute('editable') ? '' : 'none';
      var img = document.createElement('img');
      img.src = pillDataURL(look);
      img.alt = p.name;
      this.__dPill.innerHTML = '';
      this.__dPill.appendChild(img);
      this.__detail.classList.add('open');
      requestAnimationFrame(function () { self.__detail.classList.add('on'); });
      if (fromEl && !REDUCED) {
        var r = fromEl.getBoundingClientRect();
        var tr = this.__dPill.getBoundingClientRect();
        img.style.opacity = '0';
        fly(r, { left: tr.left, top: tr.top, width: tr.width, height: 150 }, pillDataURL(look), {
          w0: 74, w1: 230, dur: 620, rot0: -8, rot1: -11, fade: false,
          done: function () { img.style.opacity = '1'; }
        });
        setTimeout(function () { img.style.opacity = '1'; }, 240);
      }
      fire(this, 'pill-detail', { id: id });
    },

    __closeDetail: function () {
      var self = this;
      this.__detail.classList.remove('on');
      setTimeout(function () { self.__detail.classList.remove('open'); self.__detailId = null; }, REDUCED ? 1 : 380);
    },

    __toggleFav: function () {
      var p = this.__byId(this.__detailId);
      if (!p) return;
      p.fav = !p.fav;
      p.favStyle = p.favStyle || 'lueur';
      this.__star.textContent = p.fav ? '★' : '☆';
      this.__star.classList.toggle('on', !!p.fav);
      fire(this, 'pill-favorite', { id: p.id, fav: p.fav, favStyle: p.favStyle });
    },

    __confirm: function () {
      var self = this;
      var ids = this.__picked.slice();
      this.close();
      if (this.__anchor && ids.length) {
        var ar = this.__anchor.getBoundingClientRect();
        var to = { left: ar.right - 30, top: ar.bottom + 4, width: 40, height: 40 };
        ids.forEach(function (id, i) {
          var p = self.__byId(id);
          var cell = self.__sroot.querySelector('.cell[data-id="' + id + '"] .cap');
          var from = cell ? cell.getBoundingClientRect() : { left: 40, top: innerHeight - 120, width: 74, height: 52 };
          setTimeout(function () {
            fly(from, to, pillDataURL(lookOf(p)), { w0: 74, w1: 30, dur: 520, rot0: -8, rot1: 6, fade: true });
          }, i * 90);
        });
      }
    },

    open: function (opts) {
      opts = opts || {};
      this.__applyTheme();
      this.__mid = opts.messageId || null;
      this.__anchor = opts.anchor || null;
      if (this.__anchor) this.__anchor.dataset.pillMid = this.__mid || '';
      this.__picked = pendingOf(this.__mid);
      this.classList.add('open');
      this.__build();
      this.__refreshTray();
      this.__syncBodyHeight();
      fire(this, 'pill-open', { messageId: this.__mid });
    },

    close: function () {
      var self = this;
      this.classList.remove('open');
      this.__closeDetail();
      setTimeout(function () {
        if (!self.classList.contains('open')) { self.__page = 0; }
      }, 400);
      fire(this, 'pill-close', { messageId: this.__mid });
    },

    openDetail: function (id, fromEl) { this.__openDetail(id, fromEl); }
  };

  if (typeof window !== 'undefined' && window.customElements) {
    var PB = function () { return Reflect.construct(HTMLElement, [], PB); };
    PB.prototype = Object.create(HTMLElement.prototype);
    Object.keys(BoxProto).forEach(function (k) { PB.prototype[k] = BoxProto[k]; });
    Object.defineProperties(PB.prototype, {
      pills: {
        get: function () { return this.__list; },
        set: function (v) {
          REGISTRY = (v || []).filter(function (p) { return p && p.id; });
          this.__list = REGISTRY.filter(injectable);
          if (this.__sroot) { this.__build(); this.__refreshTray(); }
        }
      },
      recent: {
        get: function () { return this.__recent || []; },
        set: function (v) { this.__recent = v || []; if (this.__sroot) this.__build(); }
      },
      editable: { get: function () { return this.hasAttribute('editable'); }, set: function (v) { v ? this.setAttribute('editable', '') : this.removeAttribute('editable'); } }
    });
    PB.prototype.connectedCallback = function () { if (!this.__sroot) this.__init(); };
    PB.prototype.attributeChangedCallback = function (n) { if (n === 'theme' && this.__sroot) this.__applyTheme(); };
    PB.observedAttributes = ['theme'];
    if (!window.customElements.get('pill-box')) window.customElements.define('pill-box', PB);
  }

  /* ------------------------------------------------------------ <pill-tag> */
  /* 气泡旁的「待服用」标签：显示这条消息上挂着的药 */
  if (typeof window !== 'undefined' && window.customElements) {
    var PT = function () { return Reflect.construct(HTMLElement, [], PT); };
    PT.prototype = Object.create(HTMLElement.prototype);
    PT.prototype.connectedCallback = function () {
      var self = this;
      this.__mid = this.getAttribute('message-id');
      this.__onChange = function (e) {
        if (!e.detail.messageId || e.detail.messageId === self.__mid) self.__render();
      };
      window.addEventListener('pilulier:change', this.__onChange);
      this.__render();
    };
    PT.prototype.disconnectedCallback = function () {
      window.removeEventListener('pilulier:change', this.__onChange);
    };
    PT.prototype.__render = function () {
      var ids = pendingOf(this.__mid);
      if (!ids.length) { this.style.display = 'none'; return; }
      this.style.display = '';
      var row = document.createElement('span');
      row.className = 'row';
      ids.forEach(function (id) {
        var p = known(id);
        var img = document.createElement('img');
        img.src = pillDataURL(lookOf(p));
        img.alt = p ? p.name : id;
        img.title = p ? (p.code + ' ' + p.name) : id;
        row.appendChild(img);
      });
      var lb = document.createElement('span');
      lb.className = 'lb';
      lb.textContent = '待服用 · ' + ids.length;
      this.innerHTML = '';
      this.appendChild(row);
      this.appendChild(lb);
      if (!this.__bound) {
        this.__bound = true;
        var self = this;
        this.addEventListener('click', function (e) {
          if (e.target.tagName === 'IMG') {
            var p = known(e.target.title.split(' ')[0]);
            var box = document.querySelector('pill-box');
            if (box) box.openDetail(e.target.title.split(' ')[0], e.target);
          } else {
            self.dispatchEvent(new CustomEvent('pill-tag-click', { detail: { messageId: self.__mid }, bubbles: true, composed: true }));
          }
        });
      }
    };
    if (!window.customElements.get('pill-tag')) window.customElements.define('pill-tag', PT);

    /* -------------------------------------------------------- <pill-taken> */
    /* 回复页脚：pris · 药名 */
    var PK = function () { return Reflect.construct(HTMLElement, [], PK); };
    PK.prototype = Object.create(HTMLElement.prototype);
    PK.prototype.connectedCallback = function () { this.__render(); };
    PK.prototype.__render = function () {
      var ids = String(this.getAttribute('ids') || '').split(',').filter(Boolean);
      this.innerHTML = '';
      if (!ids.length) return;
      var pr = document.createElement('span');
      pr.className = 'pr';
      pr.textContent = 'pris ·';
      this.appendChild(pr);
      ids.forEach(function (id) {
        var p = known(id);
        var img = document.createElement('img');
        img.src = pillDataURL(lookOf(p));
        img.alt = p ? p.name : id;
        img.title = p ? p.name : id;
        this.appendChild(img);
        var t = document.createElement('span');
        t.textContent = p ? p.name : id;
        this.appendChild(t);
      }, this);
    };
    if (!window.customElements.get('pill-taken')) window.customElements.define('pill-taken', PK);
  }

  var API = {
    takePending: takePending,
    pendingOf: pendingOf,
    setPending: setPending,
    clearPending: clearPending,
    renderPillSVG: renderPillSVG,
    lookOf: lookOf,
    PILL_BRAND: PILL_BRAND,
    MAX_PILLS: MAX_PILLS,
    _registry: function () { return REGISTRY; }
  };
  if (typeof window !== 'undefined') window.Pilulier = API;
  if (typeof globalThis !== 'undefined') globalThis.Pilulier = API;
})();
