export const dynamic = 'force-dynamic';

import { kv } from '../../../lib/kv';
import { todayStr } from '../../../lib/date';
import { clientIp, isLimited, tooMany } from '../../../lib/rateLimit';
import { issueGameToken, publicPuzzle } from '../../../lib/game';

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

// A budapesti naptári nap (YYYY-MM-DD) egy adott epoch ms pillanatban - ehhez
// hasonlítjuk az admin által manuálisan beütemezett dátumokat.
function budapestDateStr(ms) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Budapest',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt.format(new Date(ms));
}

// Új rejtvény kiválasztása és a rotációs állapot mentése. Csak zár alatt hívható.
async function rotate(prevState, puzzles, scheduledToday, rotationBoundary, now) {
  const validIds = new Set(puzzles.map((p) => p.id).filter(Boolean));
  let usedIds = ((await kv.get('rotation:usedIds')) || []).filter((id) => validIds.has(id));

  let candidates;
  if (scheduledToday) {
    candidates = [scheduledToday];
  } else {
    candidates = puzzles.filter((p) => p.id && !p.scheduledDate && !usedIds.includes(p.id));
    if (candidates.length === 0) {
      usedIds = [];
      candidates = puzzles.filter((p) => p.id && !p.scheduledDate && p.id !== prevState?.currentId);
      if (candidates.length === 0) candidates = puzzles.filter((p) => p.id && !p.scheduledDate);
      if (candidates.length === 0) candidates = puzzles;
    }
  }
  const currentPuzzle = candidates[0];
  if (!usedIds.includes(currentPuzzle.id)) usedIds.push(currentPuzzle.id);

  await kv.set('rotation:state', {
    currentId: currentPuzzle.id,
    since: new Date(rotationBoundary).toISOString(),
  });
  await kv.set('rotation:usedIds', usedIds);

  const today = todayStr(now);
  let history = (await kv.get('rotation:history')) || [];
  if (!history.some((h) => h.id === currentPuzzle.id && h.shownDate === today)) {
    history = [
      ...history,
      {
        id: currentPuzzle.id,
        clue: currentPuzzle.clue,
        answer: currentPuzzle.answer,
        parHints: currentPuzzle.parHints,
        hints: currentPuzzle.hints,
        submittedBy: currentPuzzle.submittedBy || '',
        shownDate: today,
      },
    ].slice(-500);
    await kv.set('rotation:history', history);
  }
}

export async function GET(req) {
  if (await isLimited('puzzle:ip', clientIp(req), 120, 60)) return tooMany(60);

  const rawPuzzles = (await kv.get('puzzles:list')) || [];
  const puzzles = rawPuzzles.filter((p) => p.clue?.trim() && p.answer?.trim());
  if (!puzzles.length) {
    return Response.json({ error: 'no-puzzles' }, { status: 404 });
  }

  const validIds = new Set(puzzles.map((p) => p.id).filter(Boolean));
  const now = new Date();
  const rotationBoundary = lastBudapestRotation(now);
  const todayBudapest = budapestDateStr(rotationBoundary);

  // Ha van kifejezetten MÁRA beütemezett rejtvény, az mindig felülírja az
  // automatikus választást - akkor is, ha épp más fut.
  const scheduledToday = puzzles.find((p) => p.id && p.scheduledDate === todayBudapest);

  const isCurrent = (s) =>
    !!s &&
    !!s.currentId &&
    validIds.has(s.currentId) &&
    new Date(s.since).getTime() >= rotationBoundary &&
    !(scheduledToday && s.currentId !== scheduledToday.id);

  let state = (await kv.get('rotation:state')) || null;
  if (!isCurrent(state)) {
    // A váltás zár alatt történik: a váltás pillanatában érkező párhuzamos kérések
    // sem választhatnak több rejtvényt, és nem duplázódik az előzmény.
    await kv.withLock('rotation', async () => {
      const fresh = (await kv.get('rotation:state')) || null;
      if (isCurrent(fresh)) return; // közben más kérés már elvégezte
      await rotate(fresh, puzzles, scheduledToday, rotationBoundary, now);
    });
    state = (await kv.get('rotation:state')) || null;
    if (!isCurrent(state)) return Response.json({ error: 'busy' }, { status: 503 });
  } else if (new Date(state.since).getTime() !== rotationBoundary) {
    // Önjavítás: a tárolt "since" egy korábbi váltási szabály (pl. dél) szerint
    // állhat, ami időben "később" van, mint a mai helyes határidő - itt korrigáljuk,
    // hogy a visszaszámláló is a valódi, mai határidőhöz igazodjon.
    state = { ...state, since: new Date(rotationBoundary).toISOString() };
    await kv.set('rotation:state', state);
  }

  const currentPuzzle = puzzles.find((p) => p.id === state.currentId);
  if (!currentPuzzle) return Response.json({ error: 'no-puzzles' }, { status: 404 });

  const history = (await kv.get('rotation:history')) || [];
  const date = todayStr(now);
  return Response.json(
    {
      // A megfejtés és a tipp-szövegek nem kerülnek ki: az ellenőrzést és a tippeket
      // a /api/game/* végpontok végzik. A token a játék azonosítója és kezdési ideje.
      puzzle: publicPuzzle(currentPuzzle),
      token: issueGameToken(currentPuzzle.id, date),
      index: puzzles.findIndex((p) => p.id === currentPuzzle.id),
      total: puzzles.length,
      date,
      activeSince: state.since,
      nextRotationAt: new Date(rotationBoundary + ROTATION_MS).toISOString(),
      dayNumber: history.length || 1,
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
