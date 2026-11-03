import listFile from '../insalesApi/listFile';
import DownloadManager from '../tasks/file';
export default async function downloadFiles() {
  const files = await listFile(this.options, this.paths);
  const tasks = files.map(file => ({...file, skipUnchanged: this.options.theme.skipUnchanged}));
  await DownloadManager.run('file:writeWithDownload', tasks, {template: 'Downloading: :name [:bar] :percent'});
  return this;
}
