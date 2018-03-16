import change from './change';
import remove from './remove';
import upload from './upload';
import download from './download';
import pushFile from './pushFile';

export default function initAssetManager(Manager) {
  const TaskManager = Manager || this.TaskManager;
  const taskChange = change.bind(this);
  const taskRemove = remove.bind(this);
  const taskDownload = download.bind(this);
  const taskUpload = upload.bind(this);
  const taskPushFile = pushFile.bind(this);

  TaskManager.create('asset:download', taskDownload, 'pathKey')
  TaskManager.create('asset:upload', taskUpload)
  TaskManager.create('asset:change', taskChange, 'pathKey')
  TaskManager.create('asset:remove', taskRemove, 'pathKey')
  TaskManager.create('asset:push:file', taskPushFile)
}
