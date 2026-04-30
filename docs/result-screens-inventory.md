# Структура экранов результата

Документ фиксирует текущую структуру result-flow. Он нужен разработчику форка для безопасного изменения экранов результата без нарушения истории, comparison, mastery и действий пользователя.

## Экраны

- Результат практики отображается через `PracticeResultFlow`.
- Результат спринта отображается через `SprintResultFlow` и общий `ModeResultLayout`.
- Результаты survival и flawless отображаются через `ChallengeResultFlow` и общий `ModeResultLayout`.
- Результат игрового режима отображается через `GameResultCard`.

## Общие компоненты

- `ResultCardLayout` задаёт базовую структуру карточки результата: заголовок, крупный показатель, summary и контент.
- `ResultSummaryPanel` собирает верхний стек результата: primary metrics, мотивационный прогресс, comparison и mode-specific children.
- `ModeResultLayout` унифицирует sprint, survival и flawless.
- `ResultMetricStrip` отображает primary metrics.
- `ResultMotivationProgressMetrics` отображает цели и серии.
- `ResultComparisonPanel` отображает сравнение с предыдущими и лучшими результатами.
- `LayoutMasteryPanel` используется в результатах практики и игрового режима.

## Core view-model helpers

- `src/core/practice/viewModel.ts` формирует view-model результата практики, primary metrics, comparison, mastery и мотивационные блоки.
- `src/core/practice/resultHistory.ts` выбирает историю и comparison для practice-like режимов и sprint.
- `src/core/practice/modeResultMetrics.ts` формирует primary metrics для sprint, survival и flawless.
- `src/core/practice/modeResultCallouts.ts` формирует callout-сообщения для sprint, survival и flawless.
- `src/core/practice/modeBestResult.ts` формирует подпись лучшего результата для mode pages.
- `src/core/game/resultHistory.ts` формирует comparison, ghost comparison и mastery для игрового результата.
- `src/core/motivation/resultComparisonViewModel.ts` преобразует raw comparison benchmarks в UI-ready metric items.

## Намеренные различия режимов

- Практика содержит rhythm-specific метрики, mastery, карточку обратной связи и сценарий продолжения вводом.
- Спринт содержит summary материала, длительность, follow-up рекомендации и retry.
- Survival и flawless используют pass/fail-заголовки, lives/errors и разные zero-error формулировки.
- Игровой режим содержит награды, поломку предметов, карту, события, боссов и daily terminal действия.

## Проверки при изменениях

- После изменений shared result-flow запускать `npm run diagnostics:quick`.
- После изменений comparison, records или history selection запускать `npm run diagnostics:history`.
- После renderer-facing type changes запускать `npm run build`.
- После изменения пользовательского сценария результата выполнять ручную проверку из `docs/result-screens-smoke-checklist.md`.

## Риски

- Пустая история не должна создавать ложные comparison-блоки.
- Рекомендации могут отсутствовать и должны корректно скрываться.
- Survival и flawless не должны смешиваться в history/comparison.
- Game reward state не должен терять выбранное действие после изменений shared result primitives.
