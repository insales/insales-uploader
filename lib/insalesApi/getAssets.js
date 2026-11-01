export default function getAssets(types) {
  const list = types ? this.downloadList.filter(asset => types.includes(asset.type)) : this.downloadList;
  return this.TaskManager.run('asset:download', list, {template: 'Downloading: :name [:bar] :percent'});
}
