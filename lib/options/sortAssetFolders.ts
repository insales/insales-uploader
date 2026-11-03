import upath from 'upath';
import getInfoWidgetContent from '../help/getInfoWidgetContent';
import getPathKey from '../help/getPathKey';
import getExtention from '../help/getExtention';
import { safeName } from '../help/safeName';
import type {
  UploaderContext,
  RemoteAsset,
  Asset,
  AssetType,
  ProjectPaths,
  WidgetFile,
} from '../types';

interface AssetCatalog {
  byPath: Record<string, Asset>;
  downloads: Asset[];
}

function assetType(remote: RemoteAsset, paths: ProjectPaths): AssetType {
  const type = remote.handle ? 'Asset::Widget' : remote.type;
  if (!Object.hasOwn(paths.assets, type)) throw new Error(`Unknown asset type: ${type}`);
  // Membership is checked against the complete AssetType directory map above.
  return type as AssetType;
}

function assetName(remote: RemoteAsset): string {
  const name = safeName(remote.handle || remote.name || remote.inner_file_name);
  const humanName = remote.human_readable_name || remote['human-readable-name'];
  if (remote.handle || !humanName) return name;

  const missingExtension = !name.includes('.');
  const doubledLiquidExtension = humanName.includes('.liquid.liquid');
  const renamedSnippet = remote.type === 'Asset::Snippet' && name !== humanName;
  return missingExtension || doubledLiquidExtension || renamedSnippet ? safeName(humanName) : name;
}

function prepareAsset(remote: RemoteAsset, paths: ProjectPaths): Asset {
  const type = assetType(remote, paths);
  const name = assetName(remote);
  const directory = paths.assets[type];
  const filePath = upath.normalize(directory.folder + name);
  const isMedia = type === 'Asset::Media';
  const mediaFolder = paths.mediaExtension[getExtention(name)] || paths.folders.media;

  return {
    ...remote,
    type,
    name: remote.handle ? remote.name : name,
    path: filePath,
    pathKey: getPathKey(filePath),
    folder: directory.folder,
    backup: directory.backup,
    backupPath: upath.normalize(directory.backup + name),
    isMedia,
    isRaw: /\.scss$|\.json$/.test(name) || type === 'Asset::Configuration',
    pathMedia: isMedia ? upath.normalize(mediaFolder + name) : '',
    insalesInfo: { name, type },
    'human-readable-name': remote.human_readable_name || remote['human-readable-name'],
    asset_url: isMedia && /\.liquid$/.test(name) ? null : remote.asset_url,
  };
}

function widgetSource(base: Asset, remote: RemoteAsset, definition: WidgetFile): Asset {
  const name = safeName(remote.handle);
  const filePath = upath.normalize(`${base.path}/${definition.fileName}`);
  const widget: Asset = {
    ...base,
    path: filePath,
    pathKey: filePath,
    widget_type: remote.type,
    backupPath: upath.normalize(`${base.backup}${name}/${definition.fileName}`),
    insalesInfo: {
      name: definition.fileName,
      apiField: definition.apiField,
      type: 'Asset::Widget',
    },
  };

  const value = remote[definition.apiField];
  switch (definition.type) {
    case 'content':
      if (value != null && typeof value !== 'string') {
        throw new Error(`Invalid widget source: ${definition.apiField}`);
      }
      widget.content = typeof value === 'string' ? value : '';
      break;
    case 'url':
      widget.asset_url = typeof value === 'string' ? value : null;
      break;
    case 'info':
      widget.content = getInfoWidgetContent(widget, definition.infoField ?? []);
      break;
  }
  return widget;
}

function buildCatalog(
  remote: readonly RemoteAsset[],
  paths: ProjectPaths,
  widgetFiles: WidgetFile[],
): AssetCatalog {
  const downloads: Asset[] = [];
  const ordered = [...remote].sort((first, second) => {
    if (first.type < second.type) return 1;
    if (first.type > second.type) return -1;
    return 0;
  });

  for (const item of ordered) {
    const base = prepareAsset(item, paths);
    if (base.type === 'Asset::Widget') {
      downloads.push(...widgetFiles.map((definition) => widgetSource(base, item, definition)));
    } else {
      downloads.push(base);
    }
  }

  return {
    byPath: Object.fromEntries(downloads.map((asset) => [asset.pathKey, asset])),
    downloads,
  };
}

/** Replace the catalog atomically; invalid responses leave the previous catalog intact. */
export default async function sortAssetFolders(
  context: UploaderContext,
  remote: RemoteAsset[] = [],
): Promise<Record<string, Asset>> {
  const catalog = buildCatalog(remote, context.paths, context.widgetFiles);
  context.assets = catalog.byPath;
  context.downloadList = catalog.downloads;
  return catalog.byPath;
}
