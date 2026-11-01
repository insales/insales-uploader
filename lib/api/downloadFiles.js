import listFile from '../insalesApi/listFile';
import DownloadManager from '../tasks/file';
export default async function downloadFiles() {
  const files = await listFile(this.options, this.paths);
  await DownloadManager.run('file:writeWithDownload', files, {template: 'Downloading: :name [:bar] :percent'});
  return this;
}
