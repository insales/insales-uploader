import uploadFile from '../../insalesApi/uploadFile';
export default function pushFile(file) {
  const info = file.insalesInfo;
  return uploadFile({filename: info.name, attachment: info.base64}, file.path, this.options);
}
