'use strict';
import path from 'path';
import upath from 'upath';
import deepMerge from '../help/deepMerge.js';

const styleExt = ['.css', '.scss', '.css.liquid', '.scss.liquid', '.less'];
const scriptsExt = ['.coffee', '.js', '.js.liquid', '.ts', '.jsx'];
const svgExt = ['.svg', '.svg.liquid'];
const imgExt = ['.jpg', '.jpeg', '.gif', '.ico', '.png', '.webp'];
const fontsExt = ['.ttf', '.woff', '.woff2', '.otf', '.eot'];
const mediaPaths = [...styleExt, ...scriptsExt, ...svgExt, ...imgExt, ...fontsExt];

export function getPaths (options) {
  const root = options.theme.root;
  const pathsDefault = {
    root,
    folders: {},
    files: `${root}/files/`,
    foldersDefaults: {
      'templates': `${root}/templates/`,
      'snippets': `${root}/snippets/`,
      'config': `${root}/config/`,
      'media': `${root}/media/`
    },
    foldersAssets: {
      'style': `${root}/assets/style/`,
      'script': `${root}/assets/js/`,
      'img': `${root}/assets/img/`,
      'svg':`${root}/assets/svg/`,
      'assetsMedia': `${root}/assets/media/`,
      'fonts': `${root}/assets/fonts/`
    }
  };

  normalizePaths(pathsDefault.foldersDefaults);
  normalizePaths(pathsDefault.foldersAssets);

  pathsDefault.foldersDefaults = pathsDefault.foldersDefaults;
  pathsDefault.foldersAssets = pathsDefault.foldersAssets;

  // Все директории проекта
  pathsDefault.folders = deepMerge(Object.assign({}, pathsDefault.foldersAssets), pathsDefault.foldersDefaults);

  // Директории для отслеживания
  pathsDefault.toWatch = getExcludeFiles(options);
  pathsDefault.toWatchAssets = getExcludeFiles(options);

  Object.values(pathsDefault.folders).forEach((folder) => {
    let seeFolder = `${folder}*.*`;
    pathsDefault.toWatch.push(seeFolder);
  });
  Object.values(pathsDefault.foldersAssets).forEach((folder) => {
    let seeFolder = `${folder}*.*`;
    pathsDefault.toWatchAssets.push(seeFolder);
  });

  pathsDefault.snippets = `${pathsDefault.foldersDefaults.snippets}*.*`;
  pathsDefault.templates = `${pathsDefault.foldersDefaults.templates}*.*`;
  pathsDefault.config = `${pathsDefault.foldersDefaults.config}*.*`;

  pathsDefault.style = [`${pathsDefault.foldersAssets.style}*.*`]
  pathsDefault.script = [`${pathsDefault.foldersAssets.script}*.*`]
  pathsDefault.img = [`${pathsDefault.foldersAssets.img}*.*`]
  pathsDefault.svg = [`${pathsDefault.foldersAssets.svg}*.*`]
  pathsDefault.assetsMedia = [`${pathsDefault.foldersAssets.assetsMedia}*.*`]
  pathsDefault.fonts = [`${pathsDefault.foldersAssets.fonts}*.*`]

  styleExt.forEach((ext) => {
    let seeFolder = `${pathsDefault.foldersDefaults.media}*${ext}`;
    pathsDefault.style.push(seeFolder);
  });

  scriptsExt.forEach((ext) => {
    let seeFolder = `${pathsDefault.foldersDefaults.media}*${ext}`;
    pathsDefault.script.push(seeFolder);
  });

  imgExt.forEach((ext) => {
    let seeFolder = `${pathsDefault.foldersDefaults.media}*${ext}`;
    pathsDefault.img.push(seeFolder);
  });

  svgExt.forEach((ext) => {
    let seeFolder = `${pathsDefault.foldersDefaults.media}*${ext}`;
    pathsDefault.svg.push(seeFolder);
  });

  fontsExt.forEach((ext) => {
    let seeFolder = `${pathsDefault.foldersDefaults.media}*${ext}`;
    pathsDefault.fonts.push(seeFolder);
  });

  pathsDefault.media = [`${pathsDefault.foldersDefaults.media}*.*`];

  [ ...pathsDefault.style,
    ...pathsDefault.script,
    ...pathsDefault.img,
    ...pathsDefault.svg,
    ...pathsDefault.assetsMedia,
    ...pathsDefault.fonts ].forEach((path) => {
      let seeFolder = `!${path}`;
      pathsDefault.media.push(seeFolder);
    });


  // Сортировка файлов по директориям
  let style = getMediaExtensionPath(styleExt, 'style', pathsDefault.folders);
  let scripts = getMediaExtensionPath(scriptsExt, 'script', pathsDefault.folders);
  let svg = getMediaExtensionPath(svgExt, 'svg', pathsDefault.folders);
  let img = getMediaExtensionPath(imgExt, 'img', pathsDefault.folders);
  let fonts = getMediaExtensionPath(fontsExt, 'fonts', pathsDefault.folders);

  pathsDefault.mediaExtension = Object.assign(style, scripts, svg, img, fonts)

  // Если с ассетом указывался Asset::type
  pathsDefault.assets = {
    'Asset::Template': {
      'extension': '.liquid',
      'backup': upath.normalize(`${root}/backup/templates/`),
      'folder': pathsDefault.folders['templates']
    },
    'Asset::Snippet': {
      'extension': '.liquid',
      'backup': upath.normalize(`${root}/backup/snippets/`),
      'folder': pathsDefault.folders['snippets']
    },
    'Asset::Configuration': {
      'extension': ['.json', '.html'],
      'backup': upath.normalize(`${root}/backup/config/`),
      'folder': pathsDefault.folders['config']
    },
    'Asset::Media': {
      'extension': mediaPaths,
      'backup': upath.normalize(`${root}/backup/media/`),
      'folder': pathsDefault.folders['media']
    }
  }

  return pathsDefault;
}

/**
 * Получить правильный путь к ассету
 */
export function getAssetPath (paths, _type, _name, _ext) {
  const _assets = paths.assets;
  const _folders = paths.folders;
  const _mediaExtension = paths.mediaExtension;
  let basePath = _assets[_type]['folder'];

  if (task.isAssetsPath && _type === 'Asset::Media') {
    basePath = _folders['media'];
    if (_mediaExtension[_ext]) {
      basePath = _mediaExtension[_ext];
    }else{
      mediaPaths.forEach((ext, index) => {
        if (_name.indexOf(ext) > -1) {
          basePath = _mediaExtension[ext];
        }
      });
    }
  }

  return upath.normalize(basePath + _name);
}


/**
* Нормализация путей
*/
function normalizePaths(paths) {
  for (let key in paths) {
    paths[key] = upath.normalize(paths[key])
  }
}

/**
 * Исключает пути из отслеживания
 */
function getExcludeFiles(options) {
  const DEFAULTEXCLUDEFILES = [
    '**/*.DS_Store',
    '**/*.log',
    '**/*.temp',
    '**/*.tmp',
    '**/*._t_',
    '**/*.crdownload'
  ];
  var resultExclude = [];
  var isExclude = [];

  var _userExclude = options.theme.excludeFiles;
  if (typeof _userExclude == 'string') {
    _userExclude = [options.theme.excludeFiles];
  }

  resultExclude = [...DEFAULTEXCLUDEFILES, ..._userExclude];

  isExclude = resultExclude.reduce((result, value, key) => {
    result.push(`!${options.theme.root}/${value}`)
    return result;
  }, [])

  normalizePaths(isExclude)

  return isExclude;
}

/**
 * Присваивание директорий в зависимости от расширения
 */
function getMediaExtensionPath(arrayExt, dest, folders) {
  const result = {};
  arrayExt.forEach((ext, index) => {
    result[ext] = folders[dest];
  });

  return result;
}
