# Tesztesetek - hitelesítés megerősítése (`security/auth-hardening`)

Az ág három dolgot javít: (1) a regisztráció nem tud fiókot átvenni vagy előre lefoglalni,
(2) az admin belépés aláírt, lejáró munkamenetet használ próbálkozás-korláttal,
(3) a levelekbe kerülő linkek alapcíme fix (`SITE_URL`), nem a kérés fejlécéből jön.

## Előkészület

- Tesztkörnyezet: a Vercel **preview** deployment (ne az éles oldal).
- Két teszt e-mail cím: **A** (Google-fiók, amivel be tudsz lépni) és **B** (még sehol nem regisztrált,
  pl. `sajatcim+teszt1@gmail.com`; a `+címke` ugyanabba a postaládába érkezik).
- Redis-hozzáférés (pl. `redis-cli` vagy a szolgáltató webes felülete) a *(Redis)* jelölésű ellenőrzésekhez.
- Vercel környezeti változók: `AUTH_SECRET`, `ADMIN_PASSWORD`, `REDIS_URL`, `RESEND_API_KEY`, `SITE_URL`.
  A `SITE_URL`-t **csak a Production környezetre** állítsd be, így a preview a saját címére generál linket.
- Ismert Redis kulcsok: `au:user:<id>`, `au:userByEmail:<email>`, `pendingreg:<token>`,
  `verifyemail:<token>`, `rl:adminlogin:ip:<ip>`, `rl:adminlogin:global`.

## 1. Regisztráció és fiókátvétel

| ID | Lépések | Elvárt eredmény |
|---|---|---|
| REG-01 | Regisztrálj a **B** címmel, érvényes jelszóval. | Zöld üzenet a megerősítő linkről. *(Redis)* `pendingreg:*` rekord van, `au:userByEmail:<B>` **nincs**. Levél érkezik. |
| REG-02 | REG-01 után, a link megnyitása **előtt** próbálj belépni a B címmel és a jelszóval. | "Hibás email cím vagy jelszó." (fiók még nem létezik) |
| REG-03 | Nyisd meg a levélben lévő linket. | Átirányít a `/login?verify=ok` oldalra ("Sikeresen megerősítetted..."). *(Redis)* létrejött a fiók `emailVerified` értékkel és `passwordHash`-sel, a `pendingreg:*` rekord törlődött. |
| REG-04 | REG-03 után lépj be a B címmel és a jelszóval. | Sikeres belépés, `session.user.verified === true`, a rejtvény-beküldés elérhető. |
| REG-05 | Nyisd meg ugyanazt a linket még egyszer. | `/login?verify=expired`, nem jön létre második fiók. |
| REG-06 | Regisztrálj egy új címmel, majd töröld a `pendingreg:*` kulcsot (lejárat szimulálása), és nyisd meg a linket. | `/login?verify=expired`. |
| REG-07 | **Fiókátvétel:** az **A** címhez már van Google-fiók (jelszó nélkül). Regisztrálj az A címmel egy új jelszóval. | A válasz ugyanolyan, mint REG-01 (zöld üzenet). *(Redis)* az `au:user:<A>` rekordban **nincs** `passwordHash`. Belépés az A címmel és az új jelszóval: **"Hibás email cím vagy jelszó"**. A Google-belépés továbbra is működik. |
| REG-08 | Regisztrálj egy már jelszóval rendelkező fiók címével, más jelszóval. | Ugyanaz a válasz. A **régi** jelszó továbbra is működik, az új nem. |
| REG-09 | **Felderítés:** küldd el a regisztrációt egy létező és egy nem létező címre, és hasonlítsd össze a választ (`curl -i`). | Azonos státusz és JSON törzs (`{"ok":true}`), a válaszidő is hasonló. |
| REG-10 | Két regisztráció ugyanarra a **B** címre (két különböző jelszóval), majd mindkét link megnyitása egymás után. | Az első link létrehozza a fiókot, a második `verify=exists`-re visz, és nem írja felül a jelszót. Csak az első jelszóval lehet belépni. |
| REG-11 | Regisztrálj a B címmel, majd **Google-lal** lépj be a B címmel, és csak utána nyisd meg a levél linkjét. | `verify=exists`. A fiók jelszó nélkül marad, a Google-belépés működik. |
| REG-12 | Érvénytelen bemenetek: hibás e-mail, 7 karakteres jelszó, 201 karakteres jelszó, 255 karakteres e-mail. | Mindegyik 400 és magyar hibaüzenet, nem jön létre `pendingreg:*` rekord. |
| REG-13 | Vedd ki (vagy rontsd el) a `RESEND_API_KEY`-t a preview-n, és regisztrálj. | 502 és "Nem sikerült elküldeni...". *(Redis)* nem marad `pendingreg:*` rekord. |

## 2. Előre-regisztráció (pre-hijacking) - régi adatokra

A régi rendszerben létrehozott, nem megerősített fiókok szimulálásához Redisben szerkeszd egy fiók
rekordját úgy, hogy `emailVerified: null` és legyen `passwordHash` (pl. egy másik fiók hash-e).

| ID | Lépések | Elvárt eredmény |
|---|---|---|
| PRE-01 | A fenti "megerősítetlen, jelszavas" fiók tulajdonosa **Google-lal** belép. | A rekordból törlődik a `passwordHash`, az `emailVerified` be van állítva. A korábbi jelszóval már nem lehet belépni. |
| PRE-02 | Ugyanez a **belépő linkkel**. | Ugyanaz, mint PRE-01. |
| PRE-03 | Megerősített, jelszavas fiók belép Google-lal. | A `passwordHash` **megmarad**, a jelszavas belépés is működik. |
| PRE-04 | Régi, megerősítetlen, jelszavas fiók belép jelszóval (nem zárjuk ki). | Belépés sikeres, `verified === false`, a beküldő oldalon megjelenik a megerősítés kérése. A "megerősítő email újraküldése" gomb működik, a link `verify=ok`-ra visz, utána `verified === true`. |

## 3. Admin belépés

| ID | Lépések | Elvárt eredmény |
|---|---|---|
| ADM-01 | `/admin` megnyitása bejelentkezés nélkül, majd az `/api/admin/users`, `/api/admin/puzzles`, `/api/admin/history`, `/api/submissions` (GET) hívása. | Mind 401. |
| ADM-02 | Belépés helyes jelszóval. | Az admin felület betölt. DevTools > Application > Cookies: `__Host-admin_session`, **HttpOnly, Secure, SameSite=Strict, Path=/**, lejárat ~8 óra. Az érték `xxx.yyy` alakú, a jelszót nem tartalmazza. |
| ADM-03 | Belépés hibás jelszóval. | 401, "Hibás jelszó...". Süti nem jön létre. |
| ADM-04 | Az admin felület összes funkciója belépve: rejtvénylista, felhasználók, előzmények, beküldések, archívum tisztítása. | Mind működik (regressziós teszt). |
| ADM-05 | **Régi süti:** vedd fel kézzel a `admin_token=<a valódi jelszó>` sütit, és hívd az `/api/admin/users` végpontot. | **401** (a régi süti már nem érvényes). |
| ADM-06 | **Hamisított süti:** `curl -H "Cookie: __Host-admin_session=aaa.bbb" .../api/admin/users`, és egy érvényes token, amelynek átírtad a közepét. | 401. |
| ADM-07 | Kijelentkezés, majd az oldal frissítése és egy admin API hívása. | A süti törlődik, 401. |
| ADM-08 | Belépés után cseréld le az `ADMIN_PASSWORD`-öt a Vercelen, és deployolj újra. Az eddigi böngésző-munkamenettel hívd az admin API-t. | 401 (a régi munkamenet érvénytelen). Az új jelszóval a belépés működik. |
| ADM-09 | Az `ADMIN_PASSWORD` törlése a preview-n, majd belépési kísérlet. | 500 és "nincs megfelelően beállítva" (nem enged be). |
| ADM-10 | Régi (jelszót tartalmazó) `admin_token` süti a böngészőben, majd sikeres belépés. | A belépés válasza törli a régi sütit is. |
| ADM-11 | Kijelentkezett állapotban `/admin`, majd `POST /api/admin/login` a helyes admin jelszóval. | Az oldal bejelentkezést kér, a végpont **403**, süti nem jön létre. A próbálkozás nem növeli a jelszó-hibaszámlálót. |
| ADM-12 | Bejelentkezés egy **sima** (nem admin) fiókkal, majd a helyes admin jelszó megadása. | **403**, "Ehhez a fiókhoz nincs admin jog". |
| ADM-13 | Admin fiókkal + jelszóval belépve kijelentkezés a fiókból (a 8 órás admin süti megmarad), majd admin API hívása. | **401** (a munkamenet a fiókhoz kötött). |
| ADM-14 | Admin munkamenet közben egy másik admin elveszi tőled az admin jogot, majd admin API hívása. | **Azonnal 401**, a 8 órás lejárat megvárása nélkül. |

## 4. Próbálkozás-korlát (admin belépés)

| ID | Lépések | Elvárt eredmény |
|---|---|---|
| RL-01 | Küldj 5 hibás jelszót egymás után ugyanarról a címről. | Az 1-5. kérés 401. |
| RL-02 | A 6. próbálkozás **helyes** jelszóval. | **429**, `Retry-After: 900`. (Zárolás alatt a helyes jelszó sem enged be.) |
| RL-03 | Várj 15 percet (vagy töröld a `rl:adminlogin:ip:*` kulcsot), és lépj be. | Sikeres belépés. Sikeres belépés után a `rl:adminlogin:ip:*` számláló törlődik. |
| RL-04 | Redis-ben nézd meg a számláló TTL-jét (`TTL rl:adminlogin:ip:<ip>`). | 0-900 közötti pozitív érték (nem `-1`). |
| RL-05 | Különböző címekről összesen 50 hibás próbálkozás (vagy állítsd a `rl:adminlogin:global` értékét 50-re). | Minden további belépés 429, amíg a kulcs le nem jár. |
| RL-06 | Redis elérhetetlenné tétele (rossz `REDIS_URL` a preview-n), belépési kísérlet. | Nem enged be (hiba, nem sikeres belépés). |

## 5. Levélben szereplő linkek

| ID | Lépések | Elvárt eredmény |
|---|---|---|
| URL-01 | `curl -X POST <preview>/api/auth/register -H "Origin: https://evil.example" -H "Content-Type: application/json" -d '{"email":"<B>","password":"Hosszu-Jelszo-1"}'` | A levélben a link **nem** `evil.example`-re mutat, hanem a fix alapcímre. |
| URL-02 | Ugyanez a `resend-verification` végponttal bejelentkezett, megerősítetlen fiókból. | A link alapcíme a fix cím. |
| URL-03 | Preview-n, `SITE_URL` nélkül. | A link a preview deployment címére mutat (`VERCEL_URL`). |
| URL-04 | Élesen (`SITE_URL=https://www.napititkos.hu`). | A link `https://www.napititkos.hu/api/auth/verify-email?token=...`. |
| URL-05 | Hibaüzenet: kényszerítsd ki a levélküldés hibáját a `resend-verification` végponton. | A kliens általános magyar üzenetet kap, a szolgáltató hibaszövege nem jelenik meg. |

## 6. Regresszió

| ID | Lépések | Elvárt eredmény |
|---|---|---|
| REGR-01 | Google-belépés (a `www` átirányítási URI felvétele után). | Működik. |
| REGR-02 | Belépő link kérése és használata. | Működik, a link 15 percig érvényes. |
| REGR-03 | Rejtvény beküldése megerősített és megerősítetlen fiókkal. | Megerősítettel sikeres, megerősítetlennél 403 és felszólítás. |
| REGR-04 | Játék: napi rejtvény, ranglista, statisztika, archívum. | A változtatás nem érinti. |
| REGR-05 | A bejelentkezett felhasználó haladásának szinkronja két eszköz között. | Működik. |

## 7. Automata tesztek (`npm test`)

A `tests/` mappában a Node beépített tesztfuttatója (`node --test`, Node 22.7+ vagy 20.19+) futtatja:

- **adminSession:** érvényes token; a token nem tartalmazza a jelszót; lejárat előtt és után; módosított tartalom
  és aláírás; hibás formátumok; a jelszó vagy az `AUTH_SECRET` cseréje érvényteleníti a tokent; hiányzó beállítás
  esetén elutasítás; két token nem egyezik; időállandó jelszó-összehasonlítás; a süti neve élesben és fejlesztéskor.
- **siteUrl:** `SITE_URL` elsőbbsége és a záró perjel levágása; `AUTH_URL` tartalék; preview cím; éles alapérték;
  fejlesztői alapérték.

A regisztráció, a megerősítés és a próbálkozás-korlát Redisre épül, ezeket a fenti kézi esetek fedik le
(egy későbbi lépésben érdemes egy memóriabeli `kv` mockkal automatizálni).
