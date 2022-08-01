'use strict';
import InsalesApi from 'insales';
import logger from '../logger';
import widgetFiles from '../options/widgetFiles';
import objectFilter from '../help/objectFilter'

/**
 * editAsset({content: 'Шаблон для {{product.title}}'}, 123123123, '/path/product.liquid', options);
 *
 * Обновление ассета
 * @param {object} insalesInfo объект с контентом
 * @param {string} widgetId id виджета
 * @param {string} path путь к файлу
 * @param {object} options настройки
 */
export default function editWidgetType(insalesInfo, widgetId, path, options, log = true) {
  const InSales = InsalesApi(options.insalesApi);

  return new Promise(function (resolve, reject) {
    let apiFiled = getApiField(insalesInfo.name)
    if (!apiFiled) {
      resolve()
    }
    let data = {};
    data[apiFiled] = insalesInfo.content;

    if (apiFiled == 'preview_base64') {
      data = {
        preview_base64: insalesInfo.base64
      }
    }
    if (apiFiled == 'info') {
      data = objectFilter(JSON.parse(insalesInfo.content), (item, key) => {
        return ['type', 'handle', 'widget_category_handle', 'block_template_handle', 'name', 'description'].includes(key)
      })
    }

    InSales.editWidgetType({
      token: options.account.token,
      url: options.account.url,
      theme: options.theme.id,
      widgetId: widgetId,
      data: data
    }).then(output => {
      if (log) {
        logger.green(`Edit: ${path}`);
        logger.bold(`name и description редактируются только через админ. панель`);
      }
      resolve();
    }).catch(err => {
      if (err.msg) {
        console.log(err.msg);
      }
      logger.error(`Error edit: ${path}`);
      resolve();
    });
  });
}

function getApiField(name) {
  let apiField = '';
  widgetFiles.forEach((item, i) => {
    if (name == item.fileName) {
      apiField = item.apiField;
    }
  });

  return apiField;
}
