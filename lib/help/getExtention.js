/**
 * Получить расширение файла
 * @param  {string} path
 */
export default function getExtention(path) {
  let fileArray = path.split('.').reverse();
  let fileExt = fileArray[0];
  if (fileArray.length > 2 && fileArray[0] === 'liquid') {
    fileExt = `${fileArray[1]}.${fileArray[0]}`
  }
  return `.${fileExt}`;
}
