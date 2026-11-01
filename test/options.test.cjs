const {test} = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {options, instance} = require('./helpers.cjs');
const merge = require('../dist/options/mergeOptions').default;
const deepMerge = require('../dist/help/deepMerge').default;
const getPathKey = require('../dist/help/getPathKey').default;
const {getAssetPath} = require('../dist/options/getProjectPaths');
const sort = require('../dist/options/sortAssetFolders').default;
const {safeName} = require('../dist/help/safeName');

test('instances and caller options stay isolated', () => {
  const input = options('.');
  input.theme.excludeFiles = ['private.json'];
  const before = structuredClone(input);
  const first = merge(input);
  first.theme.excludeFiles.push('other');
  first.chokidarOptions.awaitWriteFinish.pollInterval = 999;
  const second = merge(options('.'));
  assert.deepEqual(input, before);
  assert.deepEqual(second.theme.excludeFiles, []);
  assert.equal(second.chokidarOptions.awaitWriteFinish.pollInterval, 100);
});

for (const key of ['id', 'token', 'url']) test(`missing account.${key} fails`, () => {
  const input = options('.'); delete input.account[key];
  assert.throws(() => merge(input));
});
test('missing theme ID fails even after another valid instance', () => {
  merge(options('.'));
  const input = options('.'); delete input.theme.id;
  assert.throws(() => merge(input), /id/);
});
test('HTTPS is the default and URL preserves host including www', () => {
  const input = options('.'); delete input.account.http;
  input.account.url = 'https://www.example.com/path';
  const output = merge(input);
  assert.equal(output.account.url, 'www.example.com');
  assert.equal(output.themeUrl, 'https://www.example.com/?theme_preview=42');
  assert.equal(output.insalesApi.http, false);
});
test('deep merge rejects prototype pollution keys', () => {
  const result = deepMerge({}, JSON.parse('{"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}}}'));
  assert.equal({}.polluted, undefined);
  assert.deepEqual(result, {});
});
test('path keys only treat complete assets directory segments as aliases', () => {
  assert.equal(getPathKey('C:\\work\\my-assets-store\\assets\\js\\app.js'), 'C:/work/my-assets-store/media/app.js');
  assert.equal(getPathKey('/media/work/media/file.bin'), '/media/work/media/file.bin');
  assert.equal(getPathKey('/root/widget_types/header/snippet.js'), '/root/widget_types/header/snippet.js');
});
test('getAssetPath supports media aliases without an undefined task variable', () => {
  const app = instance('.');
  assert.equal(getAssetPath(app.paths, 'Asset::Media', 'a.js', '.js'), app.paths.folders.media + 'a.js');
  assert.equal(getAssetPath(app.paths, 'Asset::Media', 'a.js', '.js', true), app.paths.folders.script + 'a.js');
});
for (const name of ['../outside', '..\\outside', 'C:escape', '.', '..', 'NUL.txt', 'trailing.', 'bad\0name']) {
  test(`unsafe remote name ${JSON.stringify(name)} is rejected`, () => assert.throws(() => safeName(name)));
}
test('sorting refreshes stale cache and preserves widget type and backup directories', async () => {
  const app = instance('.');
  app.assets.stale = {};
  await sort.call(app, [{id: 1, type: 'SimpleWidgetType', handle: 'banner', name: 'Баннер', description: '', generation: 4, snippet_content: '', page_kinds: ['all']}]);
  assert.equal(app.assets.stale, undefined);
  const info = app.downloadList.find(item => item.insalesInfo.name === 'info.json');
  assert.equal(JSON.parse(info.content).type, 'SimpleWidgetType');
  assert.deepEqual(JSON.parse(info.content).name, {ru: 'Баннер'});
  assert.ok(info.backupPath.endsWith('/widget_types/banner/info.json'));
});
test('remote path traversal is rejected before it can produce a download path', async () => {
  const app = instance('.');
  await assert.rejects(sort.call(app, [{id: 1, type: 'Asset::Media', name: '../../escape'}]), /Invalid file name/);
});
test('non-media files and unknown media extensions can be inspected', () => {
  const app = instance('.');
  for (const file of ['templates/index.liquid', 'media/archive.bin']) {
    const info = app.getFileInfo({path: path.resolve(file), contents: Buffer.from('')}, true);
    assert.equal(info.isAsset, false);
    assert.equal(info.insalesInfo.content, '');
  }
});
