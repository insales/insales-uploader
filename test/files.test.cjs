const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const {directory, server, instance} = require('./helpers.cjs');
const write = require('../dist/tasks/file/write').default;
const download = require('../dist/tasks/file/writeWithDownload').default;
const {syncChange, syncUnlink} = require('../dist/watcher/synchronize');
const removeDir = require('../dist/file-system/removeDir').default;

test('write handles empty contents and multiple destinations, and propagates filesystem failure', async t => {
  const root = await directory(t);
  const files = ['a/one.txt', 'b/two.txt'].map(file => path.join(root, file));
  await write({path: files, content: ''});
  for (const file of files) assert.equal(await fs.readFile(file, 'utf8'), '');
  await assert.rejects(write({path: path.join(files[0], 'child.txt'), content: 'fail'}));
});
test('download preserves encoded URL and @, supports binary, and rejects HTTP failure', async t => {
  const root = await directory(t);
  const remote = await server(t, r => r.url === '/failed' ? {status: 404, body: 'missing'} : {body: Buffer.from([0, 255, 3])});
  const target = path.join(root, 'asset.png');
  await download({url: `http://${remote.host}/a%20b@2x.png?cache=1`, path: target});
  assert.deepEqual(await fs.readFile(target), Buffer.from([0, 255, 3]));
  assert.equal(remote.requests[0].url, '/a%20b@2x.png?cache=1');
  await assert.rejects(download({url: `http://${remote.host}/failed`, path: target}), /404/);
});
test('syncChange writes provided file bytes and handles absent copies', async t => {
  const root = await directory(t);
  const app = instance(root);
  const source = path.join(root, 'assets/js/app.js');
  await write({path: source, content: 'original'});
  const file = {path: source, contents: Buffer.from('transformed')};
  syncChange(app, file);
  assert.equal(await fs.readFile(path.join(root, 'media/app.js'), 'utf8'), 'transformed');
});

test('native paths identify aliases and synchronize media in both directions on Windows', async t => {
  const root = await directory(t);
  const app = instance(root);
  const media = path.join(root, 'media/app.js');
  const alias = path.join(root, 'assets/js/app.js');
  await write({path: media, content: 'from media'});
  {
    const file = {path: media, contents: await fs.readFile(media)};
    assert.equal(app.getFileInfo(file, true).isAsset, false);
    syncChange(app, file);
  }
  assert.equal(await fs.readFile(alias, 'utf8'), 'from media');
  await fs.writeFile(alias, 'from alias');
  {
    const file = app.getFileInfo({path: alias, contents: await fs.readFile(alias)}, true);
    assert.equal(app.getFileInfo(file, true).isAsset, true);
    syncChange(app, file);
    assert.equal(file.isAsset, true);
  }
  assert.equal(await fs.readFile(media, 'utf8'), 'from alias');
});
test('syncUnlink calls back once even if counterpart is missing', async t => {
  const root = await directory(t);
  const app = instance(root);
  let calls = 0;
  syncUnlink(app, path.join(root, 'media/a.js'), isAsset => { assert.equal(isAsset, false); calls++; });
  assert.equal(calls, 1);
  syncUnlink(app, path.join(root, 'assets/js/a.js'), isAsset => { assert.equal(isAsset, true); calls++; });
  assert.equal(calls, 2);
});
test('unknown media extension never synchronizes a file onto itself', async t => {
  const root = await directory(t);
  const app = instance(root);
  const source = path.join(root, 'media/archive.bin');
  await write({path: source, content: Buffer.from([0, 255])});
  syncChange(app, {path: source, contents: Buffer.from([0, 255])});
  assert.deepEqual(await fs.readFile(source), Buffer.from([0, 255]));
});

test('unknown binary bytes stay base64 while UTF-8 source remains text', async t => {
  const app = instance(await directory(t));
  for (const contents of [Buffer.from([0, 255, 3]), Buffer.from([255]), Buffer.from([0, 65])]) {
    const info = app.getFileInfo({path: path.join(app.paths.root, 'media/unknown.bin'), contents}, true);
    assert.equal(info.insalesInfo.attachment, contents.toString('base64'));
    assert.equal(info.insalesInfo.content, undefined);
  }
  const text = 'Привет, мир!\n';
  const info = app.getFileInfo({path: path.join(app.paths.root, 'media/code.js'), contents: Buffer.from(text)}, true);
  assert.equal(info.insalesInfo.content, text);
  assert.equal(info.insalesInfo.attachment, undefined);
});
test('file processing uploads ready bytes and calls callbacks after upload', async t => {
  const root = await directory(t);
  const app = instance(root);
  app.options.theme.assetsSync = false;
  const seen = [];
  app.TaskManager.create('asset:change', asset => seen.push(asset.insalesInfo.content));
  app.options.theme.onUpdate = update => { assert.equal(update.event, 'add'); seen.push('theme'); };
  const file = path.join(root, 'snippets/banner.liquid');
  await write({path: file, content: 'ready'});
  await app.watcherService.process('add', file, update => {
    assert.equal(update.path, file.replace(/\\/g, '/'));
    assert.equal(update.insalesInfo.name, 'banner.liquid');
    seen.push('callback');
  });
  assert.deepEqual(seen, ['ready', 'callback', 'theme']);
});

test('failed upload rejects and does not invoke success callbacks', async t => {
  const root = await directory(t);
  const app = instance(root);
  app.options.theme.assetsSync = false;
  app.TaskManager.create('asset:change', () => { throw new Error('upload failed'); });
  app.options.theme.onUpdate = () => assert.fail('must not run');
  const file = path.join(root, 'snippets/a.liquid');
  await write({path: file, content: 'ready'});
  await assert.rejects(app.watcherService.process('add', file, () => assert.fail('must not run')), /upload failed/);
});
test('removeDir removes arbitrary nesting', async t => {
  const root = await directory(t);
  const target = path.join(root, 'theme');
  await write({path: path.join(target, 'one/two/three/four.txt'), content: 'test'});
  removeDir(target);
  await assert.rejects(fs.stat(target), {code: 'ENOENT'});
});
test('stopStream waits for watcher close', async t => {
  const app = instance(await directory(t));
  let closed = false;
  app.watcherService.instance = {async close() { await new Promise(resolve => setTimeout(resolve, 10)); closed = true; }};
  await app.stopStream();
  assert.equal(closed, true);
  assert.equal(app.watcherService.instance, null);
});

test('stopping and restarting sessions releases SIGINT listeners', async t => {
  const app = instance(await directory(t));
  const baseline = process.listenerCount('SIGINT');
  app.session.start(() => app.stopStream());
  app.session.start(() => app.stopStream());
  assert.equal(process.listenerCount('SIGINT'), baseline + 1);
  await app.stopStream();
  assert.equal(process.listenerCount('SIGINT'), baseline);
});
