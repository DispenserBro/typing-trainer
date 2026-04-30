# Дорожная карта

Этот файл описывает технические направления развития `Typing Trainer`. Он предназначен для разработчика, который поддерживает форк проекта и планирует изменения без знания внутренней истории репозитория.

## Принципы приоритизации

- Высший приоритет: стабильность сборки, корректность сохранений, совместимость форматов данных, первый запуск приложения и критические регрессии.
- Высокий приоритет: архитектурное разделение доменной логики и UI, предсказуемость истории, статистики, результата режимов и центра расширений.
- Средний приоритет: улучшение пользовательских сценариев, читаемости интерфейса и сопровождения компонентов.
- Низкий приоритет: долгосрочная полировка, уменьшение технического долга и локальные оптимизации без прямого влияния на стабильность.

## Текущая стабильная база

- Main process, renderer, core-логика и shared-типы собираются через TypeScript и Webpack.
- Центр расширений поддерживает источники, каталог, аддоны, модификации, темы, Markdown-карточки и локальные демонстрационные источники.
- Каталог расширений имеет preflight-контракт для проверки записи перед установкой без побочных эффектов.
- Темы вынесены в отдельный API с обратной совместимостью со старой системой и встроенным редактором.
- Первые экраны и гайды режимов используют отдельное состояние прохождения.
- Установщик и мастер удаления имеют кастомные шаги настройки и удаления пользовательских данных.
- Result-flow использует общий summary-слой, guards для пустых состояний и переиспользуемые view-model helpers.
- Content pipeline режимов использует общий выбор material pack, preview-key, text builder, fallback и focused diagnostics.
- История и статистика имеют выделенные selectors, helper-слои и диагностику.
- Диагностика разделена на быстрые и тематические команды: `core`, `history`, `quick`, `practice`, `content-pipeline`, `extensions`, `i18n`, `game-balance`.

## Высший приоритет

- [ ] Проверить совместимость production-сборок на Windows, Linux и macOS после изменений build-скриптов.
- [ ] Добавить diagnostics для новых perf-sensitive selectors после следующих refactor-итераций result-flow или statistics-flow.
- [ ] Проверить сценарии первого запуска после изменений setup/onboarding: локаль, раскладка, тема, источники расширений.
- [ ] Проверить установку, обновление и удаление пользовательских данных на чистой машине.

## Высокий приоритет

- [x] Вынести Home history metrics из Home view model в core/helper слой.
- [x] Вынести Stats history scope из Stats view model в core/helper слой.
- [x] Вынести Practice result и Game result history/comparison helpers в core/helper слой.
- [x] Упростить dependency list в `useModeResultHistory`, сведя result-history сборку к одному pure helper.
- [x] Добавить diagnostics для Home metrics, Stats history scope и Practice/Game result history helpers.
- [x] Упростить построение summary-карточек статистики через helper с diagnostics.
- [x] Упростить построение drilldown-деталей статистики через session/detail/rhythm builders.
- [x] Вынести mode-focus snapshots в отдельный helper.
- [x] Разделить raw history и UI-ready данные для Home mode-focus detail cards.
- [x] Разделить raw history и UI-ready данные для Home personal record detail cards.
- [x] Разделить raw comparison benchmarks и UI-ready метрики для ResultComparisonPanel.
- [x] Разделить raw history и UI-ready best-result labels для mode pages.
- [x] Разделить raw practice result state и UI-ready primary metrics для PracticeResultFlow.
- [x] Разделить raw sprint/challenge result state и UI-ready primary metrics для mode result flows.
- [x] Вынести UI-ready sprint/challenge result callouts из renderer hooks в core-helper.
- [x] Добавить unit-level проверки для Stats summary cards.
- [x] Добавить unit-level проверки для Stats session/drilldown view-model.
- [x] Добавить unit-level проверки для mode-focus summary.
- [x] Добавить unit-level проверки для Home mode-focus detail cards.
- [x] Добавить unit-level проверки для Home personal record detail cards.
- [x] Добавить unit-level проверки для Result comparison metric items.
- [x] Добавить unit-level проверки для progress-нормализации и weekly motivation recommendations.
- [x] Добавить unit-level проверки для records edge cases и оставшихся рекомендаций.
- [x] Закрыть регрессионными сценариями режимы `practice`, `sprint`, `survival` и `flawless`.
- [ ] Продолжить перенос сложных вычислений из renderer-компонентов в `src/core`.
- [ ] Продолжить снижать риск регрессий в рекордах, фильтрации по режимам и comparison-flow.
- [x] Подготовить стабильные контракты для расширений, чтобы сторонние источники могли проверяться до установки.
- [x] Документировать публичный preflight-контракт каталога расширений для авторов сторонних источников.
- [x] Добавить отдельные diagnostics для граничных случаев preflight: отключённый источник, stale cache, manual-only и отсутствующий manifest.
- [x] Вынести модель прогресса, секций и навигации уроков из `LessonsPage` в `src/core/lessons`.
- [x] Добавить diagnostics для lesson view-model и completion events.
- [x] Вынести фильтрацию, категории и unlocked-счётчики достижений из renderer-модалок в `src/core/achievements`.
- [x] Добавить diagnostics для achievement modal view-model.
- [x] Вынести модель sidebar-навигации, disabled sections и группировку mod-mode пунктов из renderer в `src/core/navigation`.
- [x] Добавить diagnostics для sidebar view-model и active-state `survival`/`flawless`.
- [x] Вынести renderer-ready модель `ResultMetricStrip` и `ResultProgressMetrics` в core/helper без изменения визуального API компонентов.
- [x] Добавить diagnostics для metric-strip edge cases: пустые значения, tone, progress percent и порядок метрик.

## Средний приоритет

- [ ] Упростить заголовки экранов и сделать их терминологически последовательными.
- [ ] Пересобрать компактные metric-strip блоки так, чтобы они одинаково использовали core view-model.
- [x] Вынести построение `gameResultMetrics` из `GameResultCard` в `src/core/game` и переиспользовать общий metric-strip contract.
- [x] Добавить diagnostics для game result metric-strip: boss timer, rhythm deviation, flawless limit и accuracy threshold.
- [x] Вынести построение title/summary/action-state `GameResultCard` в core view-model без изменения reward-flow.
- [x] Добавить diagnostics для game result title/summary веток: victory, boss passed, map selection, timeout, hp lost и game over.
- [x] Вынести renderer-ready модель reward-choice блока `GameResultCard` в core/helper, оставив обработчики выбора в renderer.
- [x] Добавить diagnostics для reward-choice view-model: item reward, letter reward, event reward, disabled choice и selectedRewardMessage.
- [ ] Вынести условия показа secondary-блоков `GameResultCard` в core/helper: motivation progress, comparison, mastery и reward block.
- [ ] Добавить diagnostics для secondary-блоков game result: terminal motivation, comparison presence, mastery presence и boss reward visibility.
- [ ] Подчистить состояния `disabled`, `loading` и `empty` для интерактивных панелей.
- [ ] Улучшить подачу переключений режимов и быстрых действий без изменения сохранённых данных.
- [ ] Сократить импорты из слишком широких barrel-like точек, если они скрывают реальные зависимости.
- [ ] Документировать формат источников расширений, аддонов, модификаций и тем.

## Низкий приоритет

- [ ] Свести пересекающиеся интерфейсы типов к более устойчивой доменной модели.
- [ ] Упростить путь данных от `progress` до конкретных экранов.
- [ ] Проверить создание новых массивов и объектов на каждом render за пределами известных hot paths.
- [ ] Убрать эффекты, которые срабатывают из-за слишком широких dependency lists.
- [ ] Проверить дорогое вычисление текста, статистики, summary и рекомендаций без кэширования по реальным ключам.
- [ ] Найти крупные компоненты, которые можно безопасно разделить на контейнеры и презентационные части.

## Критерии готовности изменений

- Для любого TypeScript-изменения должен проходить `npm run build`.
- Для изменений core/helper/view-model слоёв должен проходить `npm run diagnostics:quick`.
- Для изменений генерации текста должен дополнительно проходить `npm run diagnostics:content-pipeline`.
- Для изменений истории, статистики и result-flow должен дополнительно проходить `npm run diagnostics:history`.
- Для изменений центра расширений должен дополнительно проходить `npm run diagnostics:extensions`.
- Для изменений локализации должен дополнительно проходить `npm run diagnostics:i18n`.
- Для изменений игрового баланса должен дополнительно проходить `npm run diagnostics:game-balance`.
