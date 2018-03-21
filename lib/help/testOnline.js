import https from 'https';

/**
 * Проверить соединение с интернетом
 * @param  {String}  сообщение об ошибке
 * @return {Promise}
 */
export default function testOnline (errorMessage = 'Отсутствует соединение с интернетом!') {
  return new Promise((resolve, reject) => {
    https.get('https://www.insales.ru/', (res) => {
      resolve();
    }).on('error', (e) => {
      console.log(errorMessage);
      reject();
    });
  });
}
