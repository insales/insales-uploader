const {test} = require('node:test');
const assert = require('node:assert/strict');
const syncFs = require('node:fs');
const fs = require('node:fs/promises');
const path = require('node:path');
const {directory, server, instance} = require('./helpers.cjs');
const write = require('../dist/tasks/file/write').default;

const oldTime = new Date('2001-02-03T04:05:06Z');

async function markOld(file, time = oldTime) {
  await fs.utimes(file, time, time);
  return (await fs.stat(file)).mtimeMs;
}

test('skipUnchanged preserves identical UTF-8, empty and binary files', async t => {
  const root = await directory(t);
  const contents = ['Привет\r\n', '', Buffer.from([0, 255, 128, 3])];
  for (const [index, content] of contents.entries()) {
    const file = path.join(root, `${index}.txt`);
    await write({path: file, content});
    const before = await markOld(file);
    await write({path: file, content, skipUnchanged: true});
    assert.equal((await fs.stat(file)).mtimeMs, before);
    assert.deepEqual(await fs.readFile(file), Buffer.from(content));
  }
});

test('skipUnchanged compares destinations independently and creates or replaces different content', async t => {
  const root = await directory(t);
  const same = path.join(root, 'same.txt');
  const changed = path.join(root, 'changed.txt');
  const missing = path.join(root, 'nested/missing.txt');
  await write({path: same, content: 'a\nb'});
  await write({path: changed, content: 'a b'});
  const before = await markOld(same);
  await markOld(changed);
  await write({path: [same, changed, missing], content: 'a\nb', skipUnchanged: true});
  assert.equal((await fs.stat(same)).mtimeMs, before);
  assert.notEqual((await fs.stat(changed)).mtimeMs, before);
  for (const file of [same, changed, missing]) assert.equal(await fs.readFile(file, 'utf8'), 'a\nb');
});

test('skipUnchanged is disabled by default and equal files are still overwritten', async t => {
  const root = await directory(t);
  assert.equal(instance(root).options.theme.skipUnchanged, false);
  const file = path.join(root, 'file.txt');
  await write({path: file, content: 'same'});
  const before = await markOld(file);
  await write({path: file, content: 'same'});
  assert.notEqual((await fs.stat(file)).mtimeMs, before);
});

test('skipUnchanged propagates read errors instead of overwriting an unreadable file', async t => {
  const root = await directory(t);
  const file = path.join(root, 'file.txt');
  await write({path: file, content: 'same'});
  const denied = Object.assign(new Error('read denied'), {code: 'EACCES'});
  const realRead = fs.readFile.bind(fs);
  const mock = t.mock.method(fs, 'readFile', async target => {
    if (target === file) throw denied;
    return realRead(target);
  });
  await assert.rejects(write({path: file, content: 'new', skipUnchanged: true}), error => error === denied);
  mock.mock.restore();
  assert.equal(await fs.readFile(file, 'utf8'), 'same');
});

for (const preserveCopyTimestamps of [false, true]) test(`download preserves unchanged files and updates changed content (${preserveCopyTimestamps ? 'source timestamps' : 'native copy'})`, async t => {
  if (preserveCopyTimestamps) {
    const copy = syncFs.copyFileSync;
    t.mock.method(syncFs, 'copyFileSync', (source, destination, flags) => {
      copy(source, destination, flags);
      const stat = syncFs.statSync(source);
      syncFs.utimesSync(destination, stat.atime, stat.mtime);
    });
  }
  const root = await directory(t);
  let revision = 0;
  let host;
  const media = () => Buffer.from([0, 255, revision]);
  const preview = () => Buffer.from([128, 0, revision]);
  const remote = await server(t, r => {
    if (r.url === '/admin/themes/42/assets.json') return {body: [
      {id: 1, type: 'Asset::Template', inner_file_name: 'index.liquid'},
      {id: 2, type: 'Asset::Snippet', inner_file_name: 'head.liquid'},
      {id: 3, type: 'Asset::Configuration', inner_file_name: 'settings_data.json'},
      {id: 4, type: 'Asset::Media', inner_file_name: 'logo.png'},
      {id: 5, type: 'Asset::Media', inner_file_name: 'app.js'}
    ]};
    if (r.url === '/admin/themes/42/widget_types.json') return {body: [{
      id: 8, type: 'SimpleWidgetType', handle: 'banner', name: 'Баннер', generation: 4,
      page_kinds: ['all'], widget_list_kinds: ['content'], snippet_content: `<p>${revision}</p>`,
      preview_url: `http://${host}/preview.jpg`
    }]};
    if (r.url.endsWith('/1.json')) return {body: {content: 'Неизменённый шаблон\r\n'}};
    if (r.url.endsWith('/2.json')) return {body: {content: `snippet ${revision}`}};
    if (r.url.endsWith('/3/raw.json')) return {body: revision ? '{ "x": 1 }\n' : '{"x":1}\n'};
    if (r.url.endsWith('/4/raw.json')) return {body: media()};
    if (r.url.endsWith('/5/raw.json')) return {body: 'const same = true;'};
    if (r.url === '/preview.jpg') return {body: preview()};
    return {status: 404};
  });
  host = remote.host;
  const app = instance(root, host);
  app.options.theme.skipUnchanged = true;
  await app.download();

  const files = (await fs.readdir(root, {recursive: true, withFileTypes: true}))
    .filter(entry => entry.isFile()).map(entry => path.join(entry.parentPath, entry.name));
  const snapshots = new Map();
  for (const file of files) {
    const time = new Date(oldTime.getTime() + snapshots.size * 1000);
    snapshots.set(file, {content: await fs.readFile(file), mtime: await markOld(file, time)});
  }
  for (const name of ['assets/img/logo.png', 'assets/js/app.js', 'widget_types/banner/preview.jpg']) {
    assert.ok(snapshots.has(path.join(root, name)), name);
  }

  await app.download();
  for (const [file, before] of snapshots) {
    assert.equal((await fs.stat(file)).mtimeMs, before.mtime, file);
    assert.deepEqual(await fs.readFile(file), before.content, file);
  }

  revision = 1;
  const repairedCopy = path.join(root, 'assets/js/app.js');
  await fs.writeFile(repairedCopy, 'local edits');
  snapshots.get(repairedCopy).mtime = await markOld(repairedCopy, new Date('2002-02-03T04:05:06Z'));
  const recreated = path.join(root, 'widget_types/banner/setup.json');
  await fs.unlink(recreated);
  await app.download();
  const changedNames = [
    'snippets/head.liquid', 'config/settings_data.json', 'media/logo.png', 'assets/img/logo.png',
    'widget_types/banner/snippet.liquid', 'widget_types/banner/preview.jpg',
    'assets/js/app.js', 'widget_types/banner/setup.json'
  ];
  const changedFiles = new Set(changedNames.map(name => path.join(root, name)));
  for (const [file, before] of snapshots) {
    const mtime = (await fs.stat(file)).mtimeMs;
    if (changedFiles.has(file)) assert.notEqual(mtime, before.mtime, file);
    else {
      assert.equal(mtime, before.mtime, file);
      assert.deepEqual(await fs.readFile(file), before.content, file);
    }
  }
  assert.equal(await fs.readFile(path.join(root, 'snippets/head.liquid'), 'utf8'), 'snippet 1');
  assert.equal(await fs.readFile(path.join(root, 'config/settings_data.json'), 'utf8'), '{ "x": 1 }\n');
  for (const name of ['media/logo.png', 'assets/img/logo.png']) {
    assert.deepEqual(await fs.readFile(path.join(root, name)), media());
  }
  assert.equal(await fs.readFile(path.join(root, 'widget_types/banner/snippet.liquid'), 'utf8'), '<p>1</p>');
  assert.deepEqual(await fs.readFile(path.join(root, 'widget_types/banner/preview.jpg')), preview());
  assert.equal(await fs.readFile(repairedCopy, 'utf8'), 'const same = true;');
  assert.equal(await fs.readFile(recreated, 'utf8'), '');

  app.options.theme.skipUnchanged = false;
  const overwrittenTimes = new Map();
  for (const file of files) overwrittenTimes.set(file, await markOld(file));
  await app.download();
  for (const [file, before] of overwrittenTimes) assert.notEqual((await fs.stat(file)).mtimeMs, before, file);
});

test('downloadFiles preserves equal binary content and still updates changed files', async t => {
  const root = await directory(t);
  let host;
  let revision = 0;
  const remote = await server(t, r => {
    if (r.url.startsWith('/admin/files.json')) return {body: [{id: 1, absolute_url: `http://${host}/file.bin`}]};
    return {body: Buffer.from([0, 255, revision])};
  });
  host = remote.host;
  const app = instance(root, host);
  app.options.theme.skipUnchanged = true;
  await app.downloadFiles();
  const file = path.join(root, 'files/file.bin');
  const before = await markOld(file);
  await app.downloadFiles();
  assert.equal((await fs.stat(file)).mtimeMs, before);
  revision = 1;
  await app.downloadFiles();
  assert.notEqual((await fs.stat(file)).mtimeMs, before);
  assert.deepEqual(await fs.readFile(file), Buffer.from([0, 255, 1]));
  app.options.theme.skipUnchanged = false;
  await markOld(file);
  await app.downloadFiles();
  assert.notEqual((await fs.stat(file)).mtimeMs, before);
});
