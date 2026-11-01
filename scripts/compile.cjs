const fs = require('node:fs/promises');
const path = require('node:path');

async function compile() {
  const {transformFileAsync} = await import('@babel/core');
  const root = path.resolve(__dirname, '..');
  const source = path.join(root, 'lib');
  const output = path.join(root, 'dist');
  // The output directory is fixed inside this repository.
  await fs.rm(output, {recursive: true, force: true});
  for (const entry of await fs.readdir(source, {recursive: true, withFileTypes: true})) {
    if (!entry.isFile() || !entry.name.endsWith('.js')) continue;
    const file = path.join(entry.parentPath, entry.name);
    const destination = path.join(output, path.relative(source, file));
    const result = await transformFileAsync(file, {configFile: false, babelrc: false,
      presets: [[require.resolve('@babel/preset-env'), {
        targets: {node: '22.18'}, modules: 'commonjs', exclude: ['transform-dynamic-import']
      }]]});
    await fs.mkdir(path.dirname(destination), {recursive: true});
    await fs.writeFile(destination, result.code + '\n');
  }
}
compile().catch(error => { console.error(error); process.exitCode = 1; });
