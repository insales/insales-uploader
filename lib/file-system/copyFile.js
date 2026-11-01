import fs from 'node:fs';
import path from 'node:path';
function copyFile(source, destination) {
  fs.mkdirSync(path.dirname(destination), {recursive: true});
  fs.copyFileSync(source, destination);
}
export default {sync: copyFile};
