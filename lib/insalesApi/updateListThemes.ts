import createClient, { remoteTheme } from './client';
import themeInfo from '../options/themeInfo';
import type { UploaderContext } from '../types';
export default async function updateListThemes(context: UploaderContext) {
  const options = context.options;
  const result = await createClient(options.insalesApi).listThemes({
    token: options.account.token,
    url: options.account.url,
  });
  return themeInfo(
    options,
    (Array.isArray(result.data) ? result.data : [result.data]).map(remoteTheme),
  );
}
