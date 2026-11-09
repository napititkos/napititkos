import { kv } from './kv';

// Közösségi minik: a játékosok által készített 5x5-ös mini keresztrejtvények.
//   community:minis              [{ id, rows, entries, name, submitterEmail, createdAt, promoted? }]
//   community:minisolved:<id>    uid -> megfejtés ideje (ms)
//   community:minireactions:<id> "u:<uid>" | "d:<eszköz>" -> emoji
// A kérdésbankhoz nem nyúlnak (a felhasználói szerkesztő nem kap javaslatot a bankból); az admin
// beemelésekor a kérdések a heti várólistára kerülnek.
export const CMINI_KEY = 'community:minis';
export const cminiSolvedKey = (id) => `community:minisolved:${id}`;
export const cminiReactionsKey = (id) => `community:minireactions:${id}`;
export const newCminiId = () => 'cm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export async function cminiList() {
  return (await kv.get(CMINI_KEY)) || [];
}
