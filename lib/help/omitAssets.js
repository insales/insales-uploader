/**
 * Найти разницу в списке файлов
 * @param  {object} sourceObject в качестве ключей предпологаемые пути к файлам с сервера
 * @param  {array} omitKeys     Пути к локальным файлам
 * @return {object}             Список путей (serverError - отсутствуют на сервере. localError - отсутствуют локально)
 */
export default function omitAssets (sourceObject, omitKeys) {
  let filteredObject = Object.assign({}, sourceObject);
  let localKeys = [];
  omitKeys.forEach(omitKey => {
    if (Object.keys(sourceObject).indexOf(omitKey) > -1) {
      delete filteredObject[omitKey];
    }else{
      localKeys.push(omitKey);
    }
  });
  return {
    serverError: localKeys,
    localError: Object.keys(filteredObject)
  };
};
