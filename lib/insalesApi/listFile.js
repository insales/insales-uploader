'use strict';
import InsalesApi from 'insales';
import upath from 'upath';

/**
 * Получить список файлов на сервере
 */
export default function listFile (options, paths) {
  const InSales = InsalesApi(options.insalesApi);

  return new Promise((resolve, reject) => {
    InSales.listFile({
      token: options.account.token,
      url: options.account.url
    }).then(response => {
      let files = response.data.reduce((prev, curr)=> {
        const name = upath.parse(curr['absolute_url']).base;
        const path = upath.normalize(paths.files + '/' + name);
        const url = curr['absolute_url'];
        return [...prev, {name,path,url}]
      }, []);

      resolve(files);
    }).catch(err => {
      if (err.msg) {
        console.log(err.msg);
      }
      resolve([]);
    });
  })
}
