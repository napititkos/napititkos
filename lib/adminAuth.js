export function isAdminRequest(req) {
  const cookie = req.headers.get('cookie') || '';
  const match = cookie.match(/admin_token=([^;]+)/);
  if (!match) return false;
  const token = decodeURIComponent(match[1]);
  return !!process.env.ADMIN_PASSWORD && token === process.env.ADMIN_PASSWORD;
}
