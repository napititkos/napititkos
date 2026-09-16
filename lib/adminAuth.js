export function isAdminRequest(req) {
  const token = req.cookies?.get?.('admin_token')?.value;
  if (!token) return false;
  return !!process.env.ADMIN_PASSWORD && token === process.env.ADMIN_PASSWORD;
}
