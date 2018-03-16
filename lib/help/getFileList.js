import fs from 'fs';

/**
 * Получить массив файлов из директории
 */
export default function getFileList(dir, instance) {
  return new Promise((resolve, reject) => {
    const stat = fs.statSync(dir);
    if (stat.isDirectory()) {
      let files = fs.readdirSync(dir);
      const uploadList = files.reduce((prev, curr)=> {
        const file = instance.getFileInfo({path: dir + '/' +curr}, true);
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
