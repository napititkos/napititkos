// A közösségi posztkép témája: a titkosírás sorszáma szerint páratlan napon világos, párosan sötét.
export function themeForDay(dayNumber) {
  return Number(dayNumber) % 2 === 0 ? 'dark' : 'light';
}
