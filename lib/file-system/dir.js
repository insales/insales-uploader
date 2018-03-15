import mkdirp from 'mkdirp';
import rmdir from 'rmdir';
import zipdir from 'zip-dir';
import fs from 'fs';
import path from 'path';
import upath from 'upath';
import delay from 'delay';

/**
 * удалить директории с файлами, создать пустые директории
 */
export function reloadDir(paths, action) {
  return new Promise(function (resolve, reject) {
    if (action.method === 'backup') {
      _.forEach(paths.assets, function(el, index) {
        rmdir(el.backup, function (err, dirs, files) {
          delay(100)
            .then(() => {
              mkdirp(el.backup);
            })
        });
      });
    }

    delay(500)
      .then(() => {
        resolve();
      })
  });
}

/**
 * Архивировать директорию
 */
export function zippedDir(paths, _path, _save_to, _filter) {

  return new Promise(function (resolve, reject) {
    const _today = new Date;
    const _month = _today.getMonth() + 1;
    const _date = `${_today.getFullYear()}-${_month}-${_today.getDate()}-${_today.getHours()}-${_today.getMinutes()}`

    const _pathDir = upath.normalize(_path);
    const _option = { saveTo: `${_pathDir}/${_save_to}-${_date}.zip` }

    if (_filter) {
      _option['filter'] = function (pathDirs, stat) {
        const _key = _.findKey(paths.assets, function(o) {
        const _pathNorm = upath.normalize(o[_filter]).slice(0, -1);
          return pathDirs.indexOf(_pathNorm) > -1;
        })
        if (_key) {
          return true;
        }else{
          return false;
        }
      }
    }

    zipdir(_pathDir, _option, function (err, buffer) {
      if (err) {
        console.log(err)
      }else{
        delay(500)
          .then(() => {
            _.forEach(paths.assets, function(el, index) {
              rmdir(el.backup, function (err, dirs, files) {
              });
            });
          })

      }
      resolve({
        message: `finish zip ${_save_to}-${_date}.zip`
      });
    });
  });
}
