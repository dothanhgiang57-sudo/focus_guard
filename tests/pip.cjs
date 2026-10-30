const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const source = fs.readFileSync(path.join(__dirname, '../browser-pip.js'), 'utf8');

class Target {
 constructor() { this.listeners = new Map(); this.attributes = {}; this.children = []; this.dataset = {}; this.textContent = ''; }
 addEventListener(type, listener) {
  if (!this.listeners.has(type)) this.listeners.set(type, new Set());
  this.listeners.get(type).add(listener);
 }
 removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener); }
 dispatch(type) { return Promise.all([...(this.listeners.get(type) || [])].map(fn => fn({ type }))); }
 setAttribute(key, value) { this.attributes[key] = value; }
 append(...children) { this.children.push(...children); }
 prepend(...children) { this.children.unshift(...children); }
 replaceChildren(...children) { this.children = children; }
 remove() { this.removed = true; }
}

function harness(options = {}) {
 const doc = new Target();
 doc.hidden = false;
 doc.pictureInPictureEnabled = options.supported !== false;
 doc.pictureInPictureElement = null;
 doc.body = new Target(); doc.head = new Target(); doc.documentElement = new Target();
 const cameraVideo = new Target();
 cameraVideo.ownerDocument = doc; cameraVideo.readyState = options.readyState ?? 4; cameraVideo.paused = false;
 cameraVideo.requestPictureInPicture = () => { throw new Error('Raw webcam video must never be used for PiP'); };
 const video = new Target();
 video.readyState = 4; video.paused = false;
 video.play = () => { video.paused = false; return Promise.resolve(); };
 video.pause = () => { video.paused = true; };
 const button = new Target(), autoToggle = new Target(), status = new Target();
 let camera = options.camera !== false, handler = null, requests = 0, exits = 0, pendingResolve, pendingReject;
 const registrations = [], notices = [], changes = [], frames = [], paintedText = [], windows = [], timers = new Map();
 let timerId = 0;
 const state = { focus: 'Nhìn thẳng', remaining: '24:59', phase: 'Đang học', warning: '', ...options.state };
 const captureTrack = { stopped: false, stop() { this.stopped = true; }, requestFrame() {} };
 const capture = { getTracks: () => [captureTrack], getVideoTracks: () => [captureTrack] };
 const ctx = { fillRect(x, y, w, h) { frames.push({ color: this.fillStyle, x, y, w, h }); }, fillText(text) { paintedText.push(text); }, measureText: text => ({ width: text.length * 18 }) };
 doc.createElement = tag => {
  if (tag === 'video') return video;
  const node = new Target(); node.tag = tag;
  if (tag === 'canvas') { node.getContext = () => ctx; if (!options.noCanvas) node.captureStream = () => capture; }
  return node;
 };
 const storage = new Map(options.saved === undefined ? [] : [['denban.pip.auto', options.saved]]);
 storage.set('denban.settings', 'keep-existing-settings');
 const mediaSession = { setActionHandler(action, fn) { registrations.push({ action, fn }); if (options.unsupportedAction) throw new TypeError('Unsupported action'); handler = fn; } };
 function newWindow() {
  const result = new Target(); result.closed = false;
  const pipDoc = new Target(); pipDoc.body = new Target(); pipDoc.head = new Target(); pipDoc.documentElement = new Target(); pipDoc.createElement = tag => { const node = new Target(); node.tag = tag; return node; };
  result.document = pipDoc;
  result.setInterval = fn => { timers.set(++timerId, fn); return timerId; };
  result.clearInterval = id => timers.delete(id);
  result.close = () => { if (result.closed) return; exits++; result.closed = true; result.dispatch('pagehide'); };
  windows.push(result); return result;
 }
 const win = {
  navigator: { mediaSession: options.noMediaSession ? undefined : mediaSession },
  localStorage: {
   getItem(key) { if (options.storageThrows) throw new Error('Storage blocked'); return storage.get(key) ?? null; },
   setItem(key, value) { if (options.storageThrows) throw new Error('Storage blocked'); storage.set(key, value); }
  }
 };
 doc.defaultView = win;
 doc.exitPictureInPicture = () => {
  exits++;
  const current = doc.pictureInPictureElement; doc.pictureInPictureElement = null;
  current?.dispatch?.('leavepictureinpicture');
  return Promise.resolve();
 };
 const request = () => {
  requests++;
  if (options.requestThrows) throw new Error('Activation missing');
  if (options.requestRejects) return Promise.reject(new Error('Permission denied'));
  if (options.deferred) return new Promise((resolve, reject) => { pendingResolve = resolve; pendingReject = reject; });
  if (options.document) return Promise.resolve(newWindow());
  doc.pictureInPictureElement = video; video.dispatch('enterpictureinpicture'); return Promise.resolve({});
 };
 if (options.document) win.documentPictureInPicture = { requestWindow: request };
 video.requestPictureInPicture = request;
 if (options.noRequestMethod) delete video.requestPictureInPicture;
 vm.runInNewContext(source, { window: win, document: doc });
 const controller = new win.BrowserCameraPiP({ video: cameraVideo, button, autoToggle, status, hasCamera: () => camera, getState: () => state, onChange: active => changes.push(active), notify: text => notices.push(text) });
 return {
  controller, doc, video, cameraVideo, button, autoToggle, status, registrations, storage, notices, state, frames, paintedText, changes, windows, timers, captureTrack,
  get requests() { return requests; }, get exits() { return exits; }, get handler() { return handler; },
  setCamera(value) { camera = value; controller.sync(); },
  resolve(element = video) {
   if (options.document) { const result = newWindow(); pendingResolve(result); return result; }
   doc.pictureInPictureElement = element;
   if (element === video) video.dispatch('enterpictureinpicture');
   pendingResolve({});
  },
  reject() { pendingReject(new Error('Permission denied')); }
 };
}

const settle = () => new Promise(resolve => setImmediate(resolve));

test('camera capture registers one native auto-PiP handler and never requests from visibilitychange', async () => {
 const h = harness();
 assert.equal(h.autoToggle.checked, true);
 assert.equal(h.registrations.length, 1);
 assert.equal(h.registrations[0].action, 'enterpictureinpicture');
 for (let index = 0; index < 20; index++) h.controller.sync();
 assert.equal(h.registrations.length, 1, 'Frequent render syncs do not replace the native handler');
 h.doc.hidden = true;
 await h.doc.dispatch('visibilitychange');
 assert.equal(h.requests, 0, 'Tab visibility alone cannot grant user activation');
 await h.handler();
 assert.equal(h.requests, 1, 'Browser callback can request PiP without a page click');
 assert.equal(h.controller.isActive(), true);
 h.doc.hidden = false;
 await h.doc.dispatch('visibilitychange');
 assert.equal(h.exits, 1);
 assert.equal(h.controller.isActive(), false);
});

test('manual button requests synchronously, toggles only own PiP, and remains open on tab return', async () => {
 const h = harness();
 const click = h.button.dispatch('click');
 assert.equal(h.requests, 1, 'Request occurs in the click callback before an await');
 await click;
 assert.equal(h.button.textContent, 'Đóng cửa sổ nổi');
 assert.equal(h.button.attributes['aria-pressed'], 'true');
 h.doc.hidden = true; await h.doc.dispatch('visibilitychange');
 h.doc.hidden = false; await h.doc.dispatch('visibilitychange');
 assert.equal(h.exits, 0, 'Returning only closes automatically opened windows');
 await h.button.dispatch('click');
 assert.equal(h.exits, 1);
 assert.equal(h.button.textContent, 'Mở cửa sổ nổi');
});

test('auto preference persists separately and registration follows camera and toggle', async () => {
 const h = harness({ camera: false });
 assert.equal(h.handler, null);
 assert.equal(h.button.disabled, true);
 h.setCamera(true);
 assert.equal(typeof h.handler, 'function');
 const staleHandler = h.handler;
 h.autoToggle.checked = false;
 await h.autoToggle.dispatch('change');
 assert.equal(h.handler, null);
 assert.equal(h.storage.get('denban.pip.auto'), 'false');
 assert.equal(h.storage.get('denban.settings'), 'keep-existing-settings');
 await staleHandler();
 assert.equal(h.requests, 0, 'An already queued native callback cannot reopen after auto is disabled');
 await h.button.dispatch('click');
 assert.equal(h.controller.isActive(), true, 'Manual PiP still works with automatic PiP disabled');
 h.setCamera(false); await settle();
 assert.equal(h.controller.isActive(), false);
 h.setCamera(true);
 assert.equal(h.handler, null);
 h.autoToggle.checked = true;
 await h.autoToggle.dispatch('change');
 assert.equal(typeof h.handler, 'function');
 h.setCamera(false);
 assert.equal(h.handler, null);
 assert.equal(harness({ saved: 'false' }).autoToggle.checked, false);
 assert.doesNotThrow(() => harness({ storageThrows: true }));
});

test('unsupported APIs and unsupported native action degrade to manual support without repeated errors', async () => {
 for (const options of [{ supported: false }, { noRequestMethod: true }]) {
  const h = harness(options);
  assert.equal(h.button.disabled, true);
  assert.equal(h.autoToggle.disabled, true);
  assert.equal(h.registrations.length, 0);
  await h.button.dispatch('click');
  assert.equal(h.requests, 0);
 }
 const h = harness({ unsupportedAction: true });
 h.controller.sync(); h.controller.sync();
 assert.equal(h.registrations.length, 1);
 assert.equal(h.autoToggle.disabled, true);
 assert.equal(h.button.disabled, false);
 await h.button.dispatch('click');
 assert.equal(h.controller.isActive(), true);
 const missing = harness({ noMediaSession: true });
 await missing.button.dispatch('click');
 assert.equal(missing.controller.isActive(), true);
});

test('camera unavailable, paused, and unready video never request PiP', async () => {
 for (const options of [{ camera: false }, { readyState: 1 }]) {
  const h = harness(options);
  await h.button.dispatch('click');
  if (h.handler) { h.doc.hidden = true; await h.handler(); }
  assert.equal(h.requests, 0);
 }
 const h = harness();
 h.video.paused = true; h.controller.sync();
 assert.equal(h.button.disabled, true);
 h.doc.hidden = true; await h.handler();
 assert.equal(h.requests, 0);
 const loading = harness({ readyState: 0 });
 assert.equal(loading.button.disabled, true);
 loading.cameraVideo.readyState = 4;
 await loading.video.dispatch('loadeddata');
 assert.equal(loading.button.disabled, false, 'Camera metadata can enable controls before a session starts');
 loading.video.paused = true;
 await loading.video.dispatch('pause');
 assert.equal(loading.button.disabled, true);
 loading.video.paused = false;
 await loading.video.dispatch('playing');
 assert.equal(loading.button.disabled, false);
});

test('stop, dispose, auto-off, and tab-return invalidate pending automatic windows', async () => {
 for (const invalidate of [
  async h => h.setCamera(false),
  async h => h.controller.dispose(),
  async h => { h.autoToggle.checked = false; await h.autoToggle.dispatch('change'); },
  async h => { h.doc.hidden = false; await h.doc.dispatch('visibilitychange'); },
  async h => h.controller.close()
 ]) {
  const h = harness({ deferred: true });
  h.doc.hidden = true;
  const request = h.handler();
  await invalidate(h);
  await settle();
  assert.equal(h.requests, 1, 'Cancellation can wait for a native promise without a microtask loop');
  h.resolve(); await request;
  assert.equal(h.controller.isActive(), false);
  assert.equal(h.exits, 1, 'A late window is closed after its request becomes obsolete');
 }
 const manual = harness({ deferred: true });
 const request = manual.button.dispatch('click');
 manual.controller.dispose();
 manual.resolve(); await request;
 assert.equal(manual.controller.isActive(), false);
 assert.equal(manual.handler, null);
 assert.equal(manual.button.listeners.get('click').size, 0);
});

test('closing, stopping, and late resolutions never close a different video PiP', async () => {
 const h = harness();
 const foreign = new Target();
 h.doc.pictureInPictureElement = foreign;
 await h.controller.close();
 h.setCamera(false);
 await h.controller.dispose();
 assert.equal(h.exits, 0);
 assert.equal(h.doc.pictureInPictureElement, foreign);
 const late = harness({ deferred: true });
 late.doc.hidden = true;
 const request = late.handler();
 late.controller.close();
 // Resolve the request after another video has already taken ownership.
 late.resolve(foreign); await request;
 assert.equal(late.exits, 0);
 assert.equal(late.doc.pictureInPictureElement, foreign);
});

test('request rejection and synchronous exceptions are handled and manual retry stays available', async () => {
 for (const options of [{ requestRejects: true }, { requestThrows: true }]) {
  const h = harness(options);
  await h.button.dispatch('click');
  assert.equal(h.notices.length, 1);
  assert.equal(h.controller.pending, null);
  assert.equal(h.button.disabled, false);
  assert.equal(h.controller.isActive(), false);
 }
 const h = harness({ deferred: true });
 const request = h.button.dispatch('click');
 h.controller.dispose(); h.reject(); await request;
 assert.equal(h.notices.length, 0, 'A rejected obsolete request cannot notify after disposal');
});

test('document PiP shows only live focus, remaining time, and alert; an alert turns the full panel red', async () => {
 const h = harness({ document: true });
 const click = h.button.dispatch('click');
 assert.equal(h.requests, 1, 'Document PiP is requested inside the click activation');
 await click;
 const panel = h.controller.panel;
 assert.equal(h.controller.isActive(), true);
 assert.equal(h.windows[0].document.body.children[0].children.length, 3);
 assert.equal(panel.focus.textContent, 'Nhìn thẳng');
 assert.equal(panel.remaining.textContent, '24:59');
 assert.equal(panel.phase.textContent, 'Đang học');
 assert.equal(panel.warning.textContent, 'Chưa có cảnh báo');
 assert.equal(panel.body.dataset.alarm, 'false');
 assert.equal(h.doc.body.children.length, 0, 'Document mode never creates a camera or canvas video');
 h.state.focus = 'Nhìn sang trái'; h.state.remaining = '24:58'; h.state.warning = 'Quay đầu sang trái';
 h.controller.sync();
 assert.equal(panel.focus.textContent, 'Nhìn sang trái');
 assert.equal(panel.remaining.textContent, '24:58');
 assert.equal(panel.warning.textContent, 'Quay đầu sang trái');
 assert.equal(panel.body.dataset.alarm, 'true');
 assert.equal(panel.mark.textContent, '!');
 assert.match(h.windows[0].document.head.children[0].textContent, /body\[data-alarm="true"\]\{background:#981b2b/);
 h.state.warning = '<img src=x onerror=alert(1)>'; h.controller.refresh();
 assert.equal(panel.warning.textContent, h.state.warning, 'Alert text is not parsed as HTML');
 h.state.focus = 'Cúi đầu'; h.state.warning = ''; h.state.remaining = '24:57';
 for (const tick of h.timers.values()) tick();
 assert.equal(panel.focus.textContent, 'Cúi đầu');
 assert.equal(panel.remaining.textContent, '24:57');
 assert.equal(panel.body.dataset.alarm, 'false', 'Recovering restores the normal background');
 await h.controller.dispose();
 assert.equal(h.timers.size, 0);
 assert.deepEqual(h.changes, [true, false]);
});

test('document PiP keeps manual windows, closes automatic windows on return and unregisters on stop', async () => {
 const h = harness({ document: true });
 h.doc.hidden = true; await h.handler();
 assert.equal(h.controller.isActive(), true);
 h.doc.hidden = false; await h.doc.dispatch('visibilitychange');
 assert.equal(h.controller.isActive(), false);
 await h.button.dispatch('click');
 h.doc.hidden = true; await h.doc.dispatch('visibilitychange');
 h.doc.hidden = false; await h.doc.dispatch('visibilitychange');
 assert.equal(h.controller.isActive(), true);
 h.setCamera(false); await settle();
 assert.equal(h.controller.isActive(), false);
 assert.equal(h.handler, null);
 assert.equal(h.timers.size, 0);
});

test('late document PiP windows close after cancellation without rendering or leaking timers', async () => {
 for (const cancel of [h => h.controller.dispose(), h => h.setCamera(false), h => { h.doc.hidden = false; return h.doc.dispatch('visibilitychange'); }]) {
  const h = harness({ document: true, deferred: true });
  h.doc.hidden = true; const request = h.handler();
  await cancel(h); await settle();
  const late = h.resolve(); await request;
  assert.equal(late.closed, true);
  assert.equal(h.controller.isActive(), false);
  assert.equal(h.timers.size, 0);
  assert.equal(late.document.body.children.length, 0);
 }
 for (const option of [{ requestRejects: true }, { requestThrows: true }]) {
  const h = harness({ document: true, ...option }); await h.button.dispatch('click');
  assert.equal(h.notices.length, 1); assert.equal(h.button.disabled, false);
 }
});

test('video PiP fallback renders the same text and red alert without capturing webcam pixels', async () => {
 const h = harness();
 assert.equal(h.video.srcObject.getVideoTracks()[0], h.captureTrack);
 assert.equal(h.doc.body.children[0], h.video);
 assert.ok(h.paintedText.includes('Nhìn thẳng'));
 assert.ok(h.paintedText.includes('24:59'));
 await h.button.dispatch('click');
 assert.equal(h.doc.pictureInPictureElement, h.video);
 assert.notEqual(h.video, h.cameraVideo);
 h.state.warning = 'Có thể đang nhìn điện thoại'; h.state.focus = 'Nhìn thẳng'; h.controller.sync();
 const fullBackground = h.frames.filter(frame => frame.w === 640 && frame.h === 660).at(-1);
 assert.equal(fullBackground.color, '#981b2b');
 assert.ok(h.paintedText.includes('!  CẢNH BÁO'));
 h.state.warning = ''; h.controller.refresh();
 assert.equal(h.frames.filter(frame => frame.w === 640).at(-1).color, '#f2f6ed');
 await h.controller.dispose();
 assert.equal(h.captureTrack.stopped, true);
 assert.equal(h.video.srcObject, null);
 assert.equal(h.video.removed, true);
 const unsupported = harness({ noCanvas: true });
 assert.equal(unsupported.button.disabled, true);
 assert.equal(unsupported.registrations.length, 0);
});
