import through from 'through2';

/**
 * Получить информацию об ассете
 */
export default function getInfo(instance) {
  return through.obj(function(file, encoding, callback) {
    if (file.isNull()) {
      // nothing to do
      return callback(null, file);
    }

    return callback(null, instance.getFileInfo(file, true));
  });
}
