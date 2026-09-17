export const dynamic = 'force-dynamic';

import { kv } from '../../../lib/kv';
import { todayStr } from '../../../lib/date';

const ROTATION_MS = 24 * 60 * 60 * 1000;
const ROTATION_HOUR = 0; // hányadik órában (budapesti idő szerint) váltson naponta

// Kiszámolja, mikor van a váltás órája (ROTATION_HOUR) Budapesten egy adott UTC
// pillanat szerinti naptári napon, nyári/téli időszámítástól függetlenül.
function budapestRotationHourForDay(baseUTC) {
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
    const candidateUTC = Date.UTC(year, month - 1, day, ROTATION_HOUR - offsetHours, 0, 0);
    const localHour = parseInt(hourFmt.format(new Date(candidateUTC)), 10);
    if (localHour === ROTATION_HOUR) return candidateUTC;
  }
  return Date.UTC(year, month - 1, day, ROTATION_HOUR - 1, 0, 0);
}

// A legutóbbi (most vagy korábbi) budapesti váltási időpont epoch ms-ben.
function lastBudapestRotation(now) {
  const todayRotation = budapestRotationHourForDay(now);
  if (todayRotation <= now.getTime()) return todayRotation;
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  return budapestRotationHourForDay(yesterday);
}

export async function GET() {
  const puzzles = (await kv.get('puzzles:list')) || [];
  if (!puzzles.length) {
    return Response.json({ error: 'no-puzzles' }, { status: 404 });
  }

  const validIds = new Set(puzzles.map((p) => p.id).filter(Boolean));
  const now = new Date();
  const rotationBoundary = lastBudapestRotation(now);

  let state = (await kv.get('rotation:state')) || null;
  let usedIds = (await kv.get('rotation:usedIds')) || [];
  usedIds = usedIds.filter((id) => validIds.has(id));

  let needNew = false;
  let currentPuzzle = null;

  if (!state || !state.currentId || !validIds.has(state.currentId)) {
    needNew = true;
  } else if (new Date(state.since).getTime() < rotationBoundary) {
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
    const prevDayNumber = state?.dayNumber || 0;
    state = {
      currentId: currentPuzzle.id,
      since: new Date(rotationBoundary).toISOString(),
      dayNumber: prevDayNumber + 1,
    };
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
  } else if (new Date(state.since).getTime() !== rotationBoundary) {
    // Önjavítás: a tárolt "since" egy korábbi váltási szabály (pl. dél) szerint
    // állhat, ami időben "később" van, mint a mai helyes határidő, ezért a fenti
    // ellenőrzés nem cserélte le — itt korrigáljuk, hogy a visszaszámláló is
    // a valódi, mai határidőhöz igazodjon.
    state = { ...state, since: new Date(rotationBoundary).toISOString() };
    await kv.set('rotation:state', state);
  }

  const index = puzzles.findIndex((p) => p.id === currentPuzzle.id);
  return Response.json({
    puzzle: currentPuzzle,
    index,
    total: puzzles.length,
    date: todayStr(),
    activeSince: state.since,
    nextRotationAt: new Date(rotationBoundary + ROTATION_MS).toISOString(),
    dayNumber: state.dayNumber || 1,
  });
}
