const { test } = require('node:test');
const assert = require('node:assert/strict');
const { harness } = require('./helpers/app-harness.cjs');

test('theme defaults to system and can be toggled via header button', async () => {
 const h = harness();
 await h.settle();
 assert.ok(h.e.themeToggle, 'themeToggle button exists');
 assert.ok(h.e.themeSelect, 'themeSelect dropdown exists');

 // Default theme in settings
 let s = JSON.parse(h.storage.get('denban.settings') || '{}');
 assert.equal(s.theme || 'system', 'system');

 // Toggle theme (system/light -> dark)
 await h.e.themeToggle.click();
 await h.settle();
 s = JSON.parse(h.storage.get('denban.settings'));
 assert.equal(s.theme, 'dark', 'Toggling switches to dark theme');
 assert.equal(h.e.themeSelect.value, 'dark', 'Syncs dropdown to dark');
 assert.match(h.e.toast.textContent, /giao diện tối/);

 // Toggle again (dark -> light)
 await h.e.themeToggle.click();
 await h.settle();
 s = JSON.parse(h.storage.get('denban.settings'));
 assert.equal(s.theme, 'light', 'Toggling again switches to light theme');
 assert.equal(h.e.themeSelect.value, 'light', 'Syncs dropdown to light');
 assert.match(h.e.toast.textContent, /giao diện sáng/);
});

test('theme can be selected via settings dropdown', async () => {
 const h = harness();
 await h.settle();

 h.e.themeSelect.value = 'dark';
 await h.e.themeSelect.dispatch('change');
 await h.settle();
 let s = JSON.parse(h.storage.get('denban.settings'));
 assert.equal(s.theme, 'dark');

 h.e.themeSelect.value = 'system';
 await h.e.themeSelect.dispatch('change');
 await h.settle();
 s = JSON.parse(h.storage.get('denban.settings'));
 assert.equal(s.theme, 'system');
 assert.match(h.e.toast.textContent, /hệ thống/);
});

test('pre-existing theme setting is respected on boot', async () => {
 const h = harness({ settings: { theme: 'dark' } });
 await h.settle();
 assert.equal(h.e.themeSelect.value, 'dark');

 const lightH = harness({ settings: { theme: 'light' } });
 await lightH.settle();
 assert.equal(lightH.e.themeSelect.value, 'light');
});

