export const metadata = { title: 'Adatvédelem — Titkosírás' };

export default function PrivacyPage() {
  return (
    <div className="wrap">
      <h1 className="page-title">Adatvédelmi tájékoztató</h1>
      <div className="card">
        <div className="help-block">
          <h3>Milyen adatokat tárolunk most?</h3>
          <p>
            A Titkosírás jelenleg nem kér regisztrációt, és nem gyűjt személyes adatokat. A
            sorozatod (streak), a trófeáid és a napi haladásod kizárólag a saját eszközöd
            böngészőjében, helyben tárolódik (ún. localStorage formájában). Ezek az adatok soha
            nem kerülnek fel a szerverünkre, és más eszközön nem érhetők el.
          </p>
        </div>
        <div className="help-block">
          <h3>Mit látunk a szerveren?</h3>
          <p>
            A napi titkosírás megjelenítéséhez és az átlagos tipp-felhasználás kiszámításához
            névtelen, összesített statisztikákat gyűjtünk (pl. hányan hány tippet használtak egy
            adott napon). Ezekből egyetlen látogató sem azonosítható.
          </p>
        </div>
        <div className="help-block">
          <h3>Fanmade rejtvény beküldése</h3>
          <p>
            Ha rejtvényt küldesz be, az általad megadott becenevet és a rejtvény szövegét
            eltároljuk, hogy elbírálhassuk. Ha nem adsz meg becenevet, a beküldés névtelenként
            kerül rögzítésre.
          </p>
        </div>
        <div className="help-block">
          <h3>A jövőben: regisztráció</h3>
          <p>
            Ha a jövőben lehetőség lesz regisztrálni (pl. hogy a sorozatod és a trófeáid eszközök
            között is átvihetők legyenek), ezt a tájékoztatót frissítjük, és pontosan leírjuk,
            milyen adatokat kezelünk, meddig, és hogyan törölheted őket.
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
