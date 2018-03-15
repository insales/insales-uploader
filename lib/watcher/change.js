import through from 'through2';
import {syncChange} from './synchronize';

/**
 * Ассет изменен
 */
export default function change(instance, callOnUpdate) {
  if (!callOnUpdate) callOnUpdate = ()=> {};
  return through.obj((file, encoding, callback) => {
    if (file.isNull()) {
      // nothing to do
      return callback(null, file);
    }

    syncChange(instance, file, function () {
      if (file.isAsset) {
        callback(null, file);
      }else{
        instance.TaskManager.run('asset:change', [file.asset]).then(()=>{
          callOnUpdate(file);
          callback(null, file);
        });
      }
    })
  });
}
