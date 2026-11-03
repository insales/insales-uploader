import createClient from './client';
import logger from '../logger';
import type { NormalizedOptions } from '../types';
export default async function uploadFile(
  file: { filename: string; attachment: string },
  path: string,
  options: NormalizedOptions,
  log = true,
): Promise<void> {
  try {
    await createClient(options.insalesApi).uploadFile({
      token: options.account.token,
      url: options.account.url,
      files: { file },
    });
    if (log) logger.green(`uploadFile: ${path}`);
  } catch (error) {
    logger.error(`Error uploadFile: ${path}`);
    throw error;
  }
}
