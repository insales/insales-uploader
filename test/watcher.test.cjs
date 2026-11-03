const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const {setTimeout: delay} = require('node:timers/promises');
const {directory, instance, server} = require('./helpers.cjs');
const {startWatching} = require('../dist/watcher');
const write = require('../dist/tasks/file/write').default;

test('real watcher handles add/change/unlink using ready files', {timeout: 15000}, async t => {
  const root = await directory(t);
  const app = instance(root);
  app.options.theme.assetsSync = false;
  for (const folder of Object.values(app.paths.folders)) await fs.mkdir(folder, {recursive: true});
  const events = [];
  let notify;
  const next = predicate => new Promise(resolve => {
    const previous = events.find(predicate);
    if (previous) return resolve(previous);
    notify = item => { if (predicate(item)) { notify = null; resolve(item); } };
  });
  app.TaskManager.create('asset:change', asset => { const item = {kind: 'change', name: asset.insalesInfo.name, content: asset.insalesInfo.content}; events.push(item); notify?.(item); });
  app.TaskManager.create('asset:remove', asset => { const item = {kind: 'remove', name: asset.insalesInfo.name}; events.push(item); notify?.(item); });
  await startWatching(app);
  app.watcherService.instance.on('all', (event, file) => t.diagnostic(`watcher ${event}: ${path.basename(file)}`));
  t.after(() => app.stopStream());
  const file = path.join(root, 'media/app.js');
  const added = next(item => item.name === 'app.js' && item.content === 'first');
  await write({path: file, content: 'first'});
  await added;
  t.diagnostic('add completed');
  const changed = next(item => item.name === 'app.js' && item.content === 'second');
  await fs.writeFile(file, 'second');
  await changed;
  t.diagnostic('change completed');
  const excluded = next(item => item.name === 'app.min.js');
  await write({path: path.join(root, 'media/app.min.js'), content: 'unchanged'});
  assert.equal((await excluded).content, 'unchanged');
  t.diagnostic('exclude completed');
  const removed = next(item => item.kind === 'remove' && item.name === 'app.js');
  await fs.unlink(file);
  await removed;
  assert.equal(events.filter(item => item.kind === 'remove').length, 1);
});

async function waitFor(predicate) {
  const deadline = Date.now() + 8000;
  while (!predicate()) {
    if (Date.now() >= deadline) assert.fail('Timed out waiting for watcher');
    await delay(20);
  }
}

async function replaceFile(source, destination) {
  // Windows can transiently refuse replacement while a watcher/AV holds a handle.
  // Retry the same atomic rename, never simulate it by deleting the destination.
  for (let attempt = 0; ; attempt++) {
    try { await fs.rename(source, destination); return; }
    catch (error) {
      if (process.platform !== 'win32' || !['EPERM', 'EACCES', 'EBUSY'].includes(error.code) || attempt >= 20) throw error;
      await delay(25);
    }
  }
}

for (const usePolling of [false, true]) {
  test(`watcher synchronizes once, filters paths and follows new widget folders (polling=${usePolling})`, {timeout: 20000}, async t => {
    const root = await directory(t);
    const app = instance(root);
    app.options.theme.excludeFiles = ['**/ignored.js', 'widget_types/hidden/**'];
    app.options.chokidarOptions.usePolling = usePolling;
    app.options.chokidarOptions.interval = 30;
    app.options.chokidarOptions.binaryInterval = 30;
    app.options.chokidarOptions.cwd = root;
    for (const folder of Object.values(app.paths.folders)) await fs.mkdir(folder, {recursive: true});
    const uploaded = [];
    const removed = [];
    const updates = [];
    const errors = [];
    app.eventEmitter.on('watchError', error => errors.push(error));
    app.TaskManager.create('asset:change', asset => uploaded.push(asset));
    app.TaskManager.create('asset:remove', asset => removed.push(asset));
    await startWatching(app, update => updates.push(update));
    t.after(() => app.stopStream());

    const media = path.join(root, 'media/image.png');
    const alias = path.join(root, 'assets/img/image.png');
    const bytes = Buffer.from([0, 255, 1]);
    await write({path: media, content: bytes});
    await waitFor(() => updates.length === 1);
    await delay(350);
    assert.deepEqual(await fs.readFile(alias), bytes);
    assert.equal(uploaded.length, 1, 'mirrored copy must not upload again');
    assert.equal(uploaded[0].insalesInfo.attachment, bytes.toString('base64'));

    const nextBytes = Buffer.from([0, 255, 2]);
    await fs.writeFile(alias, nextBytes);
    await waitFor(() => updates.length === 2);
    await delay(350);
    assert.deepEqual(await fs.readFile(media), nextBytes);
    assert.equal(uploaded.length, 2);

    await write({path: path.join(root, 'media/ignored.js'), content: 'ignored'});
    await write({path: path.join(root, 'media/transient.tmp'), content: 'temporary'});
    await write({path: path.join(root, 'widget_types/hidden/snippet.js'), content: 'hidden'});
    await write({path: path.join(root, 'widget_types/new-widget/snippet.js'), content: 'ready JS'});
    await waitFor(() => updates.length === 3);
    assert.equal(updates[2].insalesInfo.name, 'snippet.js');
    assert.equal(updates[2].asset.type, 'Asset::Widget');
    await delay(350);
    assert.equal(uploaded.length, 3);

    // Saving an existing file via temporary file + rename is common in editors.
    const temporary = path.join(root, 'media/editor.tmp');
    await fs.writeFile(temporary, Buffer.from([0, 255, 3]));
    await replaceFile(temporary, media);
    await waitFor(() => updates.length === 4);
    await delay(350);
    assert.equal(uploaded.length, 4);
    assert.equal(removed.length, 0);

    await fs.unlink(alias);
    await waitFor(() => removed.length === 1);
    await delay(350);
    await assert.rejects(fs.stat(media), {code: 'ENOENT'});
    assert.equal(removed.length, 1, 'mirrored deletion must not remove twice');
    assert.equal(updates.at(-1).event, 'unlink');
    assert.deepEqual(errors, []);

    await app.stopStream();
    assert.equal(app.watcherService.instance, null);
    await startWatching(app, update => updates.push(update));
    await fs.writeFile(path.join(root, 'media/restarted.js'), 'after restart');
    await waitFor(() => updates.some(update => update.insalesInfo.name === 'restarted.js'));
  });
}

test('watcher reports a failed upload, continues the queue and awaits successful callbacks', {timeout: 15000}, async t => {
  const root = await directory(t);
  const app = instance(root);
  app.options.theme.assetsSync = false;
  for (const folder of Object.values(app.paths.folders)) await fs.mkdir(folder, {recursive: true});
  const failure = new Error('failed upload');
  const errors = [];
  const events = [];
  app.eventEmitter.on('watchError', error => errors.push(error));
  app.TaskManager.create('asset:change', async asset => {
    if (asset.insalesInfo.name === 'failed.js') throw failure;
    events.push('upload');
  });
  app.options.theme.onUpdate = async () => { await delay(5); events.push('theme callback'); };
  await startWatching(app, async () => { await delay(5); events.push('stream callback'); });
  t.after(() => app.stopStream());
  await write({path: path.join(root, 'media/failed.js'), content: 'failure'});
  await waitFor(() => errors.length === 1);
  assert.equal(errors[0], failure);
  assert.deepEqual(events, []);
  await write({path: path.join(root, 'media/good.js'), content: 'success'});
  await waitFor(() => events.length === 3);
  assert.deepEqual(events, ['upload', 'stream callback', 'theme callback']);
});

test('a callback can await stopStream without deadlocking its own event', {timeout: 10000}, async t => {
  const root = await directory(t);
  const app = instance(root);
  app.options.theme.assetsSync = false;
  for (const folder of Object.values(app.paths.folders)) await fs.mkdir(folder, {recursive: true});
  app.TaskManager.create('asset:change', () => {});
  let stopped = false;
  await startWatching(app, async () => { await app.stopStream(); stopped = true; });
  t.after(() => app.stopStream());
  await write({path: path.join(root, 'media/stop.js'), content: 'stop'});
  await waitFor(() => stopped);
  assert.equal(app.watcherService.instance, null);
});

test('startup API failure closes the watcher and preserves the original rejection', async t => {
  const root = await directory(t);
  const remote = await server(t, request => request.url === '/admin/themes.json'
    ? {status: 403, body: {message: 'no themes'}} : {body: []});
  const app = instance(root, remote.host);
  for (const folder of Object.values(app.paths.folders)) await fs.mkdir(folder, {recursive: true});
  const fetch = globalThis.fetch;
  t.mock.method(globalThis, 'fetch', (url, options) => String(url).startsWith('https://registry.npmjs.org/')
    ? Promise.resolve(new Response('{}')) : fetch(url, options));
  const baseline = process.listenerCount('SIGINT');
  await assert.rejects(app.stream(), {statusCode: 403});
  assert.equal(app.watcherService.instance, null);
  assert.equal(process.listenerCount('SIGINT'), baseline);
});

test('external stop and a callback stopping itself cannot block each other', {timeout: 10000}, async t => {
  const root = await directory(t);
  const app = instance(root);
  app.options.theme.assetsSync = false;
  for (const folder of Object.values(app.paths.folders)) await fs.mkdir(folder, {recursive: true});
  app.TaskManager.create('asset:change', () => {});
  const started = Promise.withResolvers();
  const continueCallback = Promise.withResolvers();
  let callbackFinished = false;
  await startWatching(app, async () => {
    started.resolve();
    await continueCallback.promise;
    await app.stopStream();
    callbackFinished = true;
  });
  t.after(() => app.stopStream());
  await write({path: path.join(root, 'media/stop.js'), content: 'stop'});
  await started.promise;
  const externalStop = app.stopStream();
  await delay(10);
  continueCallback.resolve();
  await externalStop;
  assert.equal(callbackFinished, true);
  assert.equal(app.watcherService.instance, null);
});
