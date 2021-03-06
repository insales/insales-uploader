'use strict';
import path from 'path';
import upath from 'upath';
import clone from 'clone';
import defaults from './defaults';
import deepMerge from '../help/deepMerge.js';

/**
 * Смешать переданные настройки с дефолтными настройками
 */
export default function mergeOptions (_options={}) {
  const options = deepMerge( defaults, _options );

  testRequire(options.theme.id, 'Отсутствует id темы!');
  testRequire(options.account.id, 'Отсутствует id аккаунта!');
  testRequire(options.account.token, 'Отсутствует token аккаунта!');
  testRequire(options.account.url, 'Отсутствует url аккаунта!');

  options.account.protocol = (options.account.http) ? 'http://' : 'https://';

  // абсолютный путь корня проекта
  options.theme.root = upath.normalize(path.resolve(options.theme.root));

  // урл без http и /. Например shop-48497.myinsales.ru
  options.account.url = options.account.url.replace(/^http.*:[www]*\/\//g, '').split('/')[0];
  // пермалинк для темы
  options.handle = `${options.account.url.split('.')[0]}-${options.theme.id}`;
  // Ссылка на превью темы
  options.themeUrl = options.account.protocol + options.account.url + '/?theme_preview=' + options.theme.id

  // Настройки для подключения к API
  options.insalesApi = {
    id: options.account.id,
    secret: options.account.token,
    http: options.account.http
  }

  return clone(options);
}

/**
 * Проверить обязательное свойство
 */
function testRequire(value, message) {
  if (!value) throw new Error(message);
}
