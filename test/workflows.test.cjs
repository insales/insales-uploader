const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const {directory, server, instance} = require('./helpers.cjs');
const write = require('../dist/tasks/file/write').default;
const change = require('../dist/tasks/assets/change').default;
const remove = require('../dist/tasks/assets/remove').default;

const widget = {id: 8, type: 'SimpleWidgetType', handle: 'banner', name: 'Баннер', generation: 4,
  page_kinds: ['all'], widget_list_kinds: ['content'], widget_category_handle: 'benefits', snippet_content: '<div>banner</div>', snippet_js: '', preview_url: null};

test('download finishes only after all assets and widget files have been written', async t => {
  const root = await directory(t);
  const remote = await server(t, r => {
    if (r.url === '/admin/themes/42/assets.json') return {body: [
      {id: 1, type: 'Asset::Configuration', inner_file_name: 'settings_data.json'},
      {id: 2, type: 'Asset::Snippet', inner_file_name: 'banner.liquid'}
    ]};
    if (r.url === '/admin/themes/42/widget_types.json') return {body: [widget]};
    if (r.url.endsWith('/1/raw.json')) return {body: '{\n "color": "red"\n}\n'};
    if (r.url.endsWith('/2.json')) return {body: {content: '<p>Hello</p>'}};
    return {status: 404, body: {}};
  });
  const app = instance(root, remote.host);
  await app.download();
  assert.equal(await fs.readFile(path.join(root, 'snippets/banner.liquid'), 'utf8'), '<p>Hello</p>');
  assert.equal(await fs.readFile(path.join(root, 'config/settings_data.json'), 'utf8'), '{\n "color": "red"\n}\n');
  assert.equal(await fs.readFile(path.join(root, 'widget_types/banner/snippet.liquid'), 'utf8'), widget.snippet_content);
  assert.equal(JSON.parse(await fs.readFile(path.join(root, 'widget_types/banner/info.json'), 'utf8')).type, 'SimpleWidgetType');
});
test('downloadFiles waits for downloaded data and rejects API errors', async t => {
  const root = await directory(t);
  let fail = false;
  let host;
  const remote = await server(t, r => {
    if (fail) return {status: 403, body: {}};
    if (r.url.startsWith('/admin/files.json')) return {body: [{absolute_url: `http://${host}/cdn/a.txt`}]};
    return {body: 'downloaded'};
  });
  host = remote.host;
  const app = instance(root, host);
  await app.downloadFiles();
  assert.equal(await fs.readFile(path.join(root, 'files/a.txt'), 'utf8'), 'downloaded');
  fail = true;
  await assert.rejects(app.downloadFiles(), {statusCode: 403});
});
test('new widget upload assembles info and sources into one top-level payload', async t => {
  const remote = await server(t, r => ({body: r.method === 'GET' ? [] : {id: 8}}));
  const root = await directory(t);
  const app = instance(root, remote.host);
  const folder = path.join(root, 'widget_types/banner');
  const info = {type: widget.type, handle: widget.handle, name: {ru: widget.name}, generation: 4, page_kinds: ['all'], widget_list_kinds: ['content'], widget_category_handle: 'benefits'};
  await write({path: path.join(folder, 'info.json'), content: JSON.stringify(info)});
  await write({path: path.join(folder, 'snippet.liquid'), content: '<p>new</p>'});
  await write({path: path.join(folder, 'messages.json'), content: '{"ru":{}}'});
  await change.call(app, app.getFileInfo({path: path.join(folder, 'info.json')}, true).asset, false);
  const request = remote.requests.find(r => r.method === 'POST');
  assert.equal(request.url, '/admin/themes/42/widget_types.json');
  assert.deepEqual(request.body, {...info, snippet_content: '<p>new</p>', messages: '{"ru":{}}'});
});
test('existing widget source uses PUT rather than creating a duplicate', async t => {
  const remote = await server(t, r => ({body: r.method === 'GET' ? (r.url.includes('widget_types') ? [widget] : []) : {id: 8}}));
  const app = instance(await directory(t), remote.host);
  const file = {path: path.join(app.paths.root, 'widget_types/banner/snippet.js'), contents: Buffer.from('new code')};
  await change.call(app, app.getFileInfo(file, true).asset, false);
  assert.deepEqual(remote.requests.filter(r => r.method !== 'GET').map(r => [r.method, r.url, r.body]), [
    ['PUT', '/admin/themes/42/widget_types/8.json', {snippet_js: 'new code'}]
  ]);
});
test('removing widget source clears a field; removing info deletes via widget endpoint', async t => {
  const remote = await server(t, r => ({body: r.method === 'GET' ? (r.url.includes('widget_types') ? [widget] : []) : ''}));
  const app = instance(await directory(t), remote.host);
  for (const name of ['snippet.js', 'info.json']) {
    await remove.call(app, app.getFileInfo({path: path.join(app.paths.root, 'widget_types/banner', name)}, false).asset, false);
  }
  assert.deepEqual(remote.requests.filter(r => r.method !== 'GET').map(r => [r.method, r.url, r.body]), [
    ['PUT', '/admin/themes/42/widget_types/8.json', {snippet_js: ''}],
    ['DELETE', '/admin/themes/42/widget_types/8.json', undefined]
  ]);
});
test('bulk upload updates local widgets and never removes remote widgets from a non-widget diff', async t => {
  const remote = await server(t, r => ({body: r.method === 'GET' ? (r.url.includes('widget_types') ? [widget] : []) : {id: 8}}));
  const root = await directory(t);
  const app = instance(root, remote.host);
  for (const folder of Object.values(app.paths.foldersDefaults)) await fs.mkdir(folder, {recursive: true});
  const folder = path.join(root, 'widget_types/banner');
  await write({path: path.join(folder, 'info.json'), content: JSON.stringify({type: widget.type, handle: widget.handle, name: {ru: widget.name}, generation: 4})});
  await write({path: path.join(folder, 'snippet.liquid'), content: 'updated'});
  await app.upload();
  const mutations = remote.requests.filter(r => r.method !== 'GET');
  assert.equal(mutations.length, 1);
  assert.equal(mutations[0].method, 'PUT');
  assert.equal(mutations[0].body.snippet_content, 'updated');
  assert.equal(mutations[0].body.handle, undefined);
});
test('top-level upload and download reject failed requests', async t => {
  const remote = await server(t, () => ({status: 403, body: {message: 'forbidden'}}));
  const app = instance(await directory(t), remote.host);
  await assert.rejects(app.upload(), {statusCode: 403});
  await assert.rejects(app.download(), {statusCode: 403});
});

test('bulk upload creates new assets, edits existing ones and verifies deletions', async t => {
  const assets = [
    {id: 1, type: 'Asset::Snippet', inner_file_name: 'existing.liquid'},
    {id: 2, type: 'Asset::Media', inner_file_name: 'old.css'}
  ];
  let deleted = false;
  const remote = await server(t, r => {
    if (r.url === '/admin/themes/42/assets.json' && r.method === 'GET') return {body: deleted ? [assets[0]] : assets};
    if (r.url.includes('widget_types')) return {body: []};
    if (r.method === 'DELETE') { deleted = true; return {body: ''}; }
    if (r.method === 'GET' && r.url.endsWith('/2.json')) return {status: 404, body: '<html>404</html>'};
    return {body: {id: 3}};
  });
  const root = await directory(t);
  const app = instance(root, remote.host);
  for (const folder of Object.values(app.paths.foldersDefaults)) await fs.mkdir(folder, {recursive: true});
  await write({path: path.join(root, 'snippets/existing.liquid'), content: 'changed'});
  await write({path: path.join(root, 'media/new.css'), content: 'body{}'});
  await app.upload();
  const mutations = remote.requests.filter(r => r.method !== 'GET');
  assert.deepEqual(mutations.map(r => r.method).sort(), ['DELETE', 'POST', 'PUT']);
  assert.equal(mutations.find(r => r.method === 'PUT').body.asset.content, 'changed');
  assert.equal(mutations.find(r => r.method === 'POST').body.asset.name, 'new.css');
  assert.equal(deleted, true);
});

test('uploadFiles uses base64 even for text and skips directories', async t => {
  const remote = await server(t, () => ({body: {id: 1}}));
  const root = await directory(t);
  const app = instance(root, remote.host);
  await write({path: path.join(root, 'files/a.txt'), content: 'hello'});
  await fs.mkdir(path.join(root, 'files/directory'));
  await app.uploadFiles();
  assert.equal(remote.requests.length, 1);
  assert.deepEqual(remote.requests[0].body, {file: {filename: 'a.txt', attachment: Buffer.from('hello').toString('base64')}});
});
