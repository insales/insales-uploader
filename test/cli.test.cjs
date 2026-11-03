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
  const help = (await run(['--help'], root)).stdout;
  assert.match(help, /download/);
  assert.match(help, /--skip-unchanged/);
  assert.match(help, /--no-skip-unchanged/);
  assert.equal((await run(['--version'], root)).stdout.trim(), require('../package.json').version);
});

for (const command of ['download', 'downloadFiles']) {
  test(`CLI ${command} resolves skipUnchanged flags against config without editing it`, async t => {
    const cases = [
      {name: 'default', configured: undefined, flags: [], preserve: false},
      {name: 'config enables', configured: true, flags: [], preserve: true},
      {name: 'config disables', configured: false, flags: [], preserve: false},
      {name: 'CLI enables', configured: false, flags: ['--skip-unchanged'], preserve: true},
      {name: 'CLI disables', configured: true, flags: ['--no-skip-unchanged'], preserve: false},
    ];
    for (const scenario of cases) await t.test(scenario.name, async t => {
      const root = await directory(t);
      const remote = await server(t, request => {
        if (request.url === '/admin/themes/42/assets.json') return {body: [
          {id: 1, type: 'Asset::Snippet', inner_file_name: 'same.liquid'},
        ]};
        if (request.url === '/admin/themes/42/widget_types.json') return {body: []};
        if (request.url === '/admin/themes/42/assets/1.json') return {body: {content: 'unchanged'}};
        if (request.url.startsWith('/admin/files.json')) return {body: [
          {id: 1, absolute_url: `http://${remote.host}/same.txt`},
        ]};
        if (request.url === '/same.txt') return {body: 'unchanged'};
        return {status: 404};
      });
      const config = path.join(root, 'insales-config.js');
      const settings = 'module.exports = ' + JSON.stringify({
        account: {id: 'key', token: 'fixture', url: remote.host, http: true},
        theme: {id: 42, root, backup: false, assetsSync: false, skipUnchanged: scenario.configured},
      });
      await fs.writeFile(config, settings);
      const target = path.join(root, command === 'download' ? 'snippets/same.liquid' : 'files/same.txt');
      await fs.mkdir(path.dirname(target), {recursive: true});
      await fs.writeFile(target, 'unchanged');
      const old = new Date('2000-01-01T00:00:00Z');
      await fs.utimes(target, old, old);
      const before = (await fs.stat(target)).mtimeMs;

      // Exercise root options both before and after the subcommand.
      const args = command === 'download' ? [command, ...scenario.flags] : [...scenario.flags, command];
      await run(args, root);
      const after = (await fs.stat(target)).mtimeMs;
      assert.equal(after === before, scenario.preserve);
      assert.equal(await fs.readFile(target, 'utf8'), 'unchanged');
      assert.equal(await fs.readFile(config, 'utf8'), settings);
    });
  });
}
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

test('CLI loads explicit config and preload relative to --cwd', async t => {
  const root = await directory(t);
  const settings = {account: {id: 'key', token: 'fixture', url: 'example.com'}, theme: {id: 42, root, backup: false}};
  await fs.writeFile(path.join(root, 'preload.cjs'), 'globalThis.uploaderPreloaded = true;');
  await fs.writeFile(path.join(root, 'custom.cjs'), 'if (!globalThis.uploaderPreloaded) throw new Error("preload missing"); module.exports = ' + JSON.stringify(settings));
  await run(['--cwd', root, '--myappfile', 'custom.cjs', '--require', './preload.cjs', 'b'], path.resolve(__dirname, '..'));
  assert.equal((await fs.readdir(path.join(root, 'backup'))).filter(file => file.endsWith('.zip')).length, 1);
});

test('CLI discovers JSON config in a parent directory', async t => {
  const root = await directory(t);
  const nested = path.join(root, 'nested');
  await fs.mkdir(nested);
  await fs.writeFile(path.join(root, 'insales-config.json'), JSON.stringify({
    account: {id: 'key', token: 'fixture', url: 'example.com'}, theme: {id: 42, root, backup: false},
  }));
  await run(['backup'], nested);
  assert.equal((await fs.readdir(path.join(root, 'backup'))).length, 1);
});

test('CLI rejects removed plugin config before making API requests', async t => {
  const root = await directory(t);
  const remote = await server(t, () => assert.fail('plugins must fail before network access'));
  await fs.writeFile(path.join(root, 'insales-config.js'), 'module.exports = ' + JSON.stringify({
    account: {id: 'key', token: 'fixture', url: remote.host, http: true}, theme: {id: 42, root}, plugins: {},
  }));
  await assert.rejects(run(['upload'], root), error => error.code === 1 && /plugins\/Gulp/.test(error.stderr));
  assert.equal(remote.requests.length, 0);
  await assert.rejects(run(['--completion', 'bash'], root), error => /unknown option/.test(error.stderr));
});
