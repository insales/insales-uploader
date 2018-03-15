import mkdirp from 'mkdirp';
import zipdir from 'zip-dir';
import moment from 'moment';
import upath from 'upath';
import log from 'fancy-log';

/**
* Архивировать тему
*/
export default function backup(paths) {
  const options = this.options;
  const root = options.theme.root;
  log(`theme:backup:start`);

  return new Promise((resolve, reject) => {
    const arhiveName = getArhiveName(options.handle);
    const saveTo = upath.normalize(`${root}/backup/${arhiveName}`);
    const option = {
      saveTo: saveTo,
      filter: filterThemeDir
     };

    mkdirp(`${root}/backup/`);

    zipdir(root, option, function (err, buffer) {
      if (err) {
        console.log(err);
      }

      log(`theme:backup:finish`);
      resolve();
    });
  });

  /**
   * Включить в архив только дефолтные папки
   * @param  {string} path путь к файлу
   */
  function filterThemeDir(path) {
    let includes = false;
    for (let folderKey in paths.foldersDefaults) {
      let include = upath.normalize(path + '/').includes(paths.foldersDefaults[folderKey]);
      if (include) {
        includes = true;
        break;
      }
    }

    return includes;
  }

}

function getArhiveName(handle) {
  const save_to = `${handle}-backup`;
  const saveTime = moment().format('YYYY-MM-D-HH-mm');

  return `${save_to}-${saveTime}.zip`;
}
