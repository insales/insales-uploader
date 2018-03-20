import getExtention from './getExtention';
import {styleExt, scriptsExt, svgExt, imgExt, fontsExt} from '../options/getProjectPaths';

/**
 * Получить тип файла
 */
export default function getTypeFile(path) {
  let extention = getExtention(path);

  if (~styleExt.indexOf(extention)) {
    return 'style';
  }
  else if (~scriptsExt.indexOf(extention)) {
    return 'script';
  }
  else if (~svgExt.indexOf(extention)) {
    return 'svg';
  }
  else if (~imgExt.indexOf(extention)) {
    return 'img';
  }
  else if (~fontsExt.indexOf(extention)) {
    return 'font';
  } else {
    return 'media';
  }
}
