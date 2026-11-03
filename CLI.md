# CLI 2.0 (в разработке)

Новая архитектура входит в ещё не выпущенную версию `2.0.0`. Публикация v2 отложена до выхода новых API InSales.

Запуск без аргументов показывает справку. Новый CLI не требует локального проекта для чтения ресурсов магазина. Программный API пакета сохраняется.

```sh
uploader init
uploader config validate
uploader theme list --json
uploader asset list --theme 42
uploader sync pull --theme 42
uploader sync status
uploader sync diff
uploader sync push --dry-run
uploader sync push --only "widget_types/banner/**"
uploader sync watch
```

## Настройки

Поддерживаются `insales-config.json`, `.js`, `.cjs`, `.mjs`. Несколько файлов в одном каталоге требуют явного `--config`.

```json
{
  "account": {"id": "API_KEY", "tokenEnv": "INSALES_TOKEN", "url": "example.myinsales.ru"},
  "theme": {"root": ".", "assetsSync": false},
  "defaultProfile": "demo",
  "profiles": {
    "demo": {"theme": {"id": 42}},
    "production": {"theme": {"id": 43}}
  }
}
```

`--profile` выбирает профиль, `--theme` переопределяет тему. Приоритет: CLI, профиль, общие настройки, значения по умолчанию. Корень темы разрешается от конфига. `--cwd` задаёт каталог поиска. `tokenEnv` содержит имя переменной окружения; `token` можно задать напрямую.

## Команды

```text
config validate
theme list|get|update|publish|delete
asset list|get|create|update|rename|delete
widget-type list|get|create|update|delete
file list|get|upload|download|delete
sync status|diff|push|pull|watch|history|resume|restore
api <METHOD> <PATH>
```

`asset create/update` и `widget-type create/update` принимают документированное JSON-тело через `--input file.json` или `--input -` (stdin). `asset get ID --raw --output file` сохраняет исходные байты. `theme update ID --title TITLE --description TEXT` обновляет метаданные, `asset rename ID --new-name NAME` переименовывает ассет. `file upload PATH...` загружает файлы. `file download ID --output PATH` либо `file download --all --output DIR` скачивает их. Выходные файлы не перезаписываются.

```sh
uploader api GET /admin/themes.json --json
uploader api PUT /admin/themes/42.json --input change.json --json
```

`api` принимает только относительный путь внутри `/admin/`, не дописывает `.json` и не интерпретирует бизнес-результат неизвестных ресурсов. Записи автоматически не повторяются при неизвестном результате.

## Синхронизация

Неизменённое содержимое пропускается, mtime при скачивании сохраняется. Первый запуск с разными существующими версиями даёт конфликт. После успешной синхронизации сравниваются локальная, серверная и базовая версии. Изменения только на принимающей стороне сохраняются. `--conflict source` явно выбирает источник: локальную тему при push, сервер при pull.

Удаления выключены; `--delete` разрешает их в выбранной области. Без базовой версии требуется также `--conflict source`. Повторяемые `--only` и `--ignore` применяются к путям относительно корня темы на обеих сторонах. `theme.excludeFiles` задаёт общие исключения. `--dry-run` не меняет сервер, проект и базовое состояние.

Журналы и резервные данные находятся в `.uploader/`. Добавьте каталог в `.gitignore`: он содержит исходники темы и историю. `sync history` возвращает ID, `sync resume ID` продолжает операцию после сверки состояния, `sync restore ID --yes` строит обратный план. Восстановление не атомарно. После аварийного завершения проверьте отсутствие работающего процесса перед ручным удалением `lock` соответствующего назначения.

`assetsSync: true` включает локальные копии `media` в раскладке `assets`. Разные изменения обеих копий дают конфликт. Watch не скачивает тему при запуске; конфликтные пути приостанавливаются.

## Вывод

`--json` возвращает `{ok,data,meta}` или `{ok:false,error}`; watch выдаёт JSON Lines. Для бинарного результата используйте обычный вывод либо `--output`. Диагностика идёт в stderr. Коды: 0 — успех, 1 — ошибка выполнения, 2 — аргументы/конфигурация, 3 — конфликт, 130 — отмена. Прямое удаление, публикация и восстановление в неинтерактивном режиме требуют `--yes`.

## Изменение предыдущего интерфейса CLI

| Предыдущие команды | Команды 2.0 |
| --- | --- |
| запуск без команды | справка |
| download | sync pull |
| upload | sync push |
| stream | sync watch |
| start | sync pull, затем sync watch |
| pull с удалением каталогов | sync pull --delete с пофайловым планом |
| listThemes | theme list |
| downloadFiles | file download --all --output DIR |
| uploadFiles | file upload PATH... |
| backup | sync history/restore для операций; библиотечный backup() для локального ZIP |

CLI регистрирует модули команд явно, ресурсы инкапсулируют маршруты и особенности API, синхронизация строит план по снимкам. Внутренние модули не являются публичным SDK.

Структура исходников:

```text
lib/cli/             дерево Commander, контекст запуска и обработка ошибок
  commands/          регистрация команд и преобразование аргументов
  io/                stdin, подтверждения, форматирование результатов
lib/configuration/   загрузка конфигурации и профилей
lib/http/            HTTP, авторизация, лимиты и отмена
lib/resources/       каталог ресурсов, маршруты и валидация каждого типа
lib/operations/      операции с ресурсами и файлами без консольного вывода
lib/sync/            сравнение, планирование и выполнение синхронизации
  local.ts           чтение локальной темы и зеркала media/assets
  remote.ts          чтение и запись серверной темы
  store.ts           базовое состояние и чтение журнала
  storage.ts         атомарная запись файлов
  planner.ts         чистая функция построения плана
  service.ts         последовательность проверок и выполнения операций
  recovery.ts        продолжение и восстановление
  watch.ts           наблюдение с событиями для вызывающей стороны
```

Зависимости направлены от CLI к операциям и сервисам. Сервисы не импортируют Commander и не печатают в консоль; команды не импортируют сборщик программы. Эти границы закреплены ESLint. Для нового ресурса добавляются описание и валидация в `resources`, затем запись в `catalog.ts`; корень CLI читает каталог без отдельного списка имён.
