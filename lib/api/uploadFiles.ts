import getFileList from '../help/getFileList';
import log from '../logger/log';
import type { UploaderContext } from '../types';
export default async function uploadFiles(context: UploaderContext): Promise<void> {
  log('upload:file:start');
  await context.TaskManager.run('asset:push:file', await getFileList(context.paths.files, context));
  log('upload:file:finish');
}
