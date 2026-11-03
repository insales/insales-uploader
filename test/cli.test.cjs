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
const json = async (args, cwd) => JSON.parse((await run([...args, '--json'], cwd)).stdout);
async function config(root, host, extra = {}) {
  await fs.writeFile(path.join(root, 'insales-config.json'), JSON.stringify({account: {id: 'key', token: 'secret', url: host, http: true}, ...extra}));
}
test('CLI help, no arguments and import have no configuration side effects', async t => {
  const root = await directory(t);
  assert.match((await run([], root)).stdout, /sync/);
  assert.match((await run(['--help'], root)).stdout, /widget-type/);
  assert.equal((await run(['--version'], root)).stdout.trim(), require('../package.json').version);
  assert.equal((await execute(process.execPath, ['-e', `require(${JSON.stringify(path.resolve('dist/cli'))})`], {cwd: root})).stdout, '');
  await assert.rejects(run(['upload'], root), e => e.code === 2);
});
test('init writes JSON once and validate has no network requirement', async t => {
  const root = await directory(t);
  await run(['init'], root);
  assert.equal(JSON.parse(await fs.readFile(path.join(root, 'insales-config.json'))).theme.assetsSync, false);
  await assert.rejects(run(['init'], root));
});
test('resources do not require a local theme; profiles and ambiguous config', async t => {
  const root = await directory(t);
  const remote = await server(t, () => ({body: [{id: 42, title: 'Example'}]}));
  await config(root, remote.host);
  assert.equal((await json(['theme', 'list'], root)).data[0].id, 42);
  assert.deepEqual(await fs.readdir(root), ['insales-config.json']);
  await fs.writeFile(path.join(root, 'insales-config.cjs'), 'module.exports={}');
  await assert.rejects(run(['theme', 'list'], root), e => e.code === 2);
  assert.equal((await json(['--config', 'insales-config.json', 'theme', 'list'], root)).ok, true);
});
test('raw API rejects external URLs and preserves response envelope', async t => {
  const root = await directory(t);
  const remote = await server(t, () => ({body: {sample: 1}}));
  await config(root, remote.host);
  assert.equal((await json(['api', 'GET', '/admin/custom.json'], root)).data.sample, 1);
  await assert.rejects(run(['api', 'GET', 'https://example.com/admin/test.json'], root), e => e.code === 2);
  assert.equal(remote.requests.length, 1);
});
test('typed mutation dry-run, confirmation and silent delete refusal', async t => {
  const root = await directory(t);
  const remote = await server(t, () => ({body: {id: 42}}));
  await config(root, remote.host);
  await json(['theme', 'update', '42', '--title', 'New', '--dry-run'], root);
  assert.ok(remote.requests.every(r => r.method === 'GET'));
  await assert.rejects(run(['theme', 'publish', '42', '--no-input'], root), e => e.code === 2);
  await assert.rejects(run(['theme', 'delete', '42', '--yes'], root), e => e.code === 1);
});
test('raw binary output is exact and JSON can reference an output file', async t => {
  const root = await directory(t); const bytes = Buffer.from([0, 255, 128]);
  const remote = await server(t, () => ({body: bytes}));
  await config(root, remote.host, {theme: {id: 42}});
  const output = path.join(root, 'image.bin');
  const data = await json(['asset', 'get', '1', '--raw', '--output', output], root);
  assert.equal(data.data.path, output); assert.deepEqual(await fs.readFile(output), bytes);
});
test('sync pull, unchanged push, dry-run, conflicts and explicit overwrite', async t => {
  const root = await directory(t); let content = 'original';
  const remote = await server(t, r => {
    if (r.url.endsWith('/widget_types.json')) return {body: []};
    if (r.url.endsWith('/assets.json')) return {body: [{id: 1, type: 'Asset::Snippet', inner_file_name: 'a.liquid'}]};
    if (r.url.endsWith('/raw.json')) return {body: content};
    if (r.method === 'PUT') {content = r.body.asset.content; return {body: {id: 1}};}
    return {body: {id: 1}};
  });
  await config(root, remote.host, {theme: {id: 42, root: '.'}});
  await json(['sync', 'pull'], root);
  const target = path.join(root, 'snippets/a.liquid');
  assert.equal(await fs.readFile(target, 'utf8'), 'original');
  const stamp = (await fs.stat(target)).mtimeMs;
  await json(['sync', 'pull'], root);
  assert.equal((await fs.stat(target)).mtimeMs, stamp);
  await json(['sync', 'push'], root);
  assert.equal(remote.requests.filter(r => r.method !== 'GET').length, 0);
  await fs.writeFile(target, 'local');
  await json(['sync', 'push', '--dry-run'], root);
  assert.equal(content, 'original');
  content = 'remote';
  await assert.rejects(run(['sync', 'push', '--json'], root), e => e.code === 3 && JSON.parse(e.stdout).ok === false);
  await json(['sync', 'push', '--conflict', 'source'], root);
  assert.equal(content, 'local');
  assert.ok((await json(['sync', 'history'], root)).data.length >= 3);
});
test('profiles load ESM relative roots without mutating cwd', async t => {
  const root = await directory(t);
  const remote = await server(t, () => ({body: []}));
  await fs.writeFile(path.join(root, 'insales-config.mjs'), `export default ${JSON.stringify({account: {id: 'key', token: 'secret', url: remote.host, http: true}, profiles: {demo: {theme: {id: 42}}}, defaultProfile: 'demo'})}`);
  assert.equal((await json(['theme', 'list'], root)).ok, true);
  await assert.rejects(run(['--profile', 'missing', 'theme', 'list'], root), e => e.code === 2);
});
test('file download all normalizes trailing dots without changing CDN URLs', async t => {
  const root=await directory(t);
  const remote=await server(t,r=>r.url.startsWith('/admin/files') ? {body:[{id:1,absolute_url:`http://${remote.host}/photo.`}]} : {body:'exact'});
  await config(root,remote.host);
  const output=path.join(root,'downloads');
  const plan=await json(['file','download','--all','--output',output,'--dry-run'],root);
  assert.equal(path.basename(plan.data[0].path),'1-photo');
  await assert.rejects(fs.access(output));
  await json(['file','download','--all','--output',output],root);
  assert.equal(await fs.readFile(path.join(output,'1-photo'),'utf8'),'exact');
  assert.ok(remote.requests.some(r=>r.url==='/photo.'));
});

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
