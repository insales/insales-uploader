import semver from 'semver';
import getRootPath from '../help/getRootPath';
import logger from '../logger';
export default async function checkNewVersion() {
  try {
    const response = await fetch('https://registry.npmjs.org/insales-uploader/latest', {signal: AbortSignal.timeout(3000)});
    if (!response.ok) return;
    const {version} = await response.json();
    const pkg = require(getRootPath() + '/package.json');
    if (semver.valid(version) && semver.gt(version, pkg.version)) logger.blue(`Доступна новая версия insales-uploader => ${version}`);
  } catch { /* An optional update check must not block synchronization. */ }
}
