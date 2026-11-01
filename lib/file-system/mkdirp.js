import fs from 'node:fs';
function mkdirp(path) { return fs.mkdirSync(path, {recursive: true}); }
mkdirp.sync = mkdirp;
export default mkdirp;
