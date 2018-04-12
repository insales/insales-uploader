import isOnline from 'is-online';

/**
 * Проверить соединение с интернетом
 * @param  {String}  сообщение об ошибке
 * @return {Promise}
 */
export default function testOnline (errorMessage = 'Отсутствует соединение с интернетом!') {
  return new Promise((resolve, reject) => {
    isOnline().then(online => {
      if (online) {
        resolve();
      }else{
        console.log(errorMessage);
        reject();
      }
    });
  });
}
