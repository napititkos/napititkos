// Mini keresztrejtvény: a NYT Mini-szerű navigáció közös logikája. A játékfelület (MiniPlayer)
// és az admin szerkesztő (MiniEditor) is ezt használja, így a kettő pontosan ugyanúgy működik:
// - kattintás egy négyzetre: kijelöli (az aktuális irányban, ha ott van szó); ugyanarra újra
//   kattintva irányváltás;
// - gépelés után a szó következő üres négyzete, ha a szó betelt, a következő szó első üres négyzete;
// - Backspace: ha a négyzetben van betű, törli; ha üres, visszalép a szóban (a szó elején az előző
//   szó utolsó négyzetére) és ott töröl;
// - nyilak: mozgás; a szóiránnyal ellentétes nyíl először csak irányt vált;
// - Tab / Shift+Tab: következő / előző szó első üres négyzete.
// A rács: betűk tömbje, '#' = fekete, '' = üres. Szándékosan nem importál semmit (kliensoldali).
const N = 5;

export function navModel(rows) {
  const n = rows.length || N;
  const black = (r, c) => r < 0 || c < 0 || r >= n || c >= n || rows[r][c] === '#';
  const nums = {};
  let k = 0;
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; c++) if (!black(r, c) && (black(r, c - 1) || black(r - 1, c))) nums[`${r},${c}`] = ++k;
  const words = [];
  for (let r = 0; r < n; r++)
    for (let c = 0; c < n; ) {
      if (black(r, c)) { c++; continue; }
      const s = c;
      while (c < n && !black(r, c)) c++;
      words.push({ dir: 'A', row: r, col: s, num: nums[`${r},${s}`], cells: Array.from({ length: c - s }, (_, j) => [r, s + j]) });
    }
  for (let c = 0; c < n; c++)
    for (let r = 0; r < n; ) {
      if (black(r, c)) { r++; continue; }
      const s = r;
      while (r < n && !black(r, c)) r++;
      words.push({ dir: 'D', row: s, col: c, num: nums[`${s},${c}`], cells: Array.from({ length: r - s }, (_, j) => [s + j, c]) });
    }
  words.forEach((w, i) => (w.i = i));
  const at = {};
  for (const w of words) w.cells.forEach(([r, c], j) => ((at[`${r},${c}`] = at[`${r},${c}`] || {})[w.dir] = { w: w.i, j }));
  const byNum = (d) => words.filter((w) => w.dir === d).sort((a, b) => a.num - b.num);
  const order = [...byNum('A'), ...byNum('D')].map((w) => w.i);
  return { n, black, nums, words, at, order };
}

export const wordOf = (m, cur) => m.words[m.at[`${cur.r},${cur.c}`]?.[cur.dir]?.w];
const filled = (fill, r, c) => !!fill[r][c] && fill[r][c] !== '#';
const cellCur = (w, j) => ({ r: w.cells[j][0], c: w.cells[j][1], dir: w.dir });

// A szó első üres négyzete (vagy az első négyzete, ha mind ki van töltve).
export function firstEmpty(m, fill, w) {
  const j = w.cells.findIndex(([r, c]) => !filled(fill, r, c));
  return cellCur(w, j < 0 ? 0 : j);
}

// Kattintás: másik négyzet -> kijelölés (ha ott nincs szó az aktuális irányban, a másikban);
// ugyanaz a négyzet -> irányváltás (ha a másik irányban is van szó).
export function clickCell(m, cur, r, c) {
  if (m.black(r, c)) return cur;
  const here = m.at[`${r},${c}`] || {};
  if (cur && r === cur.r && c === cur.c) {
    const other = cur.dir === 'A' ? 'D' : 'A';
    return here[other] ? { r, c, dir: other } : cur;
  }
  const dir = cur && here[cur.dir] ? cur.dir : here.A ? 'A' : 'D';
  return { r, c, dir };
}

// Gépelés utáni pozíció (a fill már tartalmazza az új betűt).
export function afterType(m, fill, cur) {
  const pos = m.at[`${cur.r},${cur.c}`]?.[cur.dir];
  if (!pos) return cur;
  const w = m.words[pos.w];
  for (let j = pos.j + 1; j < w.cells.length; j++) if (!filled(fill, ...w.cells[j])) return cellCur(w, j);
  if (!w.cells.every(([r, c]) => filled(fill, r, c))) {
    for (let j = 0; j < pos.j; j++) if (!filled(fill, ...w.cells[j])) return cellCur(w, j);
  }
  const k = m.order.indexOf(w.i);
  for (let s = 1; s <= m.order.length; s++) {
    const ow = m.words[m.order[(k + s) % m.order.length]];
    const j = ow.cells.findIndex(([r, c]) => !filled(fill, r, c));
    if (j >= 0) return cellCur(ow, j);
  }
  // Minden kitöltve: a szóban marad, a következő négyzetre lép (ha van).
  return pos.j + 1 < w.cells.length ? cellCur(w, pos.j + 1) : cur;
}

// Backspace: { clear: [r, c] | null, cur } – melyik négyzet törlődjön, és hová kerüljön a kijelölés.
export function backspaceStep(m, fill, cur) {
  if (filled(fill, cur.r, cur.c)) return { clear: [cur.r, cur.c], cur };
  const pos = m.at[`${cur.r},${cur.c}`]?.[cur.dir];
  if (!pos) return { clear: null, cur };
  const w = m.words[pos.w];
  if (pos.j > 0) {
    const [r, c] = w.cells[pos.j - 1];
    return { clear: [r, c], cur: { r, c, dir: cur.dir } };
  }
  const k = m.order.indexOf(w.i);
  const pw = m.words[m.order[(k - 1 + m.order.length) % m.order.length]];
  const [r, c] = pw.cells[pw.cells.length - 1];
  return { clear: [r, c], cur: { r, c, dir: pw.dir } };
}

// Nyíl: a szóiránnyal ellentétes nyíl először csak irányt vált (ha arra is van szó).
export function arrowStep(m, cur, dr, dc) {
  const dir = dr ? 'D' : 'A';
  if (dir !== cur.dir && m.at[`${cur.r},${cur.c}`]?.[dir]) return { ...cur, dir };
  let r = cur.r + dr, c = cur.c + dc;
  while (r >= 0 && c >= 0 && r < m.n && c < m.n && m.black(r, c)) { r += dr; c += dc; }
  if (r < 0 || c < 0 || r >= m.n || c >= m.n) return cur;
  const here = m.at[`${r},${c}`] || {};
  return { r, c, dir: here[cur.dir] ? cur.dir : here.A ? 'A' : 'D' };
}

// Tab / Shift+Tab: a következő / előző szó első üres négyzete.
export function jumpWord(m, fill, cur, delta) {
  const w = wordOf(m, cur) || m.words[m.order[0]];
  if (!w) return cur;
  const k = m.order.indexOf(w.i);
  return firstEmpty(m, fill, m.words[m.order[(k + delta + m.order.length) % m.order.length]]);
}
