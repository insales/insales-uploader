const http = require('node:http');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const Uploader = require('../dist');

async function directory(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'insales-uploader-'));
  t.after(() => fs.rm(root, {recursive: true, force: true}));
  return root;
}

async function server(t, handler) {
  const requests = [];
  const errors = [];
  const app = http.createServer(async (request, response) => {
    try {
      let text = '';
      for await (const chunk of request) text += chunk;
      const item = {method: request.method, url: request.url, headers: request.headers, body: text ? JSON.parse(text) : undefined};
      requests.push(item);
      const result = await handler(item, requests);
      response.writeHead(result?.status ?? 200, {'Content-Type': 'application/json', ...result?.headers});
      response.end(typeof result?.body === 'string' || Buffer.isBuffer(result?.body) ? result.body : JSON.stringify(result?.body ?? {}));
    } catch (error) {
      errors.push(error);
      response.writeHead(500);
      response.end('{}');
    }
  });
  await new Promise(resolve => app.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    app.closeAllConnections();
    await new Promise(resolve => app.close(resolve));
    if (errors.length) throw errors[0];
  });
  return {host: `127.0.0.1:${app.address().port}`, requests};
}

function options(root, host = 'example.myinsales.ru') {
  return {account: {id: 'key', token: 'password', url: host, http: true}, theme: {id: 42, root, backup: false}, util: {openBrowser: false}};
}
function instance(root, host) {
  const uploader = new Uploader(options(root, host));
  uploader.TaskManager.options.delay = 0;
  return uploader;
}
// Keep tests from launching OS notifications on deliberately failing requests.
require('../dist/logger').default.error = () => {};
module.exports = {directory, server, options, instance};
