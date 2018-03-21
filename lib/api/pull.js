import removeDir from '../file-system/removeDir';

/**
 * Скачать тему предварительно очистив директории
 */
export default function pull(paths) {
  return new Promise((resolve, reject) => {
    Object.values(paths.foldersDefaults).forEach((folder) => {
      removeDir(folder);
    });

    this.download().then(() => {
      resolve()
    });
  });
}
