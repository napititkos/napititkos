# Játék-szabvány (napititkos.hu)

Ez a leírás rögzíti, hogyan néz ki és hogyan épül fel egy játék az oldalon. Új játéknál ezt kell
követni, hogy minden játék egyformán viselkedjen és nézzen ki. A felsorolt komponensek már
léteznek, újra kell használni őket, nem újat írni.

## 1. Oldalszerkezet (felülről lefelé)

1. **Fejléc-felirat** (`components/Nav.js` + `components/Wordmark.js`): a játék neve nagybetűvel,
   a kos a név egyik O betűjének helyén, a TITKOSÍRÁS elrendezésében és méretében
   (`brand-mid`, a kos-O ugyanakkora és ugyanott áll). Ha a névben nincs O, a kos a két szó közé
   kerül keret nélkül (lásd HETI MINI). A Fredokából hiányzó Ő/Ű ékezetét a betűtípus Ó-jából vágjuk
   ki (`ODbl`), soha nem tartalék betűtípussal. A játék oldalán a felirat a főoldalra visz,
   az aloldalakon (Kisokos, Korábbiak stb.) a játékhoz. Új változatot a Nav `GAME_PATHS`,
   `variant` és `BRAND_LABEL` részébe kell felvenni.
2. **Gombsor** (`components/GameBar.js`, `game="<kulcs>"`): balra Értesítések, majd Ranglista
   (a játék fülén nyílik), Kisokos (`/kisokos?tab=<kulcs>`), Trófeák, jobbra Főoldal. Keskeny
   kijelzőn magától tömörít (először a trófeaszámláló, aztán a Főoldal felirat tűnik el).
3. **A játék kártyája** (`<div className="card">`), benne:
   - **Fejléc** (`components/GameHead.js`): balra fent a cím a titkosírás „Napi titkosírás #N”
     stílusában (`puzzle-title`), pl. „Napi Sudoku #12”. Napi nehézséggel: jobbra fent a dátum
     (év, hónap, nap), lent balra „Nehézség: x/5” buborékban, jobbra az időmérő buborékban.
     Nehézség nélkül (pl. heti játék): fent a cím, lent balra a dátum, jobbra az időmérő.
   - **Maga a játék.** A rács (tábla) maximális szélessége korlátozott, minden más (haladásjelző,
     gombok, üzenetdoboz, kérdéssáv) kitölti a kártya szélességét.
   - **Saját billentyűzet**, ahol számot vagy választ kell beírni: mobilon ne jöjjön fel a telefon
     billentyűzete (nincs `input`, vagy `inputMode="none"`), gépen viszont működjön a billentyűzet.
     Megfejtés után semmi ne kérjen billentyűzetet, és ne maradjon kijelölés.
   - **Megfejtés után:** konfetti (`components/Confetti.js`), **megfejtési hullám**
     (`lib/winWave.js` + `.win-wave`: rácson a bal alsó sarokból a jobb felsőbe átlónként, sorban
     balról jobbra, két körben), statisztika buborékokban (Időd, Átlagidő, Megoldások), és
     **„Eredmény másolása”** (`components/CopyResultButton.js`): nap, sorszám, nehézség, időpont,
     idő, ahol van pont, ott pont/max.
   - Külön „Megtaláltad!” jellegű zöld szöveg nincs, az időt a statisztika mutatja.
4. **Lenti csempék** (`components/GameFooter.js`): Korábbi rejtvények és Közösségi rejtvények
   (régi méretben, ikonnal), alattuk a többi játék csempéje (`GameTile`), a főoldalival egyező
   kinézetben, középre igazított szöveggel (mobilon balra).

## 2. Ami minden játékhoz kell

- **Főoldali csempe** (`components/Hub.js`, `GameTile big`): balra a játék logója (saját SVG a
  `components/GameIcons.js`-ben), mellette a név (kos nélkül, a játék színeivel) és egy rövid alcím,
  jobbra a teljesítés jelölődoboza (lekerekített fekete négyzet, teljesítve lila pipával).
- **Üdvözlő ablak** első látogatáskor: `useFirstVisit('<kulcs>')` (`lib/firstVisit.js`), két gomb
  (Bezárás, Kisokos); a fiókban is megjegyződik.
- **Kisokos** fül (`components/KisokosTabs.js`): gyakorló rejtvény mentés nélkül (`preview`), a kos
  (`components/RamCoach.js`) lépésenként magyaráz; a gördítés animált, és ne gördítsen el
  indításkor.
- **Ranglista** fül (`components/LeaderboardModal.js`): „Nullázódik: … múlva”; vendégként a
  vendégnévvel szerepel.
- **Korábbiak** fül (`app/archive/page.js`): év és hónap szerinti dobozok, „x/y megfejtve”,
  kicsinyítve csak a lényeg és jobbra a pipa (`components/SolvedMark.js`), lenyitva a részletek.
- **Trófeák** (`lib/achievements.js`, `game: '<kulcs>'`), a trófeák ablakában saját csoport.
- **Profil**: játékonkénti statisztika (`app/account/page.js`).
- **Megosztási kép** (`app/<útvonal>/opengraph-image.js` + `lib/ogWordmark.js`).
- **Admin** csempe és oldal: a mai és a következő 7 nap előnézete, kipróbálás, „Új kérése”.
- **Haladás szinkron**: amit a játékos elér, a `lib/progress.js` mezőiben (és a
  `lib/validate.js`-ben) tárolódik, így eszközök között és bejelentkezés után is megmarad.

## 3. Kinézet

- Szűrők és legördülők: mindig az oldal stílusában (lekerekített, lila keret, saját nyíl –
  `select.pretty-select`), soha alapértelmezett böngészős legördülő.
- Ablakok (modal): bezáró X jobbra fent, egy sorban a címmel (`.has-close-tl` +
  `.modal-close-tl`), mellette a meglévő bezárási módok is maradnak.
- Világos és sötét mód, 320–1280 px szélesség, és a kontrasztellenőrzés (WCAG AA) mindig teljesüljön.
- Nehézség: hétfő, kedd 1/5 · szerda, csütörtök 2/5 · péntek 3/5 · szombat 4/5 · vasárnap 5/5
  (`lib/dayLevel.js`).
