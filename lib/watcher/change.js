import through from 'through2';
import {syncChange} from './synchronize';
export default function change(instance, callOnUpdate = () => {}, onStreamUpdate = () => {}) {
  return through.obj((file, encoding, callback) => {
    if (file.isNull()) return callback(null, file);
    Promise.resolve().then(() => {
      syncChange(instance, file, () => {});
      if (file.isAsset) return;
      return instance.TaskManager.run('asset:change', [file.asset]).then(() => {
        callOnUpdate(file);
        onStreamUpdate(file);
      });
    }).then(() => callback(null, file), callback);
  });
}
