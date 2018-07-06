import uploadFile from '../../insalesApi/uploadFile';
import logger from '../../logger';
import delay from 'delay';

/**
 * Загрузить файл в раздел файлы (attachment всегда base64)
 */
export default function pushFile (file) {
  const options = this.options;
  const path = file.path;
  let mainFile = file.insalesInfo;
  mainFile.filename = mainFile.name;
  if (!mainFile.attachment) mainFile.attachment = mainFile.base64;

  return new Promise((resolve, reject) => {
    delay(100)
      .then(() => {
        uploadFile(mainFile, path, options).then(() => {
          resolve()
        }, function () {
          logger.error('Download error');
          resolve();
        })
      })
  });
};
