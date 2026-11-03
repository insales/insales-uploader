import upath from 'upath';
import type { AssetType, NormalizedOptions, ProjectPaths } from '../types';
export const styleExt = ['.css', '.scss', '.css.liquid', '.scss.liquid', '.less'];
export const scriptsExt = ['.coffee', '.js', '.js.liquid', '.ts', '.jsx'];
export const svgExt = ['.svg', '.svg.liquid'];
export const imgExt = ['.jpg', '.jpeg', '.gif', '.ico', '.png', '.webp'];
export const fontsExt = ['.ttf', '.woff', '.woff2', '.otf', '.eot'];
export function getPaths(options: NormalizedOptions): ProjectPaths {
  const root = options.theme.root;
  const directory = (suffix: string) => upath.normalize(`${root}/${suffix}/`);
  const foldersDefaults = Object.fromEntries(
    ['templates', 'snippets', 'config', 'media', 'widget_types'].map((key) => [
      key,
      directory(key),
    ]),
  );
  const foldersAssets = Object.fromEntries(
    Object.entries({
      style: 'style',
      script: 'js',
      img: 'img',
      svg: 'svg',
      assetsMedia: 'media',
      fonts: 'fonts',
    }).map(([key, dir]) => [key, directory(`assets/${dir}`)]),
  );
  const groups = [
    [styleExt, 'style'],
    [scriptsExt, 'script'],
    [svgExt, 'svg'],
    [imgExt, 'img'],
    [fontsExt, 'fonts'],
  ] as const;
  const mediaExtension: Record<string, string> = {};
  for (const [extensions, key] of groups)
    for (const ext of extensions) mediaExtension[ext] = foldersAssets[key];
  return {
    root,
    files: directory('files'),
    widget_types: foldersDefaults.widget_types,
    folders: { ...foldersAssets, ...foldersDefaults },
    foldersDefaults,
    foldersAssets,
    mediaExtension,
    assets: {
      'Asset::Widget': {
        extension: ['.json', '.jpg', '.liquid'],
        backup: directory('backup/widget_types'),
        folder: foldersDefaults.widget_types,
      },
      'Asset::Template': {
        extension: '.liquid',
        backup: directory('backup/templates'),
        folder: foldersDefaults.templates,
      },
      'Asset::Snippet': {
        extension: '.liquid',
        backup: directory('backup/snippets'),
        folder: foldersDefaults.snippets,
      },
      'Asset::Configuration': {
        extension: ['.json', '.html'],
        backup: directory('backup/config'),
        folder: foldersDefaults.config,
      },
      'Asset::Media': {
        extension: groups.flatMap(([extensions]) => extensions),
        backup: directory('backup/media'),
        folder: foldersDefaults.media,
      },
    },
  };
}
export function getAssetPath(
  paths: ProjectPaths,
  type: AssetType,
  name: string,
  ext: string,
  isAssetsPath = false,
): string {
  let base = paths.assets[type].folder;
  if (isAssetsPath && type === 'Asset::Media') {
    base =
      paths.mediaExtension[ext] ??
      Object.entries(paths.mediaExtension).find(([suffix]) => name.includes(suffix))?.[1] ??
      paths.folders.media;
  }
  return upath.normalize(base + name);
}
