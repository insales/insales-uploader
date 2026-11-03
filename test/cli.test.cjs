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

const runWithNodeVersion = version => execute(process.execPath, ['-e', `
  Object.defineProperty(process.versions, 'node', {value: ${JSON.stringify(version)}});
  process.argv = [process.execPath, ${JSON.stringify(cli)}, '--version'];
  require(${JSON.stringify(cli)});
`], {timeout: 15000});

test('CLI rejects unsupported Node.js before loading uploader', async t => {
  for (const version of ['18.20.8', '20.19.0', '22.0.0', '22.17.99']) {
    await t.test(version, async () => {
      await assert.rejects(runWithNodeVersion(version), error => {
        assert.equal(error.code, 1);
        assert.equal(error.stdout, '');
        assert.equal(error.stderr, 'Для запуска insales-uploader нужен Node.js >=22.18.0.\n' +
          `Сейчас используется Node.js ${version}.\n` +
          'Обновите Node.js и запустите uploader снова.\n');
        return true;
      });
    });
  }
});
test('CLI accepts the minimum Node.js version and newer releases', async t => {
  for (const version of ['22.18.0', '22.18.1', '22.19.0', '24.0.0']) {
    await t.test(version, async () => {
      const result = await runWithNodeVersion(version);
      assert.equal(result.stdout.trim(), require('../package.json').version);
      assert.equal(result.stderr, '');
    });
  }
});

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
