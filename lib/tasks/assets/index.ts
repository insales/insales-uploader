import change from './change';
import remove from './remove';
import upload from './upload';
import download from './download';
import pushFile from './pushFile';
import type { UploaderContext } from '../../types';
export default function initAssetManager(context: UploaderContext): void {
  context.TaskManager.create('asset:download', (asset) => download(context, asset), 'pathKey');
  context.TaskManager.create('asset:upload', (asset) => upload(context, asset));
  context.TaskManager.create('asset:change', (asset) => change(context, asset), 'pathKey');
  context.TaskManager.create('asset:remove', (asset) => remove(context, asset), 'pathKey');
  context.TaskManager.create('asset:push:file', (asset) => pushFile(context, asset));
}
