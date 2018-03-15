import https from 'https';

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
