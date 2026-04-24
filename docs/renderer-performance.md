# Renderer Performance Rules

Короткие внутренние правила для экранов и контекстов `Typing Trainer`.

## 1. Не класть hot runtime state в широкий AppContext

- Часто меняющееся состояние вроде `activeChar`, preview-flags, live typing indicators и transient UI-flags должно жить в более узком контексте или локальном hook-state.
- Если значение обновляется на каждом вводе, оно не должно тянуть за собой `Home`, `Stats`, `Settings` и прочие тяжёлые панели.

## 2. Derived-данные собирать вне JSX

- Большие summary, recommendation, record-карточки и history-агрегации должны строиться в helper/selectors.
- Внутри страницы оставлять только wiring и рендер, а не многопроходные `filter/reduce/sort` по history на каждом проходе.

## 3. Progress-updates делать через общий commit-path

- Обновления `progress` должны идти через общий helper, который:
  - умеет возвращать `prev` для no-op,
  - синхронизирует `progressRef`,
  - делает один persist-path на апдейт.
- Нельзя плодить десятки локальных `setProgress(... window.api.saveProgress(...))` с разной семантикой.

## 4. Не мутировать вложенные структуры из prev-state

- Для `history`, `keyStats`, `practiceInsights`, `practiceRhythmHistory` и подобных веток использовать явные immutable-копии нужного поддерева.
- Если меняется только один layout slice, не пересобирать всё дерево без необходимости, но и не мутировать исходный `prev`.

## 5. Редкие данные и write-hot данные держать раздельно

- Layout metadata, addon catalogs, theme catalogs и словари — это read-mostly слой.
- Session/runtime, preview-state и live indicators — это write-hot слой.
- При проектировании нового экрана сначала определить, к какому слою относится каждое состояние.

## 6. Сначала no-op guard, потом state update

- Если значение не меняется, callback должен выйти до `setState` и до `saveProgress`.
- Это особенно важно для `settings`, `practiceSettings`, profile-patches и прочих часто вызываемых setters.

## 7. Build next package on reusable selectors

- Если один и тот же экран собирает view-model из `progress` более одного раза, это кандидат на selector/helper.
- Следующий шаг после локальной оптимизации — переносить такие вычисления в более узкие доменные слои, а не дублировать по страницам.
