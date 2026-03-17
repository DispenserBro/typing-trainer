/**
 * Generate extended frequency word lists for Typing Trainer.
 * - English: filter an-array-of-english-words — keep common short words (2-10 chars, lowercase a-z only)
 * - Russian: embedded large frequency list + word-form generation
 *
 * Run: node scripts/generate-words.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dirname, '..', 'data');

/* ════════════════════════════════════════════════════════
   ENGLISH — top ~5000 common words
   ════════════════════════════════════════════════════════ */

const allEnglishWords = JSON.parse(
  readFileSync(join(__dirname, '..', 'node_modules', 'an-array-of-english-words', 'index.json'), 'utf8')
);

// Known top-2000 frequency English words (manually curated from Oxford/Longman lists)
const TOP_EN_SEEDS = `the of and to in a is that it was for on are with as his they be at one have this from or had by not but some what there we can out other were all your when up use word how said an each she which do their time if will way about many then them would write like so these her long make thing see him two has look more day could go come did my sound no most number who over know water than call first people may down side been now find head stand own page should country found answer school grow study still learn plant cover food sun four thought let keep eye never last door between city tree cross since hard start might story saw far sea draw left late run while press close night real life few stop open seem together next white children begin got walk example ease paper often always music those both mark book letter until mile river car feet care second group carry took rain eat room friend began idea fish mountain north once base hear horse cut sure watch color face wood main enough plain girl usual young ready above ever red list though feel talk bird soon body dog family direct pose leave song measure state product black short class wind question happen complete ship area half rock order fire south problem piece told knew pass farm top whole king size heard best hour better true during hundred remember step early hold west ground interest reach fast five sing listen six table travel less morning ten simple several toward war lay against pattern slow center love person money serve appear road map science rule govern pull cold notice voice fall power town fine certain fly unit lead cry dark machine note wait plan figure star box field rest correct able pound done beauty drive stood contain front teach week final gave green quick develop ocean warm free minute strong special mind behind clear tail produce fact street inch lot nothing course stay wheel full force blue object decide surface deep moon island foot yet busy test record boat common gold possible plane age dry wonder laugh thousand ago ran check game shape yes hot miss brought heat snow tire bring pair told hit black ring garden finger past move among quite real dog horse warm`.split(/\s+/).map(w => w.toLowerCase());

const topSet = new Set(TOP_EN_SEEDS);

// Filter the big package: only lowercase a-z, length 2-10, and prioritize known words
const validEn = allEnglishWords
  .filter(w => /^[a-z]{2,10}$/.test(w));

// Score words: known frequency words first, then shorter words
const scored = validEn.map(w => ({
  word: w,
  score: (topSet.has(w) ? 10000 : 0) + (11 - w.length) * 10 + (w.length <= 5 ? 500 : 0),
}));

scored.sort((a, b) => b.score - a.score);

// Take top 5000
const englishWords = [...new Set(scored.slice(0, 5000).map(s => s.word))];
console.log(`English words: ${englishWords.length}`);

writeFileSync(join(DATA, 'words_en.json'), JSON.stringify(englishWords, null, 0));


/* ════════════════════════════════════════════════════════
   RUSSIAN — top ~5000 common words from russian-words package
   (106,000+ words), filtered and prioritized by frequency
   ════════════════════════════════════════════════════════ */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const allRussianWords = require('russian-words');

// Top ~2000 most frequent Russian words (from frequency dictionaries)
// Used to boost scoring so common words appear first
const TOP_RU_SEEDS = `и в не на я что он с это но она они мы по его из за все так от же бы вы был для то быть до тот мой вот еще да нет ты уже при нас если или ни были этот один даже когда после чем очень где раз будет может тоже себя под кто надо без вас только дело день самый новый сейчас между тогда первый потом чтобы здесь через теперь время место такой больше почти можно много стал жизнь другой нужно свой дом слово глаз рука работа люди город земля стоять думать видеть сторона конец часть вопрос голова каждый перед лицо знать пока дверь любить стать снова ночь глава около высокий сила начать должен идти большой человек есть какой также право ответ книга народ страна мир случай путь найти год голос дорога война всегда хорошо поле лучший далеко нужный простой красный белый полный второй третий вода хлеб дом стол мама папа брат сестра друг семья школа утро вечер молоко масло огонь ветер небо море река лес гора дерево цветок птица рыба собака кошка комната окно стул кровать улица машина автобус магазин письмо тетрадь ручка карандаш число система процесс компьютер экран память файл папка строка текст код ошибка проект версия объект класс функция метод форма язык список таблица точка линия длина центр край угол база данные сеть кнопка результат решение условие правило шаг пример значение имя тип вид цвет размер знак план цель курс тема роль фильм песня урок наука игра карта час ключ порядок счет рост уровень область район движение вещь девушка мальчик ребенок женщина мужчина отец мать сын дочь лето зима весна осень минута секунда неделя месяц мера степень образ действие состояние отношение развитие причина средство чувство внимание взгляд душа воздух свет тень звук давление температура скорость масса энергия сердце кровь кожа кость мозг нога палец спина грудь плечо ухо нос рот зуб тело орган берег остров озеро снег лед дождь гром молния закат рассказ роман стихи проза сказка театр сцена картина музей история литература физика химия биология математика врач больница здоровье болезнь стена пол потолок лестница сад двор забор мост станция вокзал завод фабрика мастерская тарелка чашка ложка вилка нож рубашка брюки платье пальто куртка шапка шарф ботинки сапоги туфли железо сталь медь золото серебро бумага нитка камень песок задача группа пример работать делать писать читать считать учить говорить слушать смотреть давать брать класть ставить сидеть лежать бежать ходить ехать нести носить резать ломать бить ловить держать открывать закрывать включать строить красить мыть стирать готовить варить жарить печь спать играть петь рисовать танцевать гулять отдыхать белый черный красный синий зеленый желтый большой маленький новый старый хороший плохой быстрый медленный тихий громкий далеко близко рано поздно часто всегда никогда иногда вместе отдельно вверх вниз понимать помогать мешать ждать начинать продолжать возвращаться уходить верить бояться терять находить искать жить расти спать учить город деревня дорога мост река поле лес море небо солнце луна звезда огонь вода земля камень дерево трава цвет книга газета журнал статья рисунок кино музыка танец стол стул окно дверь стена крыша пол этаж здание мост площадь парк зеркало часы телефон ключ нож вилка тарелка чашка сумка зонт шляпа мяч кукла медведь бабочка война мир победа народ страна государство власть закон свобода правда ложь истина вера надежда любовь дружба радость счастье горе страх тишина покой тревога деньги цена труд успех опыт знание умение сила воля выбор ответ вопрос смысл цель идея мысль правило задача решение помощь защита порядок связь вход выход`.split(/\s+/);

const topRuSet = new Set(TOP_RU_SEEDS);

// Filter: only lowercase Cyrillic а-яё, length 3-10 (skip 2-letter words — too many obscure ones)
const validRu = allRussianWords
  .map(w => w.toLowerCase())
  .filter(w => /^[а-яё]{3,10}$/.test(w));

// Score: frequency seeds get huge priority; prefer words of length 4-7 (best for typing)
// Use seeded deterministic hash to distribute non-seed words evenly across alphabet
function simpleHash(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const scoredRu = validRu.map(w => {
  let score = 0;
  if (topRuSet.has(w)) score += 50000;
  // Prefer common word lengths for typing practice: 4-7 chars
  const len = w.length;
  if (len >= 4 && len <= 7) score += 200;
  else if (len === 3) score += 100;
  else if (len === 8) score += 100;
  if (len >= 9) score += 20;
  // For non-seed words: add deterministic pseudo-random spread (0-199)
  // so we get even coverage across all letters, not just А-Г
  if (!topRuSet.has(w)) score += simpleHash(w) % 200;
  return { word: w, score };
});

scoredRu.sort((a, b) => b.score - a.score);

// Take top 5000 unique words
const russianWords = [...new Set(scoredRu.slice(0, 5000).map(s => s.word))];
console.log(`Russian words: ${russianWords.length}`);

writeFileSync(join(DATA, 'words_ru.json'), JSON.stringify(russianWords, null, 0));

console.log('Done! Word lists saved to data/');

