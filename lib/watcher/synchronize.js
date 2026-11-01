import fs from 'node:fs';
import upath from 'upath';

function counterpart(file) {
  if (file.insalesInfo.type !== 'Asset::Media') return null;
  return upath.normalize(file.path) === file.asset.pathKey ? file.asset.pathMedia : file.asset.pathKey;
}
export function syncChange(instance, file, callback = () => {}) {
  if (instance.options.theme.assetsSync) {
    const info = instance.getFileInfo(file, true);
    const target = counterpart(info);
    if (target && target !== upath.normalize(info.path)) {
      const contents = Buffer.isBuffer(file.contents) ? file.contents : fs.readFileSync(file.path);
      const existing = fs.existsSync(target) ? fs.readFileSync(target) : null;
      if (!existing || !contents.equals(existing)) {
        fs.mkdirSync(upath.dirname(target), {recursive: true});
        // Use transformed Vinyl contents, not the original file on disk.
        fs.writeFileSync(target, contents);
      }
    }
  }
  callback();
}
export function syncUnlink(instance, filePath, callback = () => {}) {
  if (!instance.options.theme.assetsSync) return callback(false);
  const info = instance.getFileInfo({path: filePath}, false);
  const target = counterpart(info);
  if (target && target !== info.path) {
    try { fs.unlinkSync(target); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  callback(info.isAsset);
}
