import upath from 'upath';
import fs from 'fs';

/**
 * Синхронно удалить директорию
 * @param  {string} dirPath путь к удаляемой директории
 */
export default function removeDir(dirPath){
  const available = (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory());

  if (!available) {
    return;
  }

  let files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const curPath = upath.join(dirPath, file);
    const isDirectory = fs.statSync(curPath).isDirectory();
    if(isDirectory) {
      let filesInner = fs.readdirSync(curPath);

      filesInner.forEach(file => {
        const curPathInner = upath.join(curPath, file);
        const isDirectory = fs.statSync(curPathInner).isDirectory();
        if(isDirectory) {
          fs.rmdirSync(curPathInner);
        } else {
          fs.unlinkSync(curPathInner);
        }
      });

      fs.rmdirSync(curPath);
    } else {
      fs.unlinkSync(curPath);
    }
  });

  fs.rmdirSync(dirPath);
}

function removeFiles(dirPath) {
  let files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const curPath = upath.join(dirPath, file);
    const isDirectory = fs.statSync(curPath).isDirectory();
    if(isDirectory) {
      fs.rmdirSync(curPath);
    } else {
      fs.unlinkSync(curPath);
    }
  });
}
