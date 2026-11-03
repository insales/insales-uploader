const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const uploader = require('insales-uploader');

test('installed package downloads and uploads bytes, creates backups and preserves its API', async t => {
  const bytes = Buffer.from([0, 255, 128, 3]);
  const requests = [];
  const server = http.createServer(async (req, res) => {
    let body = '';
    for await (const chunk of req) body += chunk;
    requests.push({method: req.method, path: req.url, body: body ? JSON.parse(body) : undefined});
    res.setHeader('content-type', 'application/json');
    if (req.url.endsWith('/raw.json')) return res.end(bytes);
    if (req.method !== 'GET') return res.end('{}');
    const assets = [{id: 1, type: 'Asset::Media', inner_file_name: 'image.png'}];
    res.end(JSON.stringify(req.url.endsWith('/assets.json') ? assets : []));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => { server.closeAllConnections(); return new Promise(resolve => server.close(resolve)); });
  const root = path.resolve('theme');
  const options = {
    account: {id: 1, token: 'fixture', url: `127.0.0.1:${server.address().port}`, http: true},
    theme: {id: 42, root, backup: false, skipUnchanged: true},
    util: {openBrowser: false},
  };
  const app = uploader(options);
  const other = new uploader(options);
  assert.notEqual(app.files, other.files);
  assert.equal(await app.download(), app);
  const image = path.join(root, 'media/image.png');
  assert.deepEqual(await fs.readFile(image), bytes);
  assert.deepEqual(await fs.readFile(path.join(root, 'assets/img/image.png')), bytes);
  const before = (await fs.stat(image)).mtimeMs;
  await app.download();
  assert.equal((await fs.stat(image)).mtimeMs, before);
  await app.upload();
  assert.equal(requests.find(r => r.method === 'PUT').body.asset.attachment, bytes.toString('base64'));
  const archive = await app.backup();
  assert.equal((await fs.readFile(archive)).subarray(0, 2).toString(), 'PK');
  await app.stopStream();
});
