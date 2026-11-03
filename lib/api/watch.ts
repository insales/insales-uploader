import logger from '../logger';
import log from '../logger/log';
import checkNewVersion from './checkNewVersion';
import sortAssetFolders from '../options/sortAssetFolders';
import updateAssets from '../insalesApi/updateAssets';
import updateListThemes from '../insalesApi/updateListThemes';
import openBrowser from '../tools/openBrowser';
import checkLocalAssets from './checkLocalAssets';
import type { InSalesUploader } from '../app';
import type { UpdateCallback } from '../types';

async function prepareLocalTheme(uploader: InSalesUploader): Promise<void> {
  await checkNewVersion();
  const remoteAssets = await updateAssets(uploader.options);
  await sortAssetFolders(uploader, remoteAssets);
  await checkLocalAssets(uploader);

  if (uploader.options.theme.assetsSync) await uploader.initAssets();
}

async function showTheme(uploader: InSalesUploader): Promise<void> {
  const themes = await updateListThemes(uploader);
  if (themes.current) {
    logger.send('Тема:', themes.current.title);
    logger.send('Статус темы:', themes.current.type);
  }
  logger.send('URL:', uploader.options.themeUrl);

  if (uploader.options.util.openBrowser) await openBrowser(uploader.options.themeUrl);
}

export default async function watch(
  uploader: InSalesUploader,
  onUpdate?: UpdateCallback,
): Promise<InSalesUploader> {
  try {
    await prepareLocalTheme(uploader);
    await uploader.watcherService.start(onUpdate);
    await showTheme(uploader);
    uploader.session.start(() => uploader.stopStream());
    return uploader;
  } catch (error) {
    // Preserve the operation's original error even if cleanup also fails.
    try {
      await uploader.stopStream();
    } catch (cleanupError) {
      log(cleanupError);
    }
    throw error;
  }
}
