export const metadata = { title: 'Súgó - Titkosírás' };

import TrackHelpVisit from '../../components/TrackHelpVisit';

export default function HelpPage() {
  return (
    <div className="wrap">
      <TrackHelpVisit />
      <h1 className="page-title">Súgó</h1>
      <div className="card">
        <div className="help-block">
          <h3>Mi az a kriptikus (cryptic) rejtvény?</h3>
          <p>
            Minden kriptikus rejtvény két részből áll: egy <b>definícióból</b>, ami szó szerint
            jelenti a választ (mint egy sima keresztrejtvényben), és egy <b>wordplay</b> (szójáték)
            részből, ami egy trükkel (pl. anagrammával) vezet el ugyanahhoz a válaszhoz. Ha mindkét
            részt ugyanarra a szóra tudod megoldani, biztos lehetsz benne, hogy jó a válaszod.
          </p>
        </div>
        <div className="help-block">
          <h3>Definíció</h3>
          <p>A rejtvény azon szava vagy kifejezése, ami közvetlenül, szó szerint jelenti a választ - pont úgy, mint egy hagyományos keresztrejtvényben.</p>
        </div>
        <div className="help-block">
          <h3>Mutató</h3>
          <p>A „jelzőszó”, ami elárulja, milyen trükköt kell alkalmazni a wordplay részben - pl. „összekeverve” egy anagrammát jelez, „elrejtve” egy rejtett szót, „visszafelé” egy megfordítást.</p>
        </div>
        <div className="help-block">
          <h3>Készlet</h3>
          <p>Az a betűhalmaz vagy szórészlet, amivel a mutató szerinti trükköt el kell végezni - például az anagramma esetén pontosan azok a betűk, amiket át kell rendezni.</p>
        </div>
        <div className="help-block">
          <h3>Alternatív tipp</h3>
          <p>Egy plusz, másfajta szemszögből adott segítség, ha az előző tippek után is elakadtál - gyakran egy egyszerűbb, közvetlenebb utalás a válaszra.</p>
        </div>
        <div className="help-block">
          <h3>Gyakorlati tanácsok</h3>
          <p>
            Olvasd el a rejtvényt kétszer: először a jelentését keresve, másodszor a szavak
            szerkezetére figyelve. Ha elakadtál, kérj egy tippet - nincs abban semmi szégyellnivaló,
            a kriptikus rejtvények nehezek, főleg az elején. A gyakorlat a legjobb tanár.
          </p>
        </div>
      </div>
    </div>
  );
}
