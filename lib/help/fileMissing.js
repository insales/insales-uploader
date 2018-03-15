/**
 * Проверка на отсутствие файла
 */
export default function fileMissing(path) {
  return new Promise((resolve, reject) => {
    fs.stat(path, (err, stats) => {
      if (err) {
        resolve();
      }else{
        reject();
      }
    });
  });
}
