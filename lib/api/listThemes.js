'use strict';
import log from 'fancy-log';
import logger from '../logger';
import checkNewVersion from './checkNewVersion';
import updateAssets from '../insalesApi/updateAssets';
import updateListThemes from '../insalesApi/updateListThemes';
import testOnline from '../help/testOnline';

/**
 * Получить список тем (выводятся в консоль)
 */
export default function listThemes() {
  const options = this.options;

  return new Promise((resolve, reject) => {

    testOnline('Отсутствует соединение с интернетом!')
      .then(checkNewVersion)
      .then(() => {
        return updateListThemes.apply(this);
      })
      .then((themes) => {
        logger.green('Доступные темы:');
        themes.list.forEach((theme) => {
          logger.bold(`${theme.title} (${theme.type}): ${theme.id} ${theme.currentTheme}`);
        });

        resolve(themes);
      })
      .catch(err => {
        if (err) log(err);
        reject(this);
      })
  });
};
