import through from 'through2';
import {syncChange} from './synchronize';

/**
 * Ассет изменен
 */
export default function change(instance, callOnUpdate, onStreamUpdate) {
  if (!callOnUpdate) callOnUpdate = ()=> {};
  if (!onStreamUpdate) onStreamUpdate = ()=> {};
  return through.obj((file, encoding, callback) => {
    if (file.isNull()) {
      // nothing to do
      return callback(null, file);
    }

    syncChange(instance, file, function () {
      if (file.isAsset) {
        callback(null, file);
      }else{
        file.asset.insalesInfo.content = file.insalesInfo.content;
        instance.TaskManager.run('asset:change', [file.asset]).then(()=>{
          callOnUpdate(file);
          onStreamUpdate(file);
          callback(null, file);
        });
      }
    })
  });
}
