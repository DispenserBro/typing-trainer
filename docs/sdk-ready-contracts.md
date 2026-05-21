# SDK-ready контракты расширений и модов

Этот документ фиксирует SDK-ready основу для публичного git-репозитория SDK без npm-публикации. На уровне workspace рядом с приложением есть пакет `SDK`; он должен собираться автономно, не импортировать исходники или `dist` приложения и совпадать с runtime-контрактами приложения.

## Что считается стабильной внутренней основой

- Manifest-версии и manifest-типы аддонов, модификаций, тем и источников расширений лежат в `src/shared/types`.
- Пакет `SDK` содержит автономные public-контракты для авторов расширений и не импортирует исходники или `dist` приложения. Совместимость с app shared-слоем удерживается диагностикой и синхронизацией контрактов.
- Закрытые списки source type, catalog kind, catalog status, install support, issue stage/severity/fallback, sync status и duplicate recommendation reason экспортируются из shared-слоя.
- UI и preflight используют общие helper-функции доступности установки: `canInstallExtensionCatalogEntry`, `getExtensionCatalogEntryBlockReason`, `hasExtensionCatalogAttention`.
- Mod API permissions описаны через `MOD_PERMISSIONS`, `isModPermission` и `normalizeModPermissions`.
- Runtime validators Mod API находятся в shared-слое и применяются перед мутацией `ModAPIState`.
- Permission `i18n` защищает оба пути изменения переводов: вызовы `api.i18n.registerLocale(s)` и declarative locale resources из `locales/` или `i18n/` в пакете мода.
- SDK library helpers собирают installable source layout (`manifest.json`, package lists, `<entry>/manifest.json`, `manifest.files`) так, чтобы пакет можно было добавить в библиотеку источника без ручной правки ссылок. Для Node build-скриптов есть helper, который сам записывает файлы в библиотеку и обновляет нужный список.
- Root entrypoint `@typing-trainer/sdk` не экспортирует Node-only helpers; запись файлов доступна только через `@typing-trainer/sdk/node`.

## Runtime-контракт Mod API

Каждая мутация Mod API сначала проходит permission gate. Если permission отсутствует, состояние мода не меняется.

Payload-валидация покрывает:

- settings overrides - принимаются только известные ключи `UserSettings` через `isModUserSettingKey` и значения ожидаемого типа через `isModUserSettingValue`;
- item definitions - проверяются обязательные поля, закрытые значения rarity/slot/reward/effect и форма durability rules;
- achievement definitions - проверяются обязательные поля и условия с непустым `type`;
- rules - принимаются только известные rule id и значения ожидаемого типа;
- events - принимаются только известные event names и function handlers;
- words - принимаются только непустые строки с нормализацией дублей;
- lessons - принимаются только уроки с непустыми `id`, `name` и массивом строк `keys`;
- UI panels - принимаются только поддерживаемые locations;
- custom modes - принимаются только поддерживаемые группы;
- i18n locales - принимаются только locale definitions с непустыми `id`, `label`, `nativeLabel` и словарём переводов.

Некорректный payload игнорируется с warning в консоль и не попадает в итоговое состояние эффектов мода.

## Границы публичности

- npm-публикация не входит в текущий этап.
- Поддерживаемый публичный формат - отдельный git-репозиторий SDK с тегами релизов.
- Версия `0.x` считается pre-1.0: breaking changes допускаются между minor-версиями и должны сопровождаться release notes.
- Генератор шаблонов, CLI scaffolder и официальный marketplace-пакет не входят в текущую задачу.
- Sandbox contract модов остаётся внутренним runtime-контрактом приложения.

## Диагностический gate

После изменений в контрактах расширений, модов, тем или Mod API запускать:

```bash
npm run diagnostics:quick
npm run diagnostics:extensions
npm run diagnostics:i18n
npm run build
cd ../SDK
npm ci
npm run smoke
npm pack --dry-run
```

`diagnostics:quick` проверяет shared validators, permission gating, runtime payload validation и declarative locale resource gate для модов. `diagnostics:extensions` проверяет source/catalog/preflight/install контракты. `diagnostics:i18n` нужен при изменении locale payloads или переводов. `npm run build` подтверждает TypeScript и production-сборку приложения. `SDK` gate подтверждает lockfile-установку, автономную сборку, CJS/ESM imports, разделение root/node entrypoints и состав пакета для будущего публичного git-репозитория.

Release-hardening workflow запускает этот SDK gate автоматически через `npm run diagnostics:release-hardening`. В CI путь к SDK задаётся переменной окружения `TYPING_TRAINER_SDK_DIR`; для GitHub Actions используется checkout в каталог `SDK`.
