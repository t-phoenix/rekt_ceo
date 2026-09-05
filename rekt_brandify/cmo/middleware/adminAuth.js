/** Admin-only routes: pass x-admin-key header matching ADMIN_API_KEY. */
export function requireAdmin(req, res, next) {
  const expected = process.env.ADMIN_API_KEY?.trim();
  if (!expected) {
    return res.status(503).json({ error: 'ADMIN_API_KEY not configured on server' });
  }
  const key = req.headers['x-admin-key'] || req.query?.admin_key || req.query?.adminKey;
  if (key !== expected) {
    return res.status(401).json({ error: 'Invalid or missing x-admin-key' });
  }
  return next();
}

export function isAdminRequest(req) {
  const expected = process.env.ADMIN_API_KEY?.trim();
  const key = req.headers['x-admin-key'] || req.query?.admin_key || req.query?.adminKey;
  return Boolean(expected && key === expected);
}
