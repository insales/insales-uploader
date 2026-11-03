import fs from 'node:fs';
export default function removeDir(directory: string) {
  // rm removes directory symlinks themselves rather than following their targets.
  fs.rmSync(directory, { recursive: true, force: true });
}
