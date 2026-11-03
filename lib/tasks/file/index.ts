import write from './write';
import writeWithDownload from './writeWithDownload';
import { TaskManager } from '../../taskManager';
import type { FileTasks } from '../../types';
export class FileService extends TaskManager<FileTasks> {
  constructor() {
    super();
    this.create('file:write', write);
    this.create('file:writeWithDownload', writeWithDownload);
  }
}
export default FileService;
