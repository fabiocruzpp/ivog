import axios from 'axios';

// Debug detalhado do ambiente Telegram
const telegramWebApp = window.Telegram?.WebApp;
const isTelegramMiniApp = !!telegramWebApp;

console.log('🔍 Debug completo do Telegram:', {
    windowTelegram: !!window.Telegram,
    telegramWebApp: !!telegramWebApp,
    initData: telegramWebApp?.initData,
    initDataUnsafe: telegramWebApp?.initDataUnsafe,
    user: telegramWebApp?.initDataUnsafe?.user,
    isExpanded: telegramWebApp?.isExpanded,
    platform: telegramWebApp?.platform,
    userAgent: navigator.userAgent,
    href: window.location.href
});

// Força a inicialização do Telegram WebApp se disponível
if (telegramWebApp && !telegramWebApp.isExpanded) {
    telegramWebApp.expand();
    telegramWebApp.ready();
}

// --- INÍCIO DA ALTERAÇÃO ---
// Função para determinar a URL base da API dinamicamente
const getApiBaseUrl = () => {
  const hostname = window.location.hostname;

  // Cenário 1: Acesso via IP (rede corporativa)
  if (hostname === '34.53.92.86') {
    console.log("📍 Ambiente: IP Corporativo. Apontando para backend via IP.");
    return 'http://34.53.92.86:5001/api';
  }

  // Cenário 2: Acesso via domínio de produção (Telegram, etc.)
  if (hostname === 'frontivog.ivogapi.xyz') {
    console.log("📍 Ambiente: Produção. Apontando para backend via domínio.");
    return 'https://ivog.ivogapi.xyz/api';
  }

  // Cenário 3: Fallback para desenvolvimento local
  console.log("📍 Ambiente: Local. Apontando para backend local.");
  return 'http://localhost:5001/api';
};
// --- FIM DA ALTERAÇÃO ---

const api = axios.create({
    baseURL: getApiBaseUrl(), // <-- AQUI USAMOS A FUNÇÃO DINÂMICA
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    }
});

// Interceptor para adicionar autenticação (SEU CÓDIGO ORIGINAL MANTIDO)
api.interceptors.request.use(
    (config) => {
        console.log(`🚀 Fazendo requisição para: ${config.method?.toUpperCase()} ${config.url}`);
        
        // Re-verifica dados do Telegram a cada requisição
        const currentTelegramData = window.Telegram?.WebApp;
        const hasInitData = !!currentTelegramData?.initData;
        const hasUser = !!currentTelegramData?.initDataUnsafe?.user;
        
        console.log('📱 Estado atual do Telegram:', {
            hasTelegramObject: !!window.Telegram,
            hasWebApp: !!currentTelegramData,
            hasInitData,
            hasUser,
            initDataLength: currentTelegramData?.initData?.length || 0,
            userId: currentTelegramData?.initDataUnsafe?.user?.id,
            username: currentTelegramData?.initDataUnsafe?.user?.username
        });
        
        // Se estiver no Telegram miniapp E tiver dados válidos
        if (currentTelegramData && hasInitData && hasUser) {
            const initData = currentTelegramData.initData;
            const user = currentTelegramData.initDataUnsafe.user;
            
            config.headers['X-Telegram-Init-Data'] = initData;
            config.headers['X-Telegram-User-ID'] = user.id.toString();
            
            console.log('✅ Headers Telegram adicionados:', {
                userId: user.id,
                username: user.username,
                firstName: user.first_name,
                initDataLength: initData.length
            });
        } else if (window.Telegram) {
            // Telegram detectado mas sem dados - tentar diferentes abordagens
            console.log('⚠️ Telegram detectado mas sem dados completos');
            
            // Tentar obter dados de diferentes formas
            const fallbackUser = window.Telegram.WebApp?.initDataUnsafe?.user;
            const fallbackInitData = window.Telegram.WebApp?.initData;
            
            if (fallbackUser && fallbackInitData) {
                config.headers['X-Telegram-Init-Data'] = fallbackInitData;
                config.headers['X-Telegram-User-ID'] = fallbackUser.id.toString();
                console.log('✅ Headers Telegram adicionados via fallback');
            } else {
                // Última tentativa - usar ID fixo do admin para teste
                console.log('🚨 Usando ID admin fixo para teste');
                config.headers['X-Telegram-User-ID'] = '1318210843';
                config.headers['X-Telegram-Init-Data'] = 'test_data';
            }
        } else {
            // Não é Telegram - usar JWT tradicional
            const token = localStorage.getItem('authToken') || localStorage.getItem('adminToken');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
                console.log('🔐 Usando autenticação JWT tradicional');
            } else {
                console.warn('⚠️ Nenhuma autenticação disponível');
            }
        }

        // Log final dos headers (sem dados sensíveis)
        console.log('📋 Headers finais:', {
            hasTelegramUserId: !!config.headers['X-Telegram-User-ID'],
            hasTelegramInitData: !!config.headers['X-Telegram-Init-Data'],
            hasAuthorizationHeader: !!config.headers.Authorization,
            telegramUserId: config.headers['X-Telegram-User-ID']
        });

        return config;
    },
    (error) => {
        console.error('❌ Erro no interceptor de requisição:', error);
        return Promise.reject(error);
    }
);

// Interceptor para tratar respostas (SEU CÓDIGO ORIGINAL MANTIDO)
api.interceptors.response.use(
    (response) => {
        console.log(`✅ Resposta bem-sucedida: ${response.status} - ${response.config.url}`);
        return response;
    },
    (error) => {
        const errorInfo = {
            url: error.config?.url,
            method: error.config?.method?.toUpperCase(),
            status: error.response?.status,
            message: error.message,
            data: error.response?.data
        };
        
        console.error('❌ Erro na resposta da API:', errorInfo);
        
        if (error.response?.status === 401) {
            console.warn('🚫 Erro 401 - Não autorizado');
        }
        
        return Promise.reject(error);
    }
);

// Função para debug manual (SEU CÓDIGO ORIGINAL MANTIDO)
window.debugTelegram = () => {
    const info = {
        windowTelegram: !!window.Telegram,
        webApp: !!window.Telegram?.WebApp,
        initData: window.Telegram?.WebApp?.initData,
        user: window.Telegram?.WebApp?.initDataUnsafe?.user,
        isReady: window.Telegram?.WebApp?.isReady,
        platform: window.Telegram?.WebApp?.platform
    };
    console.table(info);
    return info;
};

export default api;