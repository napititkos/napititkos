// Mini keresztrejtvény (5x5): a rács közös, tiszta segédfüggvényei. Szándékosan nem importál
// semmit (se a szólistát, se az adatbázist), így a böngészőbe is biztonságosan bekerülhet
// (a szerkesztő használja), és a tesztek is közvetlenül futtathatják.
export const N = 5;

// A magyar betűk (kisbetűvel); egy négyzetbe egy betű kerül (a kettős betű 2 négyzet).
export const HU = new Set(Array.from('aábcdeéfghiíjklmnoóöőpqrstuúüűvwxyz'));

// A szó normalizált alakja, vagy null, ha nem érvényes (üres, N betűnél hosszabb, idegen karakter).
export function normWord(w) {
  const s = String(w || '').trim().toLowerCase();
  const chars = Array.from(s);
  if (!chars.length || chars.length > N || !chars.every((c) => HU.has(c))) return null;
  return s;
}

// A rács szavai (szakaszai): irány, kezdőpont, hossz, cellák. A grid: logikai mátrix, igaz = fekete.
export function slotsOf(grid) {
  const out = [];
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; ) {
      if (grid[r][c]) { c++; continue; }
      const s = c;
      while (c < N && !grid[r][c]) c++;
      out.push({ dir: 'A', row: r, col: s, cells: Array.from({ length: c - s }, (_, k) => [r, s + k]) });
    }
  }
  for (let c = 0; c < N; c++) {
    for (let r = 0; r < N; ) {
      if (grid[r][c]) { r++; continue; }
      const s = r;
      while (r < N && !grid[r][c]) r++;
      out.push({ dir: 'D', row: s, col: c, cells: Array.from({ length: r - s }, (_, k) => [s + k, c]) });
    }
  }
  return out;
}

// Betűs rács ('#' = fekete, '' = üres, egyébként betű) -> logikai fekete-mátrix.
export const blackGrid = (rows) => rows.map((r) => r.map((ch) => ch === '#'));

// Egy szó azonosítója a rácson belül (irány, sor, oszlop), pl. "A:0:2".
export const slotKey = (dir, row, col) => `${dir}:${row}:${col}`;

// Hagyományos számozás: minden négyzet, ahol vízszintes vagy függőleges szó kezdődik, sorszámot kap.
export function numbering(rows) {
  const black = (r, c) => r < 0 || c < 0 || r >= N || c >= N || rows[r][c] === '#';
  const nums = {};
  let k = 0;
  for (let r = 0; r < N; r++)
    for (let c = 0; c < N; c++) {
      if (black(r, c)) continue;
      if (black(r, c - 1) || black(r - 1, c)) nums[`${r},${c}`] = ++k;
    }
  return nums;
}

// A generátor mintáinak szabályai, kézi szerkesztésnél figyelmeztetésként (nem akadály):
// legfeljebb 10 fekete négyzet, nincs teljesen fekete sor/oszlop, a fehér terület összefüggő,
// legfeljebb egy egybetűs és két kétbetűs szó.
export function gridWarnings(rows) {
  const out = [];
  const grid = blackGrid(rows);
  const blacks = grid.flat().filter(Boolean).length;
  if (blacks === N * N) return [{ code: 'all-black', text: 'Nincs egyetlen fehér négyzet sem.' }];
  if (blacks > 10) out.push({ code: 'too-many-black', text: `${blacks} fekete négyzet van; a generált rácsokban legfeljebb 10 szokott lenni.` });
  const lineBlack = (get) => Array.from({ length: N }, (_, i) => Array.from({ length: N }, (_, j) => get(i, j)).every(Boolean));
  if (lineBlack((i, j) => grid[i][j]).some(Boolean) || lineBlack((i, j) => grid[j][i]).some(Boolean)) {
    out.push({ code: 'black-line', text: 'Van teljesen fekete sor vagy oszlop.' });
  }
  // A fehér négyzetek összefüggősége (szélességi bejárás).
  const whites = [];
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!grid[r][c]) whites.push([r, c]);
  const seen = new Set([`${whites[0][0]},${whites[0][1]}`]);
  const queue = [whites[0]];
  while (queue.length) {
    const [r, c] = queue.pop();
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const rr = r + dr, cc = c + dc;
      if (rr < 0 || cc < 0 || rr >= N || cc >= N || grid[rr][cc] || seen.has(`${rr},${cc}`)) continue;
      seen.add(`${rr},${cc}`);
      queue.push([rr, cc]);
    }
  }
  if (seen.size !== whites.length) out.push({ code: 'disconnected', text: 'A fehér négyzetek nem alkotnak összefüggő területet.' });
  const lens = slotsOf(grid).map((s) => s.cells.length);
  if (lens.filter((x) => x === 1).length > 1) out.push({ code: 'many-1', text: 'Egynél több egybetűs szó van a rácsban.' });
  if (lens.filter((x) => x === 2).length > 2) out.push({ code: 'many-2', text: 'Kettőnél több kétbetűs szó van a rácsban.' });
  return out;
}
