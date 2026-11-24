// Csak a szerveren: a Szólánc 5 betűs szavai (nagy lista) is betöltődnek, aztán minden a lib/szolanc
// függvényeivel megy. A szerveroldali útvonalak innen importálnak.
import { registerSzolancLength } from './szolanc.js';
import { SZOLANC_COMMON5, SZOLANC_WORDS5 } from './szolancData5.js';

registerSzolancLength(5, SZOLANC_WORDS5, SZOLANC_COMMON5);

export * from './szolanc.js';
