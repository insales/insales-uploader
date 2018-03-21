import change from './change';
import remove from './remove';

/**
 * Удалить или изменить ассет при методе upload
 */
export default function upload(asset) {
  const instance = this;
  let action = (asset.uploadType === 'remove') ? remove.bind(instance) : change.bind(instance);

  return new Promise((resolve, reject) => {
    action(asset, false).then((res)=>{
      resolve(res);
    })
  });
}
