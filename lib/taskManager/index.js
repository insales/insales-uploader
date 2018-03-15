'use strict';
import startTasks from './runTasks';
import waitInLine from './waitInLine';

class TaskManager {
  constructor(options = {}){
    this.statusBar = null;
    this.tasks = {};
    this.tempTaskList = [];
    this.taskList = [];
    this.waitInLine = waitInLine;
  }

  /**
   * Создать задачу
   * @param  {string} name имя задачи
   * @param  {Promise} task обработчик задачи
   * @param  {string} filterParam Удалять задачи c задвоенным значением параметра?
   * TaskManager.create('test', function (param) {
      return new Promise(function(resolve, reject) {
         console.log(param.path, param.content);
         resolve();
       });
     })
   */
  create(name, task, filterParam = false){
    this.filterParam = filterParam
    return this.tasks[name] = task;
  }

  createTask(name, task, filterParam = false){
    this.filterParam = filterParam
    return this.tasks[name] = task;
  }

 /**
  * Запустить задачу
  * @param  {string} name Имя задачи
  * @param  {array} list Массив параметров
  * TaskManager.run('console', [
      {
        path: './file.js',
        content: 'var a = 0;',
      },
      {
        path: './file2.js',
        content: 'var a = 1;',
      }
    ]
  */

  // statusBar: {
  //   template: 'Downloading: :name [:bar] :percent'
  // }
  run(name, list, statusBar = null) {
    // если есть статусбар, поумолчанию null
    this.statusBar = statusBar;

    // добавить ссылку на обработчик
    list.forEach((currentValue, index, array) => {
      currentValue.runner = this.tasks[name];
    });

    // временное хранилище;
    this.tempTaskList = this.tempTaskList.concat(list);
    return new Promise((resolve, reject) => {
      waitInLine(this).then(()=>{
        // основное хранилище
        this.taskList = this.taskList.concat(this.tempTaskList);
        // очистить временное хранилище
        this.tempTaskList = [];
        // запустить очередь задач
        return startTasks.apply(this, [this.statusBar]);
      })
      .then(()=>{
        resolve()
      });
    });
  }
}

export default options => new TaskManager(options);
