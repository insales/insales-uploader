/**
 * Удаление спецсимвол
 */
export default function removeEtx(str: string | null, name: string) {
  if (str === null || str === '') {
    str = '';
  } else {
    str = str.toString();
    const searchRegExp = /\x03/g;
    if (searchRegExp.test(str)) {
      console.log(`Удалите спецсимвол \\u0003 из файла ${name}`);
      str = str.replace(/\x03/g, '');
    }
  }

  return str;
}
