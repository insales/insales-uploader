const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const JSZip = require('jszip');
const {directory, server, instance} = require('./helpers.cjs');
const write = require('../dist/tasks/file/write').default;

test('backup contains theme files and assets, excludes credentials and never overwrites another backup', async t => {
  const root = await directory(t);
  const app = instance(root);
  await write({path: path.join(root, 'templates/index.liquid'), content: 'local theme'});
  await write({path: path.join(root, 'assets/js/new.js'), content: 'local asset'});
  await write({path: path.join(root, 'insales-config.js'), content: 'secret token'});
  const first = await app.backup();
  const second = await app.backup();
  assert.notEqual(first, second);
  const zip = await JSZip.loadAsync(await fs.readFile(first));
  assert.equal(await zip.file('templates/index.liquid').async('string'), 'local theme');
  assert.equal(await zip.file('assets/js/new.js').async('string'), 'local asset');
  assert.equal(zip.file('insales-config.js'), null);
  assert.ok(!Object.keys(zip.files).some(key => key.startsWith('backup/')));
});
test('backup rejects a filesystem failure', async t => {
  const root = await directory(t);
  const app = instance(root);
  await write({path: path.join(root, 'backup'), content: 'blocking file'});
  await assert.rejects(app.backup());
});
test('pull refuses to delete local files when API preflight fails', async t => {
  const root = await directory(t);
  const remote = await server(t, () => ({status: 403, body: {}}));
  const app = instance(root, remote.host);
  const local = path.join(root, 'templates/index.liquid');
  await write({path: local, content: 'unsaved local work'});
  await assert.rejects(app.pull(), {statusCode: 403});
  assert.equal(await fs.readFile(local, 'utf8'), 'unsaved local work');
});
test('pull saves a pre-replacement backup and propagates download failure', async t => {
  const root = await directory(t);
  const remote = await server(t, () => ({body: []}));
  const app = instance(root, remote.host);
  app.options.theme.backup = true;
  const local = path.join(root, 'templates/index.liquid');
  await write({path: local, content: 'recoverable work'});
  app.download = async () => { throw new Error('download failed'); };
  await assert.rejects(app.pull(), /download failed/);
  const archives = await fs.readdir(path.join(root, 'backup'));
  const zip = await JSZip.loadAsync(await fs.readFile(path.join(root, 'backup', archives[0])));
  assert.equal(await zip.file('templates/index.liquid').async('string'), 'recoverable work');
});
test('bulk upload aborts before mutations if a local theme directory cannot be read', async t => {
  const root = await directory(t);
  const remote = await server(t, r => {
    assert.equal(r.method, 'GET');
    return {body: r.url.includes('widget_types') ? [] : [{id: 1, type: 'Asset::Template', inner_file_name: 'index.liquid'}]};
  });
  const app = instance(root, remote.host);
  await assert.rejects(app.upload(), /директорию/);
  assert.equal(remote.requests.filter(r => r.method !== 'GET').length, 0);
});
