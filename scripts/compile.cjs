const fs = require('node:fs/promises');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
async function compile() {
  const root = path.resolve(__dirname, '..');
  // Fixed build output, never a user-supplied theme path.
  await fs.rm(path.join(root, 'dist'), {recursive: true, force: true});
  const result = spawnSync(process.execPath, [require.resolve('typescript/bin/tsc'), '-p', path.join(root, 'tsconfig.json')], {stdio: 'inherit'});
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
}
compile().catch(error => { console.error(error); process.exitCode = 1; });
