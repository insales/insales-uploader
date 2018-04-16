import ProgressBar from 'progress';
import filterTask from './filterTask'
import waitInLine from './waitInLine'
import delay from 'delay'

// генератор, помогает перебирать массив
function* gen(list){
  yield* list;
}

/**
 * Вызов следующей задачи
 * @param  {Promise} task     Обработчик. Обязательно тип Promise
 * @param  {Array} list       Массив параметров
 * @param  {Object} Progress  Настройки для модуля progress
 * @return {boolean}          Конец массива или нет
 */
async function iterator(task, list, Progress) {
  const tick = gen(list).next();
  const param = tick.value;

  try {
    const result = await task(param);
  } catch (e) {
    if (e) {
      console.log(e);
    }
  }

  if (Progress) {
    Progress.tick(param);
  }

  return gen(list).next().done;
}


/**
 * запуск задач
 * @param  {object} statusBar
 */
export default function runTasks (statusBar) {
  return new Promise(async (resolve, reject) => {
    const TaskManager = this;
    let goNext = await waitInLine(TaskManager);

    let Progress = null;
    if (statusBar) {
      // удаляем дубли по свойству (TaskManager.filterParam)
      TaskManager.taskList = TaskManager.taskList.filter((el, index, own)=>{
        return filterTask(el, index, own, TaskManager.filterParam)
      });
      Progress = new ProgressBar(statusBar.template, Object.assign({}, progressOptions, {
        total: TaskManager.taskList.length
      }));
    }

    (async function recursive(Progress) {
      if (TaskManager.lock) {
        goNext = await waitInLine(TaskManager);
      }

      // удаляем дубли по свойству (TaskManager.filterParam)
      TaskManager.taskList = TaskManager.taskList.filter((el, index, own)=>{
        return filterTask(el, index, own, TaskManager.filterParam)
      });

      if (TaskManager.taskList.length === 0) {
        return resolve();
      }
      // заблокировать очередь
      TaskManager.lock = true;

      let currentTask = TaskManager.taskList[0];

      // Если работаем с liquid таймаут меньше
      let delayTime = (currentTask.path && currentTask.path.indexOf('.liquid') > -1) ? 50 : TaskManager.options.delay;

      await delay(delayTime);

      // выполнить задачу
      const done = await iterator(currentTask.runner, TaskManager.taskList, Progress);

      // удалить выполненную задачу
      TaskManager.taskList.splice(0, 1);

      // разблокировать очередь
      TaskManager.lock = false;

      // вернуть рекурсию или резолв
      const action = (done && TaskManager.taskList.length === 0) ? resolve : recursive;
      return action(Progress);
    })(Progress)
  });
}

const progressOptions = {
  complete: '█',
  incomplete: '.',
  width: 20,
  clear: true
}
