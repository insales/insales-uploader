const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const {execFile} = require('node:child_process');
const {promisify} = require('node:util');
const {createHash} = require('node:crypto');

const execute = promisify(execFile);
const repository = path.resolve(__dirname, '..');
const removed = new Set(['vinyl-fs', 'gulp-plumber', 'through2', 'glob-watcher', 'liftoff',
  'v8flags', 'minimist', 'moment', 'clone', 'fancy-log', 'ansi-colors', 'color-support']);

async function npm(args, cwd) {
  // npm_execpath is set by npm run on Windows too; no cmd.exe quoting or shell needed.
  const cli = process.env.npm_execpath;
  assert.ok(cli, 'Run through npm run test:package');
  return execute(process.execPath, [cli, ...args], {cwd, maxBuffer: 4 * 1024 * 1024});
}

async function checksum(file) {
  return createHash('sha256').update(await fs.readFile(file)).digest('hex');
}

async function main() {
  const destination = path.join(repository, '.artifacts');
  await fs.mkdir(destination, {recursive: true});
  const source = JSON.parse(await fs.readFile(path.join(repository, 'package.json'), 'utf8'));
  const argument = process.argv[2];
  let archive = argument === '--existing'
    ? path.join(destination, `insales-uploader-${source.version}.tgz`)
    : argument && path.resolve(argument);
  if (!archive) {
    // The check command already compiled and tested dist. Never rebuild this artifact.
    const packed = await npm(['pack', '--ignore-scripts', '--json', '--pack-destination', destination], repository);
    const [metadata] = JSON.parse(packed.stdout);
    archive = path.join(destination, metadata.filename);
    console.log(`Packed ${metadata.filename}: ${metadata.size} bytes (${metadata.unpackedSize} unpacked)`);
  }
  const before = await checksum(archive);
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'insales-uploader-package-'));
  try {
    await fs.writeFile(path.join(temporary, 'package.json'), JSON.stringify({name: 'uploader-consumer', private: true}));
    await npm(['install', '--omit=dev', '--no-audit', '--no-fund', archive], temporary);

    const installed = path.join(temporary, 'node_modules/insales-uploader');
    const pkg = JSON.parse(await fs.readFile(path.join(installed, 'package.json'), 'utf8'));
    assert.equal(pkg.version, source.version);
    assert.equal(pkg.engines.node, '>=22.18.0');
    assert.deepEqual(Object.keys(pkg.dependencies).sort(), [
      'chokidar', 'commander', 'is-binary-buffer', 'jszip', 'node-notifier',
      'open', 'picomatch', 'progress', 'semver', 'upath',
    ]);
    assert.equal(pkg.main, 'dist/index.js');
    assert.equal(pkg.types, 'dist/index.d.ts');
    assert.equal(pkg.bin.uploader, 'bin/uploader.js');

    const lock = JSON.parse(await fs.readFile(path.join(temporary, 'package-lock.json'), 'utf8'));
    for (const location of Object.keys(lock.packages)) {
      const name = location.split('node_modules/').at(-1);
      assert.ok(!removed.has(name), `Removed runtime dependency returned: ${name}`);
      assert.notEqual(name, 'typescript', 'Consumer must not need TypeScript at runtime');
      assert.notEqual(name, 'eslint', 'Consumer must not install development tools');
    }

    const fixtures = path.join(repository, 'test/fixtures/package');
    for (const file of await fs.readdir(fixtures)) await fs.copyFile(path.join(fixtures, file), path.join(temporary, file));
    await execute(process.execPath, ['--test', 'runtime.cjs'], {cwd: temporary});
    await execute(process.execPath, ['esm.mjs'], {cwd: temporary});
    const cli = await npm(['exec', '--offline', '--', 'uploader', '--version'], temporary);
    assert.equal(cli.stdout.trim(), pkg.version);
    await npm(['exec', '--offline', '--', 'uploader', 'init'], temporary);
    assert.match(await fs.readFile(path.join(temporary, 'insales-config.json'), 'utf8'), /tokenEnv/);

    await fs.writeFile(path.join(temporary, 'tsconfig.json'), JSON.stringify({
      compilerOptions: {
        target: 'ES2022', module: 'NodeNext', moduleResolution: 'NodeNext', strict: true,
        noEmit: true, esModuleInterop: true, skipLibCheck: false,
        typeRoots: [path.join(repository, 'node_modules/@types')], types: ['node'],
      },
      include: ['consumer.cts', 'consumer.mts'],
    }));
    await execute(process.execPath, [require.resolve('typescript/bin/tsc'), '-p', temporary], {cwd: temporary});
    assert.equal(await checksum(archive), before, 'Checked archive must remain unchanged');
    if (!argument) await fs.writeFile(`${archive}.sha256`, `${before}  ${path.basename(archive)}\n`);
    console.log(`Package verified: CJS, ESM, CLI, API workflows, TypeScript consumers; ${Object.keys(lock.packages).length - 2} production packages`);
    console.log(`SHA256 ${before}`);
    console.log(`Artifact: ${archive}`);
  } finally {
    assert.equal(path.dirname(temporary), path.resolve(os.tmpdir()));
    assert.ok(path.basename(temporary).startsWith('insales-uploader-package-'));
    await fs.rm(temporary, {recursive: true, force: true});
  }
}

main().catch(error => {
  console.error(error.stdout || error.stderr || error);
  process.exitCode = 1;
});
