import { adminCookieName, verifyAdminToken } from './adminSession';

export function isAdminRequest(req) {
  const token = req.cookies?.get?.(adminCookieName())?.value;
  return verifyAdminToken(token);
}
