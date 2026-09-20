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
            A napi ranglistán - regisztrált és nem regisztrált felhasználók esetén egyaránt -
            egy véletlenszerűen generált, az igazi neveddel semmilyen kapcsolatban nem álló
            azonosító (pl. "GyorsRóka#A1B2") jelenik meg, nem a valódi neved vagy email címed.
            Ez az azonosító az eszközödön tárolódik, és a ranglista éjfélkor nullázódik.
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
            Ha szeretnéd, hogy töröljük a fiókodat és a hozzá tartozó adatokat, írj nekünk a
            lenti email címre - ezt a kérésedre belátható időn belül teljesítjük.
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
