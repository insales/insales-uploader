const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const {Transform} = require('node:stream');
const {directory, instance} = require('./helpers.cjs');
const {startWatching} = require('../dist/watcher');
const write = require('../dist/tasks/file/write').default;

test('real watcher handles add/change/unlink and plugin exclusions', {timeout: 15000}, async t => {
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
  app.options.plugins.script = stream => stream.pipe(new Transform({objectMode: true, transform(file, encoding, callback) {
    file.contents = Buffer.from(file.contents.toString().toUpperCase()); callback(null, file);
  }}));
  await startWatching.call(app);
  app.watcherInstance.on('all', (event, file) => t.diagnostic(`watcher ${event}: ${path.basename(file)}`));
  t.after(() => app.stopStream());
  const file = path.join(root, 'media/app.js');
  const added = next(item => item.name === 'app.js' && item.content === 'FIRST');
  await write({path: file, content: 'first'});
  await added;
  t.diagnostic('add completed');
  const changed = next(item => item.name === 'app.js' && item.content === 'SECOND');
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
