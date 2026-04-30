# Поток данных истории

Документ описывает producers и consumers persisted history. Он нужен для изменений формата истории, result-flow, статистики и рекордов.

## Persisted-формат

История хранится по раскладкам в `progress.history`.

Ключ верхнего уровня - идентификатор раскладки. Значение - массив `HistoryEntry`.

Важно: текущие selectors учитывают legacy-формат и не переписывают сохранённые записи.

- Sprint хранится как `mode: "test"` и `contentScenarioId: "sprint"`.
- Survival хранится как `mode: "practice"` и `contentScenarioId: "survival"`.
- Flawless хранится как `mode: "practice"` и `contentScenarioId: "flawless"`.

## Producers

- `PracticePage` записывает practice entries с `contentScenarioId`, `trainingMode`, `contentMode`, длительностью и `charStats`.
- `TestPage` записывает sprint entries как `mode: "test"` с `contentScenarioId: "sprint"`, `contentMode`, длительностью и `charStats`.
- `ChallengeModePage` записывает survival/flawless entries как `mode: "practice"` с соответствующим `contentScenarioId`, pass/fail-флагами и `charStats`.
- `GamePage` записывает game entries с уровнем, типом стадии, pass/fail и victory metadata.
- `LessonsPage` записывает lesson entries с `charStats`.

## Consumers

- Home использует историю для last/best sessions, mode focus, replay actions, records и follow-up recommendations.
- Practice result использует историю для comparison, mastery deltas и performance deltas.
- Sprint, survival и flawless используют историю через `useModeResultHistory` и `src/core/practice/resultHistory.ts`.
- Game result использует историю для game comparison и mastery deltas.
- Stats использует историю всех раскладок, фильтры периода/режима/раскладки и связь с rhythm sessions.
- Records helpers строят personal records, result comparisons, mode focus snapshots и описания рекордов.

## Shared selectors

`src/core/history/selectors.ts` - общий слой классификации persisted entries.

Основные функции:

- `isPracticeHistoryEntry`;
- `isSprintHistoryEntry`;
- `isSurvivalHistoryEntry`;
- `isFlawlessHistoryEntry`;
- `isChallengeHistoryEntry`;
- `isBasePracticeHistoryEntry`;
- `getHistoryModeBucket`;
- `matchesHistoryModeBucket`;
- `matchesPracticeScenario`.

## Правила изменения истории

- Не менять persisted-формат без обратной совместимости.
- Новые режимы должны получать явную классификацию в `src/core/history/selectors.ts`.
- Новые consumers не должны самостоятельно проверять legacy-комбинации `mode` и `contentScenarioId`; для этого нужно использовать selectors.
- После изменений запускать `npm run diagnostics:history` и `npm run diagnostics:quick`.
