// A lapozó látható oldalszámai (slots = ennyi elem fér el, a „…” jelekkel együtt).
export function pageWindow(page, pages, slots) {
  if (pages <= slots) return Array.from({ length: pages }, (_, i) => i + 1);
  const inner = Math.max(1, slots - 4); // az első, az utolsó és a két „…” mellett ennyi fér
  let a = Math.max(2, page - Math.floor((inner - 1) / 2));
  let b = Math.min(pages - 1, a + inner - 1);
  a = Math.max(2, b - inner + 1);
  const out = [1];
  if (a > 2) out.push('…a');
  for (let i = a; i <= b; i++) out.push(i);
  if (b < pages - 1) out.push('…b');
  out.push(pages);
  return out;
}
