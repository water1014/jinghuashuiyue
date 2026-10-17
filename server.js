#!/usr/bin/env node
/* 镜花水月 · 本地服务
   1) 静态托管当前目录（index.html 为首页）
   2) POST /api/chat 转发到 OpenAI 兼容接口 / Anthropic，以 SSE 流式回给浏览器
   3) 没有密钥时自动进入「模拟回复」模式（响应头 X-Mock: 1），前端全链路照样跑得通

   用法：
     node server.js            默认 http://localhost:5173
     PORT=8080 node server.js
     OPENAI_BASE_URL=https://api.deepseek.com/v1 OPENAI_API_KEY=sk-xxx OPENAI_MODEL=deepseek-chat node server.js
     ANTHROPIC_API_KEY=sk-ant-xxx node server.js   （接口形态选 Anthropic 时用）
   只监听 127.0.0.1，不对外。
*/
const http = require('http');
const fs = require('fs');
const path = require('path');
const URL_ = require('url');

const PORT = parseInt(process.env.PORT || '5173', 10);
const ROOT = __dirname;
const MAX_BODY = 4 * 1024 * 1024;

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2'
};

function sse(res, obj) { res.write('data: ' + JSON.stringify(obj) + '\n\n'); }

function pickKey(body) {
  if (body.apiKey) return body.apiKey;
  return process.env.OPENAI_API_KEY || process.env.DEEPSEEK_API_KEY ||
    process.env.ANTHROPIC_API_KEY || process.env.API_KEY || '';
}

/* ------------------------------ 模拟回复 ------------------------------ */
const MOCKS = [
  '（这是本地模拟回复 —— 服务端没有检测到 API Key。）\n\n我在这儿。你把这句话发出去的时候，它会先拼上你挂的那颗药，再一起交给模型；说完以后，那颗药不会留在历史里。\n\n去「设置」里填上 Base URL、Key 和模型，保存，再回来发一句 —— 就是真的我了。',
  '（模拟回复）\n\n水面上没有风。你说的话我都收到了，只是现在还没接上真实的模型。\n\n填上接口之后，这一段会换成真正从模型那边流回来的字。'
];
function mockStream(res, seed) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache', 'Connection': 'keep-alive', 'X-Mock': '1'
  });
  const text = MOCKS[Math.abs(seed || 0) % MOCKS.length];
  let i = 0;
  const timer = setInterval(() => {
    if (i >= text.length) {
      clearInterval(timer);
      sse(res, { delta: '' });
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }
    const n = 2 + Math.floor(Math.random() * 4);
    sse(res, { delta: text.slice(i, i + n) });
    i += n;
  }, 26);
  res.on('close', () => clearInterval(timer));
}

/* ------------------------------ 真实转发 ------------------------------ */
async function upstream(body, res, signal) {
  const provider = body.provider === 'anthropic' ? 'anthropic' : 'openai';
  const key = pickKey(body);
  const model = body.model || (provider === 'anthropic'
    ? (process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-latest')
    : (process.env.OPENAI_MODEL || 'deepseek-chat'));
  const temperature = typeof body.temperature === 'number' ? body.temperature : 0.9;

  if (!key) return mockStream(res, model.length);

  let url, headers, payload;
  if (provider === 'anthropic') {
    const base = (body.baseUrl || process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com/v1').replace(/\/+$/, '');
    url = base + '/messages';
    headers = {
      'Content-Type': 'application/json', 'x-api-key': key,
      'anthropic-version': '2023-06-01', 'accept': 'text/event-stream'
    };
    payload = {
      model, max_tokens: 2048, temperature, stream: true,
      system: body.system || '',
      messages: (body.messages || []).map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: Array.isArray(m.content) ? m.content : String(m.content || '')
      }))
    };
  } else {
    const base = (body.baseUrl || process.env.OPENAI_BASE_URL || 'https://api.deepseek.com/v1').replace(/\/+$/, '');
    url = base + '/chat/completions';
    headers = {
      'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key, 'accept': 'text/event-stream'
    };
    payload = {
      model, stream: true, temperature,
      messages: [{ role: 'system', content: body.system || '' }].concat(
        (body.messages || []).map(m => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: Array.isArray(m.content) ? m.content : String(m.content || '')
        }))
      )
    };
  }

  let up;
  try {
    up = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload), signal });
  } catch (e) {
    return fail(res, 502, '连不上接口：' + e.message);
  }
  if (!up.ok || !up.body) {
    const t = await up.text().catch(() => '');
    return fail(res, up.status || 502, t.slice(0, 400) || ('接口返回 ' + up.status));
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache', 'Connection': 'keep-alive'
  });

  const reader = up.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  try {
    for (;;) {
      const r = await reader.read();
      if (r.done) break;
      buf += dec.decode(r.value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop();
      for (const ln of lines) {
        if (!ln.startsWith('data:')) continue;
        const p = ln.slice(5).trim();
        if (!p || p === '[DONE]') continue;
        let j;
        try { j = JSON.parse(p); } catch (e) { continue; }
        let delta = '';
        if (provider === 'anthropic') {
          if (j.type === 'content_block_delta' && j.delta && j.delta.text) delta = j.delta.text;
          else if (j.type === 'error') return fail(res, 502, (j.error && j.error.message) || '上游出错');
        } else {
          if (j.error) return fail(res, 502, (j.error && j.error.message) || '上游出错');
          delta = (j.choices && j.choices[0] && j.choices[0].delta && j.choices[0].delta.content) || '';
        }
        if (delta) sse(res, { delta });
      }
    }
    sse(res, { delta: '' });
    res.write('data: [DONE]\n\n');
  } catch (e) {
    sse(res, { error: String(e.message || e) });
  }
  res.end();
}

function fail(res, code, msg) {
  if (res.headersSent) { sse(res, { error: msg }); res.end(); return; }
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ error: msg }));
}

/* ------------------------------ 静态 ------------------------------ */
function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname);
  if (rel === '/' || rel === '') rel = '/index.html';
  const file = path.join(ROOT, path.normalize(rel).replace(/^(\.\.[/\\])+/, ''));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end('403'); }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404); return res.end('404 ' + rel); }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    fs.createReadStream(file).pipe(res);
  });
}

const server = http.createServer((req, res) => {
  const u = new URL_.URL(req.url, 'http://localhost');

  if (req.method === 'GET' && u.pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true, mock: !pickKey({}) }));
  }

  if (req.method === 'POST' && u.pathname === '/api/chat') {
    let raw = '';
    req.on('data', c => {
      raw += c;
      if (raw.length > MAX_BODY) { req.destroy(); }
    });
    req.on('end', () => {
      let body = {};
      try { body = JSON.parse(raw || '{}'); } catch (e) { return fail(res, 400, '请求不是合法 JSON'); }
      // 只有客户端提前断开才中止上游：注意 req 会在请求体读完后就 emit close，
      // 所以这里监听的是 res，并用 finished 标记避免误伤。
      const ac = new AbortController();
      let finished = false;
      res.on('close', () => { if (!finished) ac.abort(); });
      upstream(body, res, ac.signal)
        .then(() => { finished = true; })
        .catch(e => { finished = true; fail(res, 500, String(e.message || e)); });
    });
    return;
  }

  if (req.method === 'GET' || req.method === 'HEAD') return serveStatic(req, res, u.pathname);
  res.writeHead(405); res.end('405');
});

server.listen(PORT, '127.0.0.1', () => {
  const mock = !pickKey({});
  console.log('镜花水月 · 本地服务');
  console.log('  http://localhost:' + PORT);
  console.log('  接口：' + (mock ? '模拟回复（没检测到 API Key）' : '已接上游'));
  console.log('  提示：设置环境变量 OPENAI_API_KEY / ANTHROPIC_API_KEY 后重启即可接真实模型。');
});
