import fs from 'node:fs';
import upath from 'upath';
import { hasCode } from '../help/errors';
import type { UploaderContext, FileInput, FileInfo } from '../types';
export function counterpart(file: FileInfo): string | null {
  if (file.insalesInfo.type !== 'Asset::Media') return null;
  const target = file.path === file.asset.pathKey ? file.asset.pathMedia : file.asset.pathKey;
  return target && target !== file.path ? target : null;
}
export function syncChange(
  context: UploaderContext,
  input: FileInput,
  callback = (): void => {},
): string | null {
  let changed: string | null = null;
  if (context.options.theme.assetsSync) {
    const file = context.getFileInfo(input, true);
    const target = counterpart(file);
    if (target) {
      const contents = file.contents ?? fs.readFileSync(file.path);
      let existing: Buffer | undefined;
      try {
        existing = fs.readFileSync(target);
      } catch (error) {
        if (!hasCode(error, 'ENOENT')) throw error;
      }
      if (!existing || !contents.equals(existing)) {
        fs.mkdirSync(upath.dirname(target), { recursive: true });
        fs.writeFileSync(target, contents);
        changed = target;
      }
    }
  }
  callback();
  return changed;
}
export function syncUnlink(
  context: UploaderContext,
  filePath: string,
  callback: (isAsset: boolean) => void = () => {},
): string | null {
  if (!context.options.theme.assetsSync) {
    callback(false);
    return null;
  }
  const file = context.getFileInfo({ path: upath.normalize(filePath) }, false);
  const target = counterpart(file);
  if (target) {
    try {
      fs.unlinkSync(target);
    } catch (error) {
      if (!hasCode(error, 'ENOENT')) throw error;
    }
  }
  callback(file.isAsset);
  return target;
}
