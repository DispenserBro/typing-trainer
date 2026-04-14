/**
 * Пример скрипта мода (index.js).
 *
 * СТРУКТУРА ПАПКИ МОДА:
 *   hardcore-mode/
 *     manifest.json   ← описание мода (id, name, entry, permissions)
 *     index.js        ← точка входа (этот файл)
 *
 * УСТАНОВКА:
 *   Страница «Аддоны и модификации» → вкладка «Модификации» →
 *   «Установить мод…» → выбрать manifest.json из папки мода.
 *   Приложение скопирует всю папку автоматически.
 *
 * ВЫПОЛНЕНИЕ:
 *   Скрипт запускается при загрузке приложения, если мод включён.
 *   Функция получает объект api с доступом к API приложения.
 *
 * ДОСТУПНЫЕ SUB-API (требуют соответствующих permissions в manifest.json):
 *   api.sections     — включать/отключать разделы сайдбара       [permission: "sections"]
 *   api.settings     — переопределять пользовательские настройки  [permission: "settings"]
 *   api.items        — добавлять/удалять/заменять предметы         [permission: "items"]
 *   api.achievements — добавлять/удалять/заменять достижения       [permission: "achievements"]
 *   api.rules        — устанавливать декларативные правила         [permission: "rules"]
 *   api.events       — подписываться на события приложения         [permission: "events"]
 *   api.words        — добавлять/удалять слова из пула             [permission: "words"]
 *   api.lessons      — добавлять/удалять/заменять уроки            [permission: "lessons"]
 *   api.ui           — инъекция CSS, пользовательские панели       [permission: "ui"]
 *   api.modes        — регистрация новых режимов/страниц           [permission: "modes"]
 *   api.log          — логирование (info/warn/error)               [всегда доступен]
 */
module.exports = function (api) {
  api.log.info('Hardcore Mode loaded');

  // ── Items: заменить «Линзу безошибочности» усиленной версией ──
  // Оригинал: focus-lens (-2% к точности, rarity 1)
  // Замена:   точность -4%, rarity 2 — сложнее получить, но ощутимее
  api.items.replace('focus-lens', {
    id: 'focus-lens',
    name: 'Линза отчаяния',
    shortName: 'Отчаяние',
    description: 'Усиленная линза. Серьёзно снижает требование к точности, но стоит дороже.',
    rarity: 2,
    slotType: 'trinket',
    icon: 'eye',
    rewardKind: 'simple',
    accuracyRequirementReduction: 4,
    effects: [
      { kind: 'accuracy', value: 4, unit: 'percent', description: '-4% к требуемой точности' },
    ],
  });

  // ── Items: добавить новый предмет в пул наград ─────────────────
  // Выпадает как обычный «simple» предмет после победы над боссом
  api.items.add({
    id: 'hardcore-anchor',
    name: 'Якорь хардкора',
    shortName: 'Хардкор',
    description: 'Прибавляет 8 секунд к таймеру босса и не изнашивается. Награда для терпеливых.',
    rarity: 2,
    slotType: 'trinket',
    icon: 'anchor',
    rewardKind: 'simple',
    bossOnly: true,
    bossTimerBonusSeconds: 8,
    effects: [
      { kind: 'timer', value: 8, unit: 'seconds', description: '+8 сек. к таймеру босса' },
    ],
  });

  // ── Achievements: добавить достижение мода ─────────────────────
  // Добавляем достижение в новую собственную категорию, которая автоматически
  // появится вкладкой в меню фильтров окна достижений.
  api.achievements.add({
    id: 'hardcore-iron-run',
    name: 'Железный забег',
    description: 'Пройти 10 уровней в режиме Хардкор.',
    category: 'game',
    conditions: [
      { 
        type: 'game.levelReached', 
        level: { operator: '>=', value: 10 }
      }
    ]
  });

  // ── Rules: ужесточить условия прохождения ──────────────────────
  api.rules.set('game.baseLives', 1);        // только одна жизнь

  // ── Events: логировать каждый конец сессии ─────────────────────
  api.events.on('sessionFinish', function (data) {
    api.log.info(
      'Session finished — accuracy: ' + data.accuracy + '%, wpm: ' + data.wpm
    );
  });

  // ── Words: добавить кастомные слова в пул ─────────────────────
  // (требует permission "words" в манифесте)
  // api.words.add(['хардкор', 'отчаяние', 'выживание']);
  // api.words.remove(['простой', 'лёгкий']);

  // ── Lessons: добавить урок в раскладку ────────────────────────
  // (требует permission "lessons" в манифесте)
  // api.lessons.add('ru-йцукен', [
  //   { id: 'hardcore-1', name: 'Хардкор-урок', keys: ['а','о','в','л'], section: 'Хардкор' }
  // ]);

  // ── UI: инъекция CSS и пользовательские панели ────────────────
  // (требует permission "ui" в манифесте)
  // api.ui.injectCSS('.mode-panel { border: 2px solid red; }');
  // api.ui.registerPanel({
  //   id: 'hardcore-banner',
  //   location: 'page-top',  // 'page-top' | 'page-bottom' | 'overlay'
  //   html: '<div style="padding:8px;background:#e85050;color:#fff;text-align:center">⚠ Хардкор-режим активен</div>',
  // });

  // ── Modes: регистрация новой страницы в сайдбаре ──────────────
  // (требует permission "modes" в манифесте)
  // api.modes.register({
  //   id: 'hardcore-leaderboard',
  //   label: 'Хардкор',
  //   icon: 'skull',
  //   group: 'top',
  //   html: '<div style="padding:24px"><h2>Таблица лидеров Хардкора</h2><p>Скоро…</p></div>',
  // });
};
