import logger from '../logger';
import type { UploaderContext, Asset } from '../types';
export default async function getWidgetType(context: UploaderContext, widget: Asset) {
  const options = context.options;
  if (
    widget.insalesInfo.apiField === 'preview_url' &&
    (!widget.asset_url || widget.asset_url === '/previews/original/missing.png')
  )
    return widget;
  try {
    const destination = { path: widget.path, skipUnchanged: options.theme.skipUnchanged };
    if (typeof widget.asset_url === 'string') {
      const url = new URL(widget.asset_url, options.theme.assetsDomain).href;
      await context.files.run('file:writeWithDownload', [{ ...destination, url }]);
    } else {
      await context.files.run('file:write', [{ ...destination, content: widget.content ?? '' }]);
    }
  } catch (error) {
    logger.error(
      `Ошибка при скачивании файла "${widget.path}", попробуйте запустить скачивание повторно.`,
    );
    throw error;
  }
  return widget;
}
