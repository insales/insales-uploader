import mkdirp from 'mkdirp';

/**
 * Создание директорий для проекта
 */
export default function createDir(options, paths, action) {

  return new Promise(function (resolve, reject) {

    Object.values(paths.folders).forEach((el, index) => {
      mkdirp.sync(el);
    });

    resolve();
  });
}
