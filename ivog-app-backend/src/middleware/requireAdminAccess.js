import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Fallback para o ID do admin se a variável de ambiente não estiver disponível
const ADMIN_TELEGRAM_ID = process.env.ADMIN_TELEGRAM_ID || '1318210843';
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

console.log('🔧 Middleware inicializado com:', {
    ADMIN_TELEGRAM_ID,
    hasTelegramBotToken: !!TELEGRAM_BOT_TOKEN,
    processEnvKeys: Object.keys(process.env).filter(key => key.includes('TELEGRAM') || key.includes('ADMIN'))
});

// Função para verificar dados do Telegram WebApp (mantida como está)
function verifyTelegramWebAppData(initData, botToken) {
    if (!initData || !botToken) return false;
    
    try {
        const urlParams = new URLSearchParams(initData);
        const hash = urlParams.get('hash');
        
        if (!hash) return false;
        
        urlParams.delete('hash');
        
        const dataCheckString = Array.from(urlParams.entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([key, value]) => `${key}=${value}`)
            .join('\n');
        
        const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
        const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
        
        return calculatedHash === hash;
    } catch (error) {
        console.error('Erro ao verificar dados do Telegram:', error);
        return false;
    }
}

export const requireAdminAccess = (req, res, next) => {
    if (req.method === 'OPTIONS') {
        return next();
    }

    console.log('🔐 requireAdminAccess - Headers recebidos:', {
        hasAuthHeader: !!req.headers.authorization,
        hasTelegramUserId: !!req.headers['x-telegram-user-id'],
        hasTelegramInitData: !!req.headers['x-telegram-init-data'],
        telegramUserId: req.headers['x-telegram-user-id'],
        adminTelegramId: ADMIN_TELEGRAM_ID,
        url: req.originalUrl,
        method: req.method
    });

    // 1. JWT tradicional
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // --- INÍCIO DA CORREÇÃO ---
            // Corrigido para verificar a propriedade 'isAdmin', que realmente existe no token.
            if (decoded.isAdmin) {
            // --- FIM DA CORREÇÃO ---
                console.log('✅ Acesso autorizado via JWT para admin:', decoded);
                req.user = decoded;
                return next();
            }
        } catch (error) {
            console.log('❌ Token JWT inválido:', error.message);
        }
    }

    // 2. Telegram WebApp
    const telegramUserId = req.headers['x-telegram-user-id'];
    const telegramInitData = req.headers['x-telegram-init-data'];

    if (telegramUserId) {
        console.log('📱 Verificando Telegram ID:', {
            received: telegramUserId,
            expected: ADMIN_TELEGRAM_ID,
            isMatch: telegramUserId.toString() === ADMIN_TELEGRAM_ID.toString()
        });

        if (telegramUserId.toString() === ADMIN_TELEGRAM_ID.toString()) {
            console.log('✅ Acesso autorizado via Telegram para admin:', telegramUserId);
            req.user = { 
                telegramId: telegramUserId, 
                role: 'admin', 
                source: 'telegram'
            };
            return next();
        } else {
            console.log('❌ Telegram ID não corresponde ao admin autorizado');
            return res.status(403).json({ error: "Usuário não é administrador." });
        }
    }

    // 3. Fallback
    const telegramIdFallback = (req.body && req.body.telegram_id) || (req.query && req.query.telegram_id);
    if (telegramIdFallback && telegramIdFallback.toString() === ADMIN_TELEGRAM_ID.toString()) {
        console.log('✅ Acesso autorizado via fallback');
        req.user = { telegramId: telegramIdFallback, role: 'admin' };
        return next();
    }

    console.log('❌ Nenhum método de autenticação válido encontrado');
    return res.status(401).json({ error: "Acesso não autorizado" });
};