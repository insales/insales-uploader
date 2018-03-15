import removeDir from '../file-system/removeDir';

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
