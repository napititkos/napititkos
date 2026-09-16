export const dynamic = 'force-dynamic';

import { kv } from '../../../lib/kv';
import { todayStr } from '../../../lib/date';

// Kiszámolja, mikor van dél (12:00) Budapesten egy adott UTC pillanat
// szerinti naptári napon, nyári/téli időszámítástól függetlenül.
function budapestNoonForDay(baseUTC) {
  const dayFmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Budapest',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const [{ value: y }, , { value: mo }, , { value: d }] = dayFmt.formatToParts(baseUTC);
  const year = parseInt(y, 10);
  const month = parseInt(mo, 10);
  const day = parseInt(d, 10);

  const hourFmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Budapest',
    hour: '2-digit',
    hour12: false,
  });

  for (const offsetHours of [1, 2]) {
    const candidateUTC = Date.UTC(year, month - 1, day, 12 - offsetHours, 0, 0);
    const localHour = parseInt(hourFmt.format(new Date(candidateUTC)), 10);
    if (localHour === 12) return candidateUTC;
  }
  return Date.UTC(year, month - 1, day, 11, 0, 0);
}

// A legutóbbi (most vagy korábbi) budapesti dél időpontja epoch ms-ben.
function lastBudapestNoon(now) {
  const todayNoon = budapestNoonForDay(now);
  if (todayNoon <= now.getTime()) return todayNoon;
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  return budapestNoonForDay(yesterday);
}

export async function GET() {
  const puzzles = (await kv.get('puzzles:list')) || [];
  if (!puzzles.length) {
    return Response.json({ error: 'no-puzzles' }, { status: 404 });
  }

  const validIds = new Set(puzzles.map((p) => p.id).filter(Boolean));
  const now = new Date();
  const noonBoundary = lastBudapestNoon(now);

  let state = (await kv.get('rotation:state')) || null;
  let usedIds = (await kv.get('rotation:usedIds')) || [];
  usedIds = usedIds.filter((id) => validIds.has(id));

  let needNew = false;
  let currentPuzzle = null;

  if (!state || !state.currentId || !validIds.has(state.currentId)) {
    needNew = true;
  } else if (new Date(state.since).getTime() < noonBoundary) {
    needNew = true;
  } else {
    currentPuzzle = puzzles.find((p) => p.id === state.currentId);
  }

  if (needNew) {
    let candidates = puzzles.filter((p) => p.id && !usedIds.includes(p.id));
    if (candidates.length === 0) {
      usedIds = [];
      candidates = puzzles.filter((p) => p.id && p.id !== state?.currentId);
      if (candidates.length === 0) candidates = puzzles;
    }
    currentPuzzle = candidates[0];
    usedIds.push(currentPuzzle.id);
    state = { currentId: currentPuzzle.id, since: new Date(noonBoundary).toISOString() };
    await kv.set('rotation:state', state);
    await kv.set('rotation:usedIds', usedIds);

    const history = (await kv.get('rotation:history')) || [];
    history.push({
      id: currentPuzzle.id,
      clue: currentPuzzle.clue,
      answer: currentPuzzle.answer,
      parHints: currentPuzzle.parHints,
      shownDate: todayStr(),
    });
    await kv.set('rotation:history', history.slice(-500));
  }

  const index = puzzles.findIndex((p) => p.id === currentPuzzle.id);
  return Response.json({
    puzzle: currentPuzzle,
    index,
    total: puzzles.length,
    date: todayStr(),
    activeSince: state.since,
  });
}
