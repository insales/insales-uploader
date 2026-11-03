import upath from 'upath';
import fs from 'node:fs';
import { isUtf8 } from 'node:buffer';
import isBinary from 'is-binary-buffer';
import removeEtx from './removeEtx';
import getAssetType from './getAssetType';
import getPathKey from './getPathKey';
import getExtention from './getExtention';
import type { UploaderContext, FileInput, FileInfo, AssetInfo, Asset } from '../types';
export default function getFileInfo(
  context: UploaderContext,
  input: FileInput,
  withContent = false,
): FileInfo {
  const filePath = upath.normalize(input.path);
  const parent = upath.basename(upath.dirname(filePath));
  const grandparent = upath.basename(upath.dirname(upath.dirname(filePath)));
  const info: AssetInfo = {
    name: upath.basename(filePath),
    type: getAssetType(grandparent === 'widget_types' ? grandparent : parent),
  };
  let contents = input.contents;
  let isDirectory = false;
  if (withContent && contents === undefined) {
    isDirectory = fs.statSync(filePath).isDirectory();
    if (!isDirectory) contents = fs.readFileSync(filePath);
  }
  if (withContent && contents !== undefined) {
    info.base64 = contents.toString('base64');
    // Signature detection alone misses unknown/short binary files. Decoding those
    // as UTF-8 would replace bytes before they reach the API.
    if (isBinary(contents) || contents.includes(0) || !isUtf8(contents))
      info.attachment = info.base64;
    else info.content = removeEtx(contents.toString('utf8'), info.name);
  }
  const pathKey = getPathKey(filePath);
  const asset: Asset = {
    ...context.assets[pathKey],
    type: info.type,
    path: filePath,
    pathKey,
    insalesInfo: info,
    pathMedia: context.paths.mediaExtension[getExtention(info.name)]
      ? upath.normalize(context.paths.mediaExtension[getExtention(info.name)] + info.name)
      : false,
  };
  const result: FileInfo = {
    path: filePath,
    contents,
    asset,
    insalesInfo: info,
    isDirectory,
    isAsset: !!asset.pathMedia && filePath === asset.pathMedia && filePath !== pathKey,
  };
  return result;
}
