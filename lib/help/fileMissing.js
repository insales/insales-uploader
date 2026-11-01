import fs from 'node:fs';
/**
 * Проверка на отсутствие файла
 */
export default function fileMissing(path) {
  return new Promise((resolve, reject) => {
    fs.stat(path, (err, stats) => {
      if (err && err.code === 'ENOENT') {
        resolve();
      }else if (err) {
        reject(err);
      }else{
        reject();
      }
    });
  });
}
