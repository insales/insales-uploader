import upath from 'upath';

/**
 * Получить путь который будет являться ключем для ассета
 * @param  {string} path путь к файлу
 */
export default function getPathKey(path) {
  const foldersDefaults = {
    templates: 'templates',
    snippets: 'snippets',
    config: 'config',
    media: 'media',
    widget_types: 'widget_types'
  }

  const parsePath = upath.parse(upath.toUnix(path));
  const name = parsePath.base;
  const dir = parsePath.dir.split('/').pop();
  const root = (parsePath.dir.includes('assets')) ? parsePath.dir.split('assets')[0] : parsePath.dir.split(dir)[0];
  const typePath = (foldersDefaults[dir]) ? foldersDefaults[dir] : foldersDefaults.media;
  let result = `${root}${typePath}/${name}`;

  let pathNormalize = upath.normalize(path);
  let parentFirstDir = upath.dirname(pathNormalize).split('/').pop();
  let parentSecondDir = upath.dirname(pathNormalize).split('/').reverse()[1];
  if (parentSecondDir == 'widget_types') {
    result = pathNormalize;
  }

  return upath.normalize(result);
}
