import path from 'path';

/**
 * Проверить имя файла на пробелы
 * @param  {string} filePath путь к файлу
 */
export default function fileValidation (filePath) {
  return new Promise((resolve, reject) => {
    let fileName = path.parse(filePath).base;

    if (/\s/g.test(fileName)) {
      reject(`Удалите пробелы в названии файла! ${fileName}`);
    }else{
      resolve();
    }
  });
};
