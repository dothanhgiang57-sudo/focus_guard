'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const http = require('node:http');
const { createApp } = require('../server.cjs');

async function start(t) {
  const server = createApp();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  t.after(() => new Promise(resolve => {
    server.close(resolve);
    server.closeAllConnections();
  }));
  return { server, base: `http://127.0.0.1:${server.address().port}` };
}

test('server serves the camera app and model files, while hiding private files', async t => {
  const { base } = await start(t);
  const index = await fetch(base + '/');
  assert.equal(index.status, 200);
  assert.match(await index.text(), /id="cameraScreen"/);
  for (const file of ['/alert-core.js', '/browser-ai.js', '/browser-pip.js', '/ai-worker.js']) assert.equal((await fetch(base + file)).status, 200);
  const model = await fetch(base + '/models/face_landmarker.task', { method: 'HEAD' });
  assert.equal(model.status, 200); assert.ok(Number(model.headers.get('content-length')) > 0);
  const wasm = await fetch(base + '/vendor/wasm/vision_wasm_internal.wasm', { method: 'HEAD' });
  assert.equal(wasm.headers.get('content-type'), 'application/wasm');
  for (const file of ['/.env', '/.env.example', '/server.cjs', '/package.json', '/tests/server.cjs', '/vendor/%2e%2e/.env', '/models/..%2f..%2f.env']) {
    assert.equal((await fetch(base + file)).status, 404, file);
  }
});


test('removed homework endpoints and assets return 404', async t => {
  const { base } = await start(t);
  for (const route of ['/api/tutor/status', '/api/tutor/curriculum', '/api/tutor/chat', '/tutor.js', '/vendor/katex/katex.min.js']) {
    for (const method of ['GET', 'POST', 'OPTIONS']) assert.equal((await fetch(base + route, { method })).status, method !== 'GET' && !route.startsWith('/api/') ? 405 : 404);
  }
  const html = await (await fetch(base + '/')).text();
  assert.doesNotMatch(html, /tutor|katex|Hỏi bài AI/);
  assert.equal((await fetch(base + '/', {headers: {Origin: 'https://example.com'}})).status, 403);
});
