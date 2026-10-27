// A Kisokos (tutorial) szakaszainak feladatai: rejtvény, megfejtés, tippek (a játék megszokott
// tippjei, kijelölt szavakkal), és a kos bevezető üzenete.
const h = (text, words) => ({ enabled: true, text, words });
const off = { enabled: false, text: '' };
const mk = (id, clue, answer, hints) => ({
  id: `tutorial-${id}`,
  clue,
  answer,
  answerWords: answer.split(' '),
  hints: { definicio: off, fodder: off, indikator: off, alternativ: off, betu: { enabled: true }, ...hints },
});

export const TUTORIAL_TASKS = {
  szojatek: [
    {
      id: 'szojatek-1',
      title: '1. Szavakból építkezve',
      intro: 'Szójátéknál teljes szavakat keresünk - gyakran szinonimákat, vagy egy adott kategórián belüli szavakat (pl. italok, állatok, színek). Próbáld ki ezen a példán!',
      puzzle: mk('szojatek-1', 'Háborúban lelt ital, majd zavaros határok közt talált alma. Rettenetes vacsora!', 'BORZALMAS', {
        definicio: h('A definíció itt a rettenetes, egy szót keresünk ami ennek a szinonímája.', [9]),
        fodder: h('A két készlet a háború, illetve a zavaros és az alma.', [0, 4, 8]),
        indikator: h('Az mutatók a -ban toldalék, illetve a határok közt talált. Egyik szó egy másikból lesz kinyerve, egy másik szó pedig egy szó „határai” között lesz, vagyis a kezdőbetűibe lesz rakva.', [5, 6, 7]),
      }),
    },
    {
      id: 'szojatek-2',
      title: '2. Kulturális utalás',
      intro: 'Szójátéknál gyakori a kultúrális-popkultúrális utalás, a baseball játékos itt megfeleltethető egy híres magyar emberrel, mert a neve egyezik egy baseballban található poszttal, mi lehet az összefüggés?',
      puzzle: mk('szojatek-2', 'Magyar baseball játékos elveri a török csapatot?', 'DOBÓ', {
        definicio: h('Definíciónk a baseball játékos, ennek egy fajtáját keressük.', [1, 2]),
        indikator: h('Mutatónk a magyar elveri a török csapatot, ami egy történelmi személyre utal.', [0, 3, 4, 5, 6]),
      }),
    },
  ],
  betujatek: [
    {
      id: 'betujatek-1',
      title: '1. Betűcsere',
      intro: 'Betűjátéknál egyes betűket kell megváltoztatni, pakolgatni, formálni - próbáld ki ezen a példán!',
      puzzle: mk('betujatek-1', 'A malom középső tengelye elgörbült - ma ki oldja ezt meg?', 'MAJOM', {
        definicio: h('A definíció itt a ma ki. Ezekből a szavakból következik egy szinoníma, ami a megfejtés.', [5, 6]),
        fodder: h('A készlet itt a malom szó. Ezzel a szóval kell valamit csinálni, hogy megtaláljuk a megfejtést.', [1]),
        indikator: h('A rejtvény mutatója az elgörbült tengely. A készlet szó egy része elgörbült, felfedve a megfejtést.', [2, 3, 4]),
      }),
    },
    {
      id: 'betujatek-2',
      title: '2. Anagramma',
      intro: 'Az „összetörő”, „zavaros”, „zúzós” szavak anagramma-jelzők: a készlet szavak betűit újrarendezve kapjuk a megfejtést.',
      shuffleCoach: 'Anagrammánál keverni kell a készlet betűket. Van egy Keverés gombunk is ehhez - csak akkor használható, ha teleírtad a megoldást. Próbáld ki!',
      puzzle: mk('betujatek-2', 'Ez az ortó dán még összetöri magát, ha ilyen gyorsan forog.', 'TORNÁDÓ', {
        definicio: h('A definíció itt a gyorsan forog, a megfejtés egy gyorsan forgó dolog lesz.', [9, 10]),
        fodder: h('A készlet szavak az ortó és a dán. Ezekből fog összejönni a megfejtés.', [2, 3]),
        indikator: h('A mutató itt az összetöri, ami egy anagramma mutató. A készlet szavakból kell anagrammát alkotni.', [5]),
      }),
    },
  ],
  joker: [
    {
      id: 'joker-1',
      title: '1. Kreatív olvasat',
      intro: 'A jokernél sokszor kreatívan kell gondolkodni egy rejtvénynél - néha meg kell kérdőjelezni akár olyasmit is, amit eddig biztosnak gondoltunk. Ebben a rejtvényben például nincs egyértelmű mutató, csak készlet és definíció. Ki tudod találni, mit takar?',
      puzzle: mk('joker-1', 'Na, na! Hát hol hajtsak fejet?', 'PÁRNA', {
        definicio: h('Definíciónk a hol hajtsunk fejet? A megfejtés válasz lesz a kérdésre.', [3, 4, 5]),
        fodder: h('Készlet szavunk a na, na! Ezt kell másképp leírni, hogy írunk le két ugyanolyan dolgot (na) másképp?', [0, 1]),
      }),
    },
    {
      id: 'joker-2',
      title: '2. Formabontó rejtvény',
      intro: 'Sokszor egészen formabontó rejtvényekkel találkozhatsz, ami már a képrejtvény határát súrolják. Mondd, miből látsz itt mennyit?',
      puzzle: mk('joker-2', 'Ausztria -500Ft, Ukrajna -1000Ft, Szlovákia -1500Ft, Szlovénia -400Ft, Románia -800Ft, Szerbia -600Ft', 'HATÁR', {
        definicio: h('Definíciónk Ausztria, Ukrajna, Szlovákia, Szlovénia, Románia és Szerbia. Mi a közös ezekben az országokban?', [0, 2, 4, 6, 8, 10]),
        fodder: h('Készlet szavaink az 500Ft, 1000Ft, 1500Ft, 400Ft, 800Ft és a 600Ft. Hogy tudnád ezt rövidebben leírni? Hány darab micsoda?', [1, 3, 5, 7, 9, 11]),
      }),
    },
  ],
};
