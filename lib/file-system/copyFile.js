import fs from 'node:fs';
import path from 'node:path';
function copyFile(source, destination, {skipUnchanged = false} = {}) {
  if (skipUnchanged) {
    const content = fs.readFileSync(source);
    try {
      if (content.equals(fs.readFileSync(destination))) return;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  fs.mkdirSync(path.dirname(destination), {recursive: true});
  fs.copyFileSync(source, destination);
}
export default {sync: copyFile};
