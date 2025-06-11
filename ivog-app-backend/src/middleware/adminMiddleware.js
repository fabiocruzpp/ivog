const ADMIN_TELEGRAM_ID = '1318210843';

export const requireAdmin = (req, res, next) => {
  const userId = (req.body && req.body.telegram_id) || (req.query && req.query.telegram_id);
  if (userId && userId.toString() === ADMIN_TELEGRAM_ID) {
    next();
  } else {
    res.status(403).json({ error: "Acesso negado. Rota exclusiva para administradores." });
  }
};
