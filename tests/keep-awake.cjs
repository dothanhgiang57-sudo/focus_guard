const { test } = require('node:test');
const assert = require('node:assert/strict');
const { harness } = require('./helpers/app-harness.cjs');

test('keepAwake defaults to true and switch is checked', async () => {
 const h = harness();
 await h.settle();
 assert.ok(h.e.keepAwakeToggle, 'keepAwakeToggle element exists');
 assert.equal(h.e.keepAwakeToggle.checked, true, 'Defaults to enabled');

 // Default setting
 let s = JSON.parse(h.storage.get('denban.settings') || '{}');
 assert.notEqual(s.keepAwake, false);
});

test('keepAwake toggle persists changes and shows feedback toast', async () => {
 const h = harness();
 await h.settle();

 // Disable keepAwake
 h.e.keepAwakeToggle.checked = false;
 await h.e.keepAwakeToggle.dispatch('change');
 await h.settle();

 let s = JSON.parse(h.storage.get('denban.settings'));
 assert.equal(s.keepAwake, false, 'Saved as disabled');
 assert.match(h.e.toast.textContent, /Đã tắt chống ngủ đông/);

 // Re-enable keepAwake
 h.e.keepAwakeToggle.checked = true;
 await h.e.keepAwakeToggle.dispatch('change');
 await h.settle();

 s = JSON.parse(h.storage.get('denban.settings'));
 assert.equal(s.keepAwake, true, 'Saved as enabled');
 assert.match(h.e.toast.textContent, /Đã bật chống ngủ đông/);
});

test('pre-existing keepAwake setting is restored on boot', async () => {
 const h = harness({ settings: { keepAwake: false } });
 await h.settle();
 assert.equal(h.e.keepAwakeToggle.checked, false, 'Honors stored false value');
});

test('session runs, pauses, and finishes smoothly with keepAwake enabled', async () => {
 const h = harness();
 await h.settle();

 await h.e.startBtn.click();
 await h.advance(2000);
 assert.equal(h.e.sessionTime.textContent, '00:02');

 await h.e.pauseBtn.click();
 await h.advance(5000);
 assert.equal(h.e.sessionTime.textContent, '00:02', 'Paused time does not advance');

 await h.e.pauseBtn.click();
 await h.advance(3000);
 assert.equal(h.e.sessionTime.textContent, '00:05', 'Resumed time advances');

 const ending = h.e.finishBtn.click();
 await h.e.confirmDialog.close('confirm');
 await ending;

 const records = JSON.parse(h.storage.get('denban.history'));
 assert.equal(records.length, 1);
 assert.equal(records[0].elapsed, 5000);
});

