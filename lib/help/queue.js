/**
 * Запуск промисов
 * @param  {array} all массив промисов
 * @param  {object} IU  иснтанс аплоадера
 */
export default function queue(all, IU) {
  return new Promise((resolve, reject) => {
    const output = [];

    next(all.splice(0, 1))

    function next(go) {
      if (typeof go[0] == 'function') {
        go[0].bind(IU)()
          .then(res => {
            output.push(res);

            if ( !next ) {
              return resolve(output)
            }

            next(all.splice(0,1));
          })
      }else{
        resolve(output);
      }
    }
  })
}
