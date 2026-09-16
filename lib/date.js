export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
