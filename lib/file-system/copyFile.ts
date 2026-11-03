import { hasCode } from '../help/errors';
import fs from 'node:fs';
import path from 'node:path';
function copyFile(source: string, destination: string, { skipUnchanged = false } = {}) {
  if (skipUnchanged) {
    const content = fs.readFileSync(source);
    try {
      if (content.equals(fs.readFileSync(destination))) return;
    } catch (error) {
      if (!hasCode(error, 'ENOENT')) throw error;
    }
  }
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}
export default { sync: copyFile };
