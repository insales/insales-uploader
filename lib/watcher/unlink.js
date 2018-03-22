import upath from 'upath';
import fs from 'fs';
import {syncUnlink} from './synchronize';

/**
 * Удаление ассета
 */
export default function unlink(path, instance, testStat = false, callOnUpdate, onStreamUpdate) {
  if (!callOnUpdate) callOnUpdate = ()=> {};
  if (!onStreamUpdate) onStreamUpdate = ()=> {};
  
  const options = instance.options;
  const paths = instance.paths;

  if (testStat) {
    let fileAvailable = fs.existsSync(path);
    if (fileAvailable) {
      return false;
    }
  }

  return new Promise((resolve, reject) => {

    let fakeFile = {
      path: upath.normalize(path),
      _base: upath.parse(path).base
    };

    const file = instance.getFileInfo(fakeFile, false);

    syncUnlink(instance, fakeFile.path, (isAsset)=> {
      if (isAsset) {
        resolve(file);
      }else{
        instance.TaskManager.run('asset:remove', [file.asset]).then(()=>{
          callOnUpdate(file);
          onStreamUpdate(file);
          resolve(file);
        });
      }
    })
  });
}
