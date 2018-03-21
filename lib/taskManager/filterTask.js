/**
 * Фильтровать задачи по одинаковым параметрам
 * @param  {object} el
 * @param  {number} index
 * @param  {array} own         
 * @param  {string} filterParam
 * @return {boolean}
 */
export default function filterTask(el, index, own, filterParam) {
  let includes = true;
  for (let element of own.slice(index+1)) {
    let isFiltered = (filterParam && typeof element[filterParam] != 'undefined' && typeof el[filterParam] != 'undefined' && element[filterParam] === el[filterParam]);
    if (isFiltered) {
      includes = false;
      break;
    }
  }
  return includes;
}
