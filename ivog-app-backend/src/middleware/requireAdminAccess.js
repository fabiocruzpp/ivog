import jwt from 'jsonwebtoken';

const ADMIN_TELEGRAM_ID = process.env.ADMIN_TELEGRAM_ID || '1318210843';

export const requireAdminAccess = (req, res, next) => {
    // Permite que as requisições de 'sondagem' (pre-flight) do CORS passem.
    if (req.method === 'OPTIONS') {
        return next();
    }

    // --- LÓGICA DE AUTENTICAÇÃO CORRIGIDA E REORDENADA ---

    // 1. Prioriza a verificação do token JWT para o painel web.
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];

        // jwt.verify é assíncrono, então tratamos tudo dentro do callback.
        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
            if (err) {
                // Token é inválido, expirado, etc.
                return res.status(403).json({ error: "Acesso negado. Token inválido ou expirado." });
            }

            // Token é válido, verificamos se o usuário tem a permissão de 'admin'.
            if (decoded.user?.role === 'admin') {
                req.user = decoded.user;
                return next(); // Acesso concedido!
            } else {
                // Token válido, mas o usuário não tem a permissão necessária.
                return res.status(403).json({ error: "Acesso negado. Permissões insuficientes." });
            }
        });
        return; // Impede que o código continue para a verificação do telegram_id.
    }

    // 2. Se não houver token, verifica se é o admin usando o app dentro do Telegram.
    const telegramId = (req.body && req.body.telegram_id) || (req.query && req.query.telegram_id);
    if (telegramId && telegramId.toString() === ADMIN_TELEGRAM_ID) {
        return next(); // Acesso concedido para o super admin via app.
    }

    // 3. Se nenhum dos métodos de autenticação funcionar, nega o acesso.
    return res.status(401).json({ error: "Acesso não autorizado. Credenciais de administrador ausentes." });
};