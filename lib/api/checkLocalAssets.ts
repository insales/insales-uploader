import findDiffAssets from './findDiffAssets';
import logger from '../logger';
import log from '../logger/log';
import type { UploaderContext } from '../types';
export default async function checkLocalAssets(context: UploaderContext, report = true) {
  const folders = Object.fromEntries(
    Object.entries(context.paths.foldersDefaults).filter(([key]) => key !== 'widget_types'),
  );
  const assets = Object.fromEntries(
    Object.entries(context.assets).filter(([, asset]) => asset.type !== 'Asset::Widget'),
  );
  const errors = await findDiffAssets(folders, assets);
  if (report) {
    for (const [files, message] of [
      [errors.localError, 'Внимание, в локальной версии отсутствуют следующие файлы:'],
      [errors.serverError, 'Внимание, на сервере отсутствуют следующие файлы:'],
    ] as const) {
      if (files.length) {
        console.warn(message);
        files.forEach((file) => logger.red(file));
      }
    }
    if (!errors.localError.length && !errors.serverError.length)
      log('Список файлов на сервере совпадает с локальной версией');
  }
  return errors;
}
