# Производительно чувствительные вычисления renderer-слоя

Документ описывает участки, где renderer использует крупные derived-данные. Он нужен для планирования безопасных refactor-изменений в форке.

## Home

- `src/core/home/viewModel.ts` собирает модель главного экрана из прогресса, истории, мотивации, игрового состояния и раскладок.
- `src/core/home/historyMetrics.ts` отвечает за срез текущей истории, средние значения, тренды и 14-дневные счётчики.
- Рекомендации остаются чистым bounded-вычислением и могут быть дополнительно декомпозированы при росте Home-модели.

## Stats

- `src/core/stats/viewModel.ts` формирует общую модель статистики.
- `src/core/stats/historyScope.ts` отвечает за flatten history, фильтрацию по раскладке/режиму/периоду, linking rhythm sessions, chart arrays, best entries, trends и worst-key candidates.
- Heatmap и insight sorting остаются потенциальными точками дальнейшей декомпозиции.

## Practice result

- `src/core/practice/viewModel.ts` формирует comparison, mastery deltas, active goals, performance details и primary metrics.
- `src/core/practice/resultHistory.ts` выбирает history entries, best entries и comparison для practice-like режимов и sprint.
- `src/core/practice/modeResultMetrics.ts` формирует primary metrics для sprint, survival и flawless.
- `src/core/practice/modeResultCallouts.ts` формирует result callouts для sprint, survival и flawless.
- `src/core/practice/modeBestResult.ts` формирует подпись лучшего результата для страниц режимов.

## Result primitives

- `src/core/result/metricStrip.ts` формирует renderer-ready модели metric-strip блоков, классы вариантов и progress-details.
- `ResultMetricStrip`, `ResultProgressMetrics` и `MetricStrip` должны сохранять JSX-рендеринг в renderer и не дублировать normalizing/className logic.

## Game result

- `src/core/game/viewModel.ts` собирает модель игрового результата.
- `src/core/game/resultHistory.ts` отвечает за game comparison, ghost comparison и mastery summary.
- `src/core/game/resultMetrics.ts` формирует metric-strip для игрового результата: accuracy threshold, boss timer, rhythm deviation и flawless-limit.
- `src/core/game/resultPresentation.ts` формирует title, summary и action-state карточки результата игры без привязки к JSX.
- `src/core/game/resultRewards.ts` формирует renderer-ready модель boss reward choices: badge metadata, item labels, durability, effects, disabled state и selected-message.
- `GameResultCard` остаётся крупным renderer-компонентом, где совмещены визуальная структура, reward-flow и действия пользователя.

## Navigation

- `src/core/navigation/sidebar.ts` формирует built-in и modded пункты sidebar, применяет disabled sections и разделяет пункты на top/bottom группы.
- `Sidebar` должен только сопоставлять icon keys с визуальными lucide-иконками и рендерить готовую модель.

## Lessons

- `src/core/lessons/viewModel.ts` нормализует прогресс уроков, группирует уроки по секциям, рассчитывает unlock-состояние и навигацию между уроками.
- `LessonsPage` должен применять готовую модель и сохранять новый progress без мутации текущего объекта состояния.

## Achievements

- `src/core/achievements/viewModel.ts` формирует категории, фильтры, счётчики и unlocked-state для общих и игровых модальных окон достижений.
- Renderer-компоненты достижений должны получать готовые items и не дублировать фильтрацию по категориям.

## Проверка изменений

- После helper/selector refactor запускать `npm run diagnostics:quick`.
- После изменений history/comparison/records запускать `npm run diagnostics:history`.
- После renderer-facing type changes запускать `npm run build`.

## Рекомендации для дальнейшего развития

- Не переносить новые history-агрегации в JSX.
- Не расширять renderer hooks бизнес-логикой, если она может быть чистой функцией в `src/core`.
- Добавлять diagnostics для каждого нового helper, который влияет на result-flow, stats-flow или records.
