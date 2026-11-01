const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const {execFile} = require('node:child_process');
const {promisify} = require('node:util');
const {directory, server} = require('./helpers.cjs');
const execute = promisify(execFile);
const cli = path.resolve(__dirname, '../bin/uploader.js');
const run = (args, cwd) => execute(process.execPath, [cli, ...args], {cwd, timeout: 15000});

test('CLI help and version work without config', async t => {
  const root = await directory(t);
  assert.match((await run(['--help'], root)).stdout, /download/);
  assert.equal((await run(['--version'], root)).stdout.trim(), require('../package.json').version);
});
test('CLI init honors --cwd and refuses to overwrite existing settings', async t => {
  const root = await directory(t);
  await run(['--cwd', root, 'init'], path.resolve(__dirname, '..'));
  const target = path.join(root, 'insales-config.js');
  const before = await fs.readFile(target, 'utf8');
  assert.equal(require(target).account.http, false);
  assert.equal(require(target).account.id, '');
  await assert.rejects(run(['init'], root));
  assert.equal(await fs.readFile(target, 'utf8'), before);
});
test('CLI missing config and unknown commands exit with failure', async t => {
  const root = await directory(t);
  await assert.rejects(run(['download'], root), error => /insales-config/.test(error.stderr));
  await assert.rejects(run(['not-a-command'], root));
});
test('CLI propagates rejected asynchronous API operations as nonzero exit', async t => {
  const root = await directory(t);
  const remote = await server(t, () => ({status: 403, body: {message: 'forbidden'}}));
  await fs.writeFile(path.join(root, 'insales-config.js'), 'module.exports = ' + JSON.stringify({account: {id: 'key', token: 'secret', url: remote.host, http: true}, theme: {id: 42, root, backup: false}}));
  await assert.rejects(run(['upload'], root), error => error.code === 1 && /403/.test(error.stderr));
});
