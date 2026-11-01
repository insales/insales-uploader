import fs from 'node:fs';
import upath from 'upath';
import {syncUnlink} from './synchronize';
export default async function unlink(path, instance, testStat = false, callOnUpdate = () => {}, onStreamUpdate = () => {}) {
  if (testStat && fs.existsSync(path)) return false;
  const file = instance.getFileInfo({path: upath.normalize(path)}, false);
  const isAsset = await new Promise((resolve, reject) => {
    try { syncUnlink(instance, file.path, resolve); } catch (error) { reject(error); }
  });
  if (!isAsset) {
    await instance.TaskManager.run('asset:remove', [file.asset]);
    callOnUpdate(file);
    onStreamUpdate(file);
  }
  return file;
}
