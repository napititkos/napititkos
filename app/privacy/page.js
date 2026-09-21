export const metadata = { title: 'Adatvédelem - Titkosírás' };

export default function PrivacyPage() {
  return (
    <div className="wrap">
      <h1 className="page-title">Adatvédelmi tájékoztató</h1>
      <div className="card">
        <div className="help-block">
          <h3>Milyen adatokat kezelünk regisztrációkor?</h3>
          <p>
            Ha fiókot hozol létre (email címmel és jelszóval, Google-fiókkal, vagy a belépő
            linkes móddal), a következő adatokat tároljuk: email cím, az általad megadott név
            (vagy a Google-fiókodból kapott név), és - jelszavas regisztráció esetén - a
            jelszavad egy visszafejthetetlen, titkosított (hashelt) formában. A jelszavadat
            magát soha nem tároljuk olvasható formában.
          </p>
        </div>
        <div className="help-block">
          <h3>Bejelentkezés és munkamenet</h3>
          <p>
            Bejelentkezés után egy biztonságos, titkosított munkamenet-azonosítót (cookie-t)
            helyezünk el a böngésződben, hogy ne kelljen minden látogatáskor újra
            bejelentkezned. Ez az azonosító nem tartalmaz olvasható személyes adatot, és
            kijelentkezéskor törlődik.
          </p>
        </div>
        <div className="help-block">
          <h3>Email-visszaigazolás</h3>
          <p>
            Jelszavas regisztráció esetén egy megerősítő linket küldünk az email címedre, hogy
            biztosak legyünk benne, valóban a tiéd. Google-fiókkal vagy belépő linkkel történő
            bejelentkezés esetén ez nem szükséges, mivel ezek már önmagukban igazolják az email
            cím tulajdonjogát.
          </p>
        </div>
        <div className="help-block">
          <h3>Játék közben gyűjtött adatok</h3>
          <p>
            A megoldott rejtvényeid száma, a sorozatod (streak), a trófeáid és a tutorial
            haladásod bejelentkezés nélkül csak a saját eszközödön/böngésződben (ún.
            localStorage formájában) tárolódik. Ha bejelentkezel, ugyanezek az adatok a
            fiókodhoz kötve a szerverünkön is elmentődnek, hogy más eszközön bejelentkezve is
            megtaláld a haladásodat.
          </p>
        </div>
        <div className="help-block">
          <h3>Ranglista</h3>
          <p>
            Ha bejelentkezve oldasz meg egy titkosírást, és a fiókodhoz tartozik név (pl.
            Google-fiókkal bejelentkezve automatikusan kapott név), azt tüntetjük fel a napi
            ranglistán. Ha nincs ilyen neved, ugyanúgy egy véletlenszerűen generált, az
            eszközödön tárolt azonosítót kapsz, mint a nem bejelentkezett felhasználók (pl.
            "GyorsRóka#A1B2"). Az email címedet soha nem tesszük közzé a ranglistán. A
            ranglista minden nap éjfélkor nullázódik.
          </p>
        </div>
        <div className="help-block">
          <h3>Fanmade rejtvény beküldése</h3>
          <p>
            A rejtvény-beküldés bejelentkezést és megerősített email címet igényel. Beküldéskor
            a fiókod nevét (vagy email címét, ha nem adtál meg nevet) eltároljuk a beküldött
            rejtvénnyel együtt, hogy - ha a rejtvényed bekerül a napi titkosírások közé - a
            neved feltüntethessük mellette.
          </p>
          <p>
            A beküldéssel hozzájárulsz ahhoz, hogy az általad beküldött rejtvényt (annak
            szövegét, megfejtését és tippjeit) szabadon felhasználhassuk - beleértve a napi
            titkosírások közé való bekerülést, szerkesztését és közzétételét is.
          </p>
        </div>
        <div className="help-block">
          <h3>Sütik (cookie-k)</h3>
          <p>
            A bejelentkezési munkameneten kívül nem használunk követő vagy hirdetési célú
            sütiket. A látogatottsági statisztikákat (Vercel Web Analytics) anonim, összesített
            formában gyűjtjük, egyetlen látogató sem azonosítható belőle.
          </p>
        </div>
        <div className="help-block">
          <h3>Adataid törlése</h3>
          <p>
            A fiókodat és a hozzá tartozó adatokat bármikor magad is törölheted, illetve
            letöltheted a <a className="mail-link" href="/account">Fiókom és adataim</a> oldalon
            (bejelentkezve). Ha ez nem megoldható, írj nekünk a lenti email címre - a kérésedet
            belátható időn belül teljesítjük. A törlés a fiókot, a haladást és a ranglista-bejegyzéseket
            érinti; a már közzétett rejtvényed szövege megmarad, de a nevedet és az email címedet
            eltávolítjuk mellőle.
          </p>
        </div>
        <div className="help-block">
          <h3>Adatkezelő és adatfeldolgozók</h3>
          <p>
            Az adatkezelő az oldal üzemeltetője (elérhetősége lent). Az adatok kezelésében a
            következő szolgáltatók működnek közre: a Vercel (tárhely és névtelen látogatottsági
            statisztika), egy adatbázis-szolgáltató (a fiókok és a játékadatok tárolása), a Resend
            (a megerősítő és belépő emailek küldése), valamint a Google (kizárólag akkor, ha
            Google-fiókkal lépsz be). Az oldal betűtípusait a saját szerverünkről szolgáljuk ki,
            ezért a látogatók IP-címe emiatt nem kerül a Google-hoz.
          </p>
        </div>
        <div className="help-block">
          <h3>Meddig őrizzük az adatokat?</h3>
          <p>
            A fiókot és a haladást a fiók törléséig őrizzük. A napi ranglisták legfeljebb 45 napig,
            a napi összesített statisztikák legfeljebb 120 napig maradnak meg. A megerősítő és
            belépő linkek 15 perc, illetve 24 óra után lejárnak. A visszaélések elleni védelemhez
            használt ideiglenes számlálók legfeljebb egy napig tárolódnak.
          </p>
        </div>
        <div className="help-block">
          <h3>Jogaid</h3>
          <p>
            Jogod van a hozzáféréshez, a helyesbítéshez, a törléshez és az adathordozhatósághoz. Ha
            úgy érzed, hogy adataidat nem megfelelően kezeljük, panaszt tehetsz a Nemzeti
            Adatvédelmi és Információszabadság Hatóságnál (NAIH).
          </p>
        </div>
        <div className="help-block">
          <h3>Kapcsolat</h3>
          <p>
            Kérdésed van az adatkezeléssel kapcsolatban? Írj nekünk a{' '}
            <a className="mail-link" href="mailto:napititkos@gmail.com">
              napititkos@gmail.com
            </a>{' '}
            címen.
          </p>
        </div>
      </div>
    </div>
  );
}
