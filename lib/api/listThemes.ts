import logger from '../logger';
import checkNewVersion from './checkNewVersion';
import updateListThemes from '../insalesApi/updateListThemes';
import type { UploaderContext } from '../types';
export default async function listThemes(context: UploaderContext) {
  await checkNewVersion();
  const themes = await updateListThemes(context);
  logger.green('Доступные темы:');
  for (const theme of themes.list)
    logger.bold(`${theme.title} (${theme.type}): ${theme.id} ${theme.currentTheme}`);
  return themes;
}
