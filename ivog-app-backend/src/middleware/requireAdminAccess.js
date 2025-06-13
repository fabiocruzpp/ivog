import jwt from 'jsonwebtoken';

const ADMIN_TELEGRAM_ID = process.env.ADMIN_TELEGRAM_ID || '1318210843';

export const requireAdminAccess = (req, res, next) => {
    // Permite que as requisições de 'sondagem' (pre-flight) do CORS passem sem autenticação.
    if (req.method === 'OPTIONS') {
        return next();
    }

    // --- LÓGICA REESTRUTURADA ---

    // 1. Tenta verificar se é o admin acessando de dentro do app Telegram
    const telegramId = (req.body && req.body.telegram_id) || (req.query && req.query.telegram_id);
    if (telegramId && telegramId.toString() === ADMIN_TELEGRAM_ID) {
        return next(); // É o admin via app, acesso concedido.
    }

    // 2. Se não for o admin via app, procura por um token JWT (acesso web)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];

        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
            if (err) {
                // Token existe mas é inválido (expirado, assinatura incorreta, etc.)
                return res.status(403).json({ error: "Acesso negado. Token inválido ou expirado." });
            }

            // Token é válido e o usuário é admin
            if (decoded.user?.role === 'admin') {
                req.user = decoded.user;
                return next(); // É o admin via web, acesso concedido.
            }
        });
    } else {
         // 3. Se não encontrou nem ID de admin nem token válido, nega o acesso.
        return res.status(401).json({ error: "Acesso não autorizado. Credenciais ausentes." });
    }
};