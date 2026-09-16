export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// Determinisztikus napi index: minden nap ugyanaz a rejtvény jelenik meg mindenkinek,
// és a lista végén körbeforog.
export function dayIndexFor(listLength) {
  if (!listLength) return 0;
  const epoch = Date.UTC(2024, 0, 1);
  const days = Math.floor((Date.now() - epoch) / 86400000);
  return ((days % listLength) + listLength) % listLength;
}
