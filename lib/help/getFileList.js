import fs from 'fs';

/**
 * Получить массив файлов из директории
 */
export default function getFileList(dir, instance) {
  return new Promise((resolve, reject) => {
    let stat = null;
    try {
      stat = fs.statSync(dir);
    } catch (e) {
      resolve([]);
    }

    if (stat && stat.isDirectory()) {
      let files = fs.readdirSync(dir);
      let uploadList = files.reduce((prev, curr)=> {
        let file = instance.getFileInfo({path: dir + '/' +curr}, true);
        if (file.isDirectory) {
          return [...prev]
        }
        return [...prev, file.asset]
      }, []);

      resolve(uploadList)
    }else {
      resolve([])
    }
  });
}
