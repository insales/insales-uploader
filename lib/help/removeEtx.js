
/**
 * Удаление спецсимвол
 */
export default function removeEtx (str, name) {
  if ((str===null) || (str==='')){
    str = '';
  }else{
    str = str.toString();
    let searchRegExp = /\x03/g;
    if (searchRegExp.test(str)) {
      console.log(`Удалите спецсимвол \\u0003 из файла ${name}`);
      str = str.replace(/\x03/g, '');
    }
  }

  return str;
}
