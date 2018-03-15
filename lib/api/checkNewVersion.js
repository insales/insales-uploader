import latestVersion from 'latest-version';
import compareVersions from 'compare-versions';
import readPkg from 'read-pkg';
import logger from '../logger';

/**
* Проверка версии
*/
export default function checkNewVersion () {
  return new Promise((resolve, reject) => {
    readPkg('./').then(pkg => {
      if (pkg && pkg.name !== 'insales-uploader') {
        resolve();
      }

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
      });
    });
  });
};
