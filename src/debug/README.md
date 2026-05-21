# Диагностические инструменты

Каталог `src/debug` содержит CLI-инструменты для проверки доменной логики без запуска Electron. Эти сценарии полезны при разработке форка, регрессионной проверке и подготовке релиза.

## Назначение

Диагностики проверяют:

- корректность базовых сервисов ядра;
- запись, чтение и миграции истории тренировок;
- генерацию упражнений и контентный pipeline;
- локализацию и полноту переводов;
- баланс игровых режимов;
- измеримые performance budgets для горячих history/result-сценариев;
- источники дополнений и установку контента из каталогов.

Инструменты не заменяют автоматические тесты. Их задача - быстро подтвердить, что ключевые пользовательские сценарии остаются работоспособными после изменений.

## Команды

Все команды запускаются из корня репозитория.

```powershell
npm run diagnostics:quick
```

Запускает быстрый набор проверок: `diagnostics:core` и `diagnostics:history`.

```powershell
npm run diagnostics:core
```

Проверяет основные сервисы ядра, настройки и базовые операции с данными.

```powershell
npm run diagnostics:history
```

Проверяет запись результатов, чтение истории и агрегированную статистику.

```powershell
npm run diagnostics:practice
```

Проверяет генерацию тренировок, выбор контента и переходы между состояниями практики.

```powershell
npm run diagnostics:content-pipeline
```

Запускает сфокусированную проверку pipeline подготовки контента.

```powershell
npm run diagnostics:game-balance
```

Проверяет баланс параметров игровых режимов и устойчивость расчётов.

```powershell
npm run diagnostics:i18n
```

Проверяет доступность встроенных локалей и наличие обязательных ключей перевода.

```powershell
npm run diagnostics:extensions
```

Проверяет источники дополнений, разбор manifest-файлов, подготовку списков контента и install/remove цикл addon/mod/theme во временных пользовательских данных.

```powershell
npm run diagnostics:perf-budget
```

Проверяет горячие renderer/core-сценарии на больших историях и падает, если они превышают зафиксированные лимиты времени. Сейчас gate измеряет:

- `statsHistoryScope` - до 1000 мс на 2000 history/rhythm строк;
- `recordsComparison` - до 1800 мс на сравнения practice/sprint/game поверх 50 000 history строк;
- `resultHistoryEmpty` - до 1200 мс на empty-result модели поверх 50 000 history строк.

```powershell
npm run diagnostics:packaging
```

Проверяет routing packaging-сценариев для Windows, Linux и macOS в безопасном `--dry-run` режиме: команда печатает production build-команду, target-ы electron-builder и каталог вывода, но не собирает инсталляторы. Перед печатью команд дополнительно проверяются ключевые release-ресурсы: NSIS include, иконки, npm scripts для platform build/diagnostics routing, явные electron-builder target-ы `nsis`, `AppImage`, `deb`, `rpm`, `dmg` и `zip`, встроенные данные первого запуска, локальные источники расширений, сценарии сохранения/удаления пользовательских данных в установщике, platform-smoke matrix GitHub Actions для Windows, Linux и macOS, обязательные release-hardening/SDK gates и запрет публикации неполного release-набора.

Clean first-run блок этой диагностики проверяет installer contract без запуска GUI-инсталлятора: страница первого запуска должна пропускаться при существующем `progress.json`, запись `setup-preferences.json` должна начинаться только после этой проверки и закрываться до выхода из install-макроса, дефолтные локаль/язык/раскладка должны существовать в `data/layouts.json`, варианты раскладок и тем должны быть обработаны NSIS-скриптом и совпадать с renderer defaults/CSS-темами, стартовые source preset-ы должны ссылаться только на реально поставляемые manifest-файлы в `data/local-extension-sources`, а JSON-модель `setup-preferences.json` должна оставаться валидной для preset-ов `tech`, `hardcore`, `all` и `none`.

Uninstall/update блок проверяет порядок операций с пользовательскими данными в NSIS-скрипте: удаление данных доступно только после явного opt-in, обычный uninstall сначала переносит `$INSTDIR\data` во временный каталог, затем удаляет файлы приложения и после этого возвращает данные обратно в каталог установки.

```powershell
npm run diagnostics:release-hardening
```

Запускает локальный release-hardening набор: production build, сборку debug-инструментов, core/practice/content-pipeline/game-balance/history/i18n/extensions/perf-budget diagnostics, Electron platform smoke, release-coverage gate, packaging dry-run и SDK gate (`npm ci`, `npm run smoke`, `npm pack --dry-run`). По умолчанию SDK ищется в `..\SDK`; для CI или нестандартной раскладки задайте `TYPING_TRAINER_SDK_DIR`.

GitHub Actions дополняет локальный gate платформенной проверкой Windows/Linux/macOS: приложение запускается через `diagnostics:platform-smoke` и проверяет запись в writable data path. Для tag-release Windows требует `WINDOWS_CSC_LINK` и `WINDOWS_CSC_KEY_PASSWORD`, а после сборки проверяет Authenticode-подписи `.exe`. Для SDK gate в настройках репозитория нужна variable `SDK_REPOSITORY`.

macOS release-артефакты сейчас исключены из публикации до появления signing/notarization gate. Workflow продолжает выполнять macOS platform-smoke без физических устройств и проверяет unsigned packaging contract (`identity: null`), но tag-release публикует только обязательный Windows/Linux набор и падает, если любой из этих артефактов отсутствует.

## SDK-ready foundation

Для изменений в контрактах расширений, модификаций, тем и Mod API использовать полный gate:

```powershell
npm run diagnostics:quick
npm run diagnostics:extensions
npm run diagnostics:i18n
npm run build
cd ..\SDK
npm ci
npm run smoke
npm pack --dry-run
```

`diagnostics:quick` содержит проверки shared Mod API validators, permission gating, runtime payload validation и declarative locale resource gate для модов. `diagnostics:extensions` проверяет источники расширений, manifest-контракты, preflight и install/remove цикл. `diagnostics:i18n` дополнительно подтверждает, что изменения locale payloads не ломают встроенные локали.

Локальный пакет `SDK` лежит на уровень выше каталога приложения и собирается отдельно:

```powershell
cd ..\SDK
npm run smoke
```

SDK не импортирует исходники или `dist` приложения; диагностики приложения проверяют совместимость runtime-контрактов, а smoke gate SDK проверяет автономную сборку, CJS/ESM imports, root entrypoint без Node-only helper и отдельный `@typing-trainer/sdk/node`.

Для контента, созданного через `@typing-trainer/sdk/library`, дополнительно важно запускать `assertInstallableExtensionSourcePackage` на стороне build-инструмента автора: helper проверяет source layout, package lists, manifests, `manifest.files` и отсутствие runtime-импортов SDK в entry-файле мода. Для простого переноса одного мода или аддона в библиотеку SDK даёт `writeLibraryEntry` в `@typing-trainer/sdk/node`.

## Сборка

Диагностические команды автоматически запускают сборку debug-инструментов через:

```powershell
npm run build:debug-tools
```

Результат сборки помещается в `dist-debug`. Этот каталог является производным артефактом и не должен использоваться как исходник.

## JSON-вывод

Часть инструментов поддерживает машинно-читаемый вывод. Он удобен для CI и внешних скриптов.

```powershell
npm run diagnostics:practice -- --json
```

```powershell
npm run diagnostics:game-balance -- --json
```

Формат вывода должен оставаться стабильным внутри одной минорной версии приложения. При изменении структуры результата обновляйте документацию и потребителей этого вывода.

## Аргументы practice-диагностики

`runPracticeDiagnostics` поддерживает дополнительные параметры:

- `--json` - вывод результата в JSON;
- `--focused-pipeline` - проверка только pipeline подготовки контента;
- `--seed <value>` - фиксирует seed для воспроизводимого сценария;
- `--layout <id>` - ограничивает проверку выбранной раскладкой;
- `--mode <id>` - ограничивает проверку выбранным режимом.

Если параметр не задан, используется стандартный набор сценариев.

## Аргументы game-balance-диагностики

`runGameBalanceDiagnostics` поддерживает:

- `--json` - вывод результата в JSON;
- `--mode <id>` - проверка конкретного игрового режима;
- `--iterations <count>` - количество симуляций;
- `--seed <value>` - фиксирует seed для повторяемых расчётов.

Большое количество итераций увеличивает время выполнения, но помогает выявить нестабильные параметры баланса.

## Добавление новой диагностики

При добавлении нового инструмента придерживайтесь общей схемы:

1. Разместите исходный файл в `src/debug`.
2. Используйте доменные сервисы из `src/core` и общие типы из `src/shared`.
3. Не подключайте Electron API и renderer-код.
4. Добавьте команду в `package.json`, если инструмент должен запускаться вручную.
5. Документируйте назначение, аргументы и ожидаемый результат в этом файле.
6. Сохраняйте ненулевой exit code для критических ошибок.

Диагностика должна быть детерминированной. Если сценарий использует случайность, у него должен быть параметр `--seed`.

## Ограничения

- Инструменты рассчитаны на локальный запуск разработчиком или CI.
- Проверки работают с текущим состоянием рабочей копии и локальными файлами проекта.
- Диагностики не должны изменять пользовательские данные без явного временного каталога или mock-хранилища.
- Ошибки должны выводиться в консоль с достаточным контекстом для воспроизведения.
