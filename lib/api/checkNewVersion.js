import latestVersion from 'latest-version';
import compareVersions from 'compare-versions';
import getRootPath from '../help/getRootPath';
import logger from '../logger';

/**
* Проверка версии
*/
export default function checkNewVersion () {
  return new Promise((resolve, reject) => {
    const pkg = require(getRootPath() + '/package.json');

    latestVersion('insales-uploader').then(version => {
      let pkgDiff = compareVersions(version, pkg.version);
      if (pkgDiff <= 0) {
        resolve();
      }else{
        logger.blue(`Внимание! Доступна новая версия insales-uploader => ${version}`);
        resolve();
      }
    }).catch(() => {
      resolve();
    }).catch(() => {
      resolve();
    });

  });
};
