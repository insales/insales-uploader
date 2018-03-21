import upath from 'upath';
import getExtention from './getExtention';

/**
 * Получить путь который будет являться ключем для ассета
 * @param  {string} path путь к файлу
 */
export default function getPathKey(path) {
  const foldersDefaults = {
    templates: 'templates',
    snippets: 'snippets',
    config: 'config',
    media: 'media'
  }

  const parsePath = upath.parse(upath.toUnix(path));
  const name = parsePath.base;
  const dir = parsePath.dir.split('/').pop();
  const root = (parsePath.dir.includes('assets')) ? parsePath.dir.split('assets')[0] : parsePath.dir.split(dir)[0];
  const typePath = (foldersDefaults[dir]) ? foldersDefaults[dir] : foldersDefaults.media;

  return `${root}${typePath}/${name}`;
}
