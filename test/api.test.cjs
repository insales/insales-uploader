const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const {directory, server, instance} = require('./helpers.cjs');
const Client = require('../dist/insalesApi/client').default;
const editWidget = require('../dist/insalesApi/editWidgetType').default;
const removeAsset = require('../dist/insalesApi/removeAsset').default;
const listFile = require('../dist/insalesApi/listFile').default;
const getAsset = require('../dist/insalesApi/getAsset').default;
const updateAssets = require('../dist/insalesApi/updateAssets').default;

test('API methods use JSON resources, Basic auth and correct body envelopes', async t => {
  const remote = await server(t, () => ({body: {id: 7}}));
  const api = Client({id: 'key', http: true});
  const o = {url: remote.host, token: 'password', theme: 42, assetId: 7, widgetId: 8};
  const data = {type: 'SimpleWidgetType', handle: 'test', snippet_content: 'Liquid'};
  await api.listThemes(o);
  await api.listAsset(o);
  await api.getAsset(o);
  await api.uploadAsset({...o, asset: {name: 'banner', content: '<div/>'}});
  await api.editAsset({...o, asset: {content: 'new'}});
  await api.removeAsset(o);
  await api.listWidgetTypes(o);
  await api.uploadWidgetType({...o, data});
  await api.editWidgetType({...o, data: {snippet_content: ''}});
  await api.removeWidgetType(o);
  await api.uploadFile({...o, files: {file: {filename: 'a.txt', attachment: 'YQ=='}}});
  assert.deepEqual(remote.requests.map(r => [r.method, r.url]), [
    ['GET', '/admin/themes.json'], ['GET', '/admin/themes/42/assets.json'], ['GET', '/admin/themes/42/assets/7.json'],
    ['POST', '/admin/themes/42/assets.json'], ['PUT', '/admin/themes/42/assets/7.json'], ['DELETE', '/admin/themes/42/assets/7.json'],
    ['GET', '/admin/themes/42/widget_types.json'], ['POST', '/admin/themes/42/widget_types.json'],
    ['PUT', '/admin/themes/42/widget_types/8.json'], ['DELETE', '/admin/themes/42/widget_types/8.json'], ['POST', '/admin/files.json']
  ]);
  assert.deepEqual(remote.requests[3].body, {asset: {name: 'banner', content: '<div/>'}});
  assert.deepEqual(remote.requests[7].body, data);
  assert.deepEqual(remote.requests[10].body, {file: {filename: 'a.txt', attachment: 'YQ=='}});
  for (const request of remote.requests) {
    assert.equal(request.headers.authorization, 'Basic ' + Buffer.from('key:password').toString('base64'));
    assert.equal(request.headers.accept, 'application/json');
    if (request.body) assert.equal(request.headers['content-type'], 'application/json');
  }
});

for (const [status, body] of [[403, {message: 'Недостаточно прав'}], [404, '<html>Not found</html>'], [422, {handle: ['unknown attribute']}], [503, 'Unavailable']]) {
  test(`API ${status} keeps status and body, without exposing credentials`, async t => {
    const remote = await server(t, () => ({status, body}));
    await assert.rejects(Client({id: 'key', http: true}).listThemes({url: remote.host, token: 'secret-password'}), error => {
      assert.equal(error.statusCode, status);
      assert.deepEqual(error.response.data, body);
      assert.ok(!error.message.includes('secret-password'));
      return true;
    });
  });
}
test('API preserves raw JSON text exactly, rejects malformed JSON metadata, accepts empty DELETE', async t => {
  const text = '{\n  "color": "red"\n}\n';
  const remote = await server(t, r => ({body: r.url.endsWith('/raw.json') ? text : r.method === 'DELETE' ? '' : 'broken'}));
  const api = Client({id: 'key', http: true});
  const o = {url: remote.host, token: 'secret', theme: 42, assetId: 1};
  assert.equal((await api.getAssetRaw(o)).data, text);
  await assert.rejects(api.getAsset(o), /Invalid JSON/);
  await api.removeAsset(o);
});
test('API timeout and network errors reject instead of hanging', async t => {
  const remote = await server(t, async () => { await new Promise(resolve => setTimeout(resolve, 100)); return {body: []}; });
  await assert.rejects(Client({id: 'key', http: true, timeout: 10}).listThemes({url: remote.host, token: 'secret'}));
  const broken = Client({id: 'key', http: true, timeout: 50});
  await assert.rejects(broken.listThemes({url: '127.0.0.1:1', token: 'secret'}));
});
test('authenticated requests refuse redirects', async t => {
  const target = await server(t, () => ({body: []}));
  const remote = await server(t, () => ({status: 302, headers: {Location: `http://${target.host}/admin/themes.json`}}));
  await assert.rejects(Client({id: 'key', http: true}).listThemes({url: remote.host, token: 'secret'}));
  assert.equal(target.requests.length, 0);
});

test('widget edits map preview base64, ignore unknown files and omit immutable metadata', async t => {
  const remote = await server(t, () => ({body: {id: 8}}));
  const app = instance(await directory(t), remote.host);
  await editWidget({name: 'preview.jpg', base64: 'YWJj'}, 8, 'preview.jpg', app.options, false);
  await editWidget({name: 'unknown.txt', content: 'ignored'}, 8, 'unknown.txt', app.options, false);
  await editWidget({name: 'info.json', content: JSON.stringify({type: 'SimpleWidgetType', handle: 'banner', name: {ru: 'Баннер'}, widget_category_handle: 'benefits', block_template_handle: 'system-benefit'})}, 8, 'info.json', app.options, false);
  assert.equal(remote.requests.length, 2);
  assert.deepEqual(remote.requests[0].body, {preview_base64: 'YWJj'});
  assert.deepEqual(remote.requests[1].body, {name: {ru: 'Баннер'}, widget_category_handle: 'benefits', block_template_handle: 'system-benefit'});
});

for (const method of ['editAsset', 'uploadAsset', 'uploadFile', 'uploadWidgetType', 'editWidgetType', 'removeWidgetType']) {
  test(`${method} rejects a failed request`, async t => {
    const remote = await server(t, () => ({status: 422, body: {message: 'invalid'}}));
    const app = instance(await directory(t), remote.host);
    const operation = require(`../dist/insalesApi/${method}`).default;
    const data = {name: method === 'editWidgetType' ? 'snippet.js' : 'a.txt', content: 'text', handle: 'banner'};
    const call = method.startsWith('edit') ? operation(data, 7, 'a.txt', app.options, false)
      : method.startsWith('remove') ? operation(7, 'a.txt', app.options, {}, false) : operation(data, 'a.txt', app.options, false);
    await assert.rejects(call, {statusCode: 422});
  });
}
test('asset delete verifies removal and preserves cache when API silently refuses', async t => {
  let removed = false;
  const remote = await server(t, r => r.method === 'DELETE' ? {body: ''} : {status: removed ? 404 : 200, body: removed ? '<html>404</html>' : {id: 7}});
  const app = instance(await directory(t), remote.host);
  const assets = {'a.txt': {id: 7}};
  await assert.rejects(removeAsset(7, 'a.txt', app.options, assets, false), /did not remove/);
  assert.deepEqual(assets['a.txt'], {id: 7});
  removed = true;
  await removeAsset(7, 'a.txt', app.options, assets, false);
  assert.equal(assets['a.txt'], undefined);
});
test('failed delete preserves cached asset', async t => {
  const remote = await server(t, () => ({status: 403, body: {message: 'forbidden'}}));
  const app = instance(await directory(t), remote.host);
  const assets = {'a.txt': {id: 7}};
  await assert.rejects(removeAsset(7, 'a.txt', app.options, assets, false), {statusCode: 403});
  assert.equal(assets['a.txt'].id, 7);
});
test('updateAssets fetches widgets even when editing a widget and keeps original errors', async t => {
  let fail = false;
  const remote = await server(t, r => fail ? {status: 403, body: {}} : {body: r.url.includes('widget_types') ? [{id: 8, handle: 'banner'}] : [{id: 7, type: 'Asset::Media'}]});
  const app = instance(await directory(t), remote.host);
  assert.equal((await updateAssets(app.options, 'Asset::Widget')).length, 2);
  fail = true;
  await assert.rejects(updateAssets(app.options), {statusCode: 403});
});
test('account files paginate and retain CDN hostname while decoding filenames', async t => {
  const remote = await server(t, r => {
    const url = new URL(r.url, 'http://test');
    assert.equal(url.searchParams.get('per_page'), '100');
    const count = url.searchParams.get('page') === '1' ? 100 : 1;
    const offset = (Number(url.searchParams.get('page')) - 1) * 100;
    return {body: Array.from({length: count}, (_, i) => ({id: offset + i + 1, absolute_url: `https://cdn.example.com/files/файл%20${offset + i}.txt?timestamp=1`}))};
  });
  const app = instance(await directory(t), remote.host);
  const files = await listFile(app.options, app.paths);
  assert.equal(files.length, 101);
  assert.ok(files[0].url.startsWith('https://cdn.example.com/'));
  assert.equal(files[0].name, 'файл 0.txt');
  assert.ok(!files[0].path.includes('?'));
});

test('account files accept real extensionless URLs without Windows trailing dots or filename collisions', async t => {
  const names = ['photo.', 'photo', 'Photo', 'photo-1', 'image%20.jpg', 'trailing%20'];
  const remote = await server(t, () => ({body: names.map((name, i) => ({id: i + 1, absolute_url: `https://cdn.example.com/files/${i}/original/${name}?v=1`}))}));
  const app = instance(await directory(t), remote.host);
  const files = await listFile(app.options, app.paths);
  assert.deepEqual(files.map(f => f.name), ['photo-1-2', 'photo-2', 'Photo-3', 'photo-1', 'image .jpg', 'trailing']);
  assert.equal(new Set(files.map(f => f.path.toLowerCase())).size, files.length);
  assert.ok(files[0].url.includes('/photo.?v=1'), 'the CDN URL must remain unchanged');
  assert.deepEqual((await listFile(app.options, app.paths)).map(f => f.path), files.map(f => f.path), 'mapping must be stable');
});

test('account file URL decoding still rejects traversal and reserved device names', async t => {
  let name = '..%2Foutside.txt';
  const remote = await server(t, () => ({body: [{id: 1, absolute_url: `https://cdn.example.com/files/${name}`}]}));
  const app = instance(await directory(t), remote.host);
  await assert.rejects(listFile(app.options, app.paths), /Invalid file name/);
  name = 'NUL.txt';
  await assert.rejects(listFile(app.options, app.paths), /Invalid file name/);
});
test('raw downloads preserve JSON whitespace and media uses authenticated source bytes instead of CDN', async t => {
  const root = await directory(t);
  const text = '{\n  "setting": true\n}\n';
  const remote = await server(t, r => {
    assert.match(r.url, /^\/admin\/themes\/42\/assets\/[12]\/raw\.json$/);
    assert.ok(r.headers.authorization);
    return {body: r.url.endsWith('/1/raw.json') ? text : Buffer.from([0, 255, 7, 128, 239, 191])};
  });
  const app = instance(root, remote.host);
  const raw = path.join(root, 'config/settings_data.json');
  await getAsset(app, {id: 1, isRaw: true, path: raw});
  assert.equal(await fs.readFile(raw, 'utf8'), text);
  const media = path.join(root, 'media/image.png');
  await getAsset(app, {id: 2, isMedia: true, path: media, asset_url: `http://${remote.host}/cdn/image.png?v=1`});
  assert.deepEqual(await fs.readFile(media), Buffer.from([0, 255, 7, 128, 239, 191]));
  assert.equal(remote.requests[1].url, '/admin/themes/42/assets/2/raw.json');
});

test('binary raw errors keep the API status and response body', async t => {
  const remote = await server(t, () => ({status: 404, body: {error: 'missing'}}));
  await assert.rejects(Client({id: 'key', http: true}).getAssetRaw({url: remote.host, token: 'secret', theme: 42, assetId: 1, binary: true}), error => {
    assert.equal(error.statusCode, 404);
    assert.deepEqual(error.response.data, {error: 'missing'});
    return true;
  });
});
test('invalid settings JSON is rejected before it can corrupt remote settings', async t => {
  const remote = await server(t, () => { assert.fail('must not call API'); });
  const app = instance(await directory(t), remote.host);
  const info = {name: 'settings_data.json', type: 'Asset::Configuration', content: '{broken'};
  await assert.rejects(require('../dist/insalesApi/editAsset').default(info, 1, 'settings_data.json', app.options, false), SyntaxError);
  await assert.rejects(require('../dist/insalesApi/uploadAsset').default(info, 'settings_data.json', app.options, false), SyntaxError);
});
