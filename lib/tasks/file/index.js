import write from './write';
import writeWithDownload from './writeWithDownload';
import TaskManager from '../../taskManager/index.js';

function initDownloadManager() {
  const DownloadManager = new TaskManager();
  const taskWrite = write.bind(this);
  const taskWriteWithDownload = writeWithDownload.bind(this);

  DownloadManager.create('file:write', taskWrite);
  DownloadManager.create('file:writeWithDownload', taskWriteWithDownload);

  return DownloadManager;
}

export default initDownloadManager()
