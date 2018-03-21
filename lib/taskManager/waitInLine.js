/**
 * Ждать пока освободится очередь с таймаутом ожидания
 */
export default function waitInLine(TaskManager) {
  const maxWait = 100000;
  let timer = 0;
  return new Promise((resolve, reject) => {
    waitInner (resolve)
  });

  function waitInner (resolve) {
    if (!TaskManager.lock || maxWait === timer) {
      resolve()
    }else{
      setTimeout(() => {
        timer += 1000;
        return waitInner(resolve)
      }, 300)
    }
  }
}
