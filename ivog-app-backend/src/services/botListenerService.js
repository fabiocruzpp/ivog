import { bot } from './telegramService.js';
import db from '../database/database.js';
import { promisify } from 'util';

const dbGet = promisify(db.get.bind(db));
const dbRun = promisify(db.run.bind(db));

// A URL para o seu Mini App deve ser configurada nas variáveis de ambiente.
const miniAppUrl = process.env.MINI_APP_URL;

const handleDocumentMessage = async (msg) => {
    const fromId = msg.from.id;
    const document = msg.document;

    if (!document) return;

    try {
        // 1. Verifica se o remetente é um administrador
        const admin = await dbGet("SELECT * FROM usuarios WHERE telegram_id = ? AND is_admin = TRUE", [fromId]);
        if (!admin) {
            console.log(`Arquivo recebido de não-admin (${fromId}). Ignorando.`);
            return;
        }

        const fileName = document.file_name;
        const fileId = document.file_id;

        // 2. Procura por pílulas que usam este nome de arquivo mas não têm um file_id
        const pillToUpdate = await dbGet("SELECT id FROM knowledge_pills WHERE source_file = ? AND (telegram_file_id IS NULL OR telegram_file_id = '')", [fileName]);

        if (!pillToUpdate) {
            bot.sendMessage(fromId, `ℹ️ Arquivo "${fileName}" recebido, mas não encontrei nenhuma Pílula do Conhecimento que precise deste arquivo no momento.`);
            return;
        }

        // 3. Atualiza todas as pílulas com o mesmo nome de arquivo
        await dbRun("UPDATE knowledge_pills SET telegram_file_id = ? WHERE source_file = ?", [fileId, fileName]);

        // 4. Envia confirmação para o admin
        bot.sendMessage(fromId, `✅ **Sincronizado!**\nO arquivo \`${fileName}\` foi recebido e o file_id foi salvo com sucesso para as pílulas correspondentes.`, { parse_mode: 'Markdown' });
        console.log(`file_id para ${fileName} capturado do admin ${fromId} e salvo no banco.`);

    } catch (error) {
        console.error("Erro ao processar documento recebido:", error);
        bot.sendMessage(fromId, `❌ Ocorreu um erro ao tentar sincronizar o arquivo. Por favor, verifique os logs do servidor.`);
    }
};

/**
 * Cria e envia a mensagem de boas-vindas com o botão do Mini App.
 * @param {object} msg O objeto da mensagem do Telegram.
 */
const handleStartOrMenuCommand = (msg) => {
    const chatId = msg.chat.id;
    const firstName = msg.from.first_name;

    if (!miniAppUrl) {
        console.error("A variável de ambiente MINI_APP_URL não está definida. O botão para o app não pode ser enviado.");
        bot.sendMessage(chatId, `Olá, ${firstName}! Boas-vindas ao IVOG.`);
        return;
    }

    const welcomeMessage = `Olá, ${firstName}!\nBem-vindo(a) ao Ivo G App! 🎉\n\nAqui você pode testar seus conhecimentos e aprender mais de forma divertida.\n\nPara começar, clique no botão abaixo para abrir o nosso mini app:\n\n✨ Instruções:\n1. Clique no botão 'Abrir APP'.\n2. Se for seu primeiro acesso, complete seu cadastro.\n3. Comece a jogar e teste seus conhecimentos!`;

    const options = {
        reply_markup: {
            inline_keyboard: [
                [
                    {
                        text: "🚀 Abrir APP 🚀",
                        web_app: { url: miniAppUrl }
                    }
                ]
            ]
        }
    };

    bot.sendMessage(chatId, welcomeMessage, options);
};

export const initializeBotListeners = () => {
    if (!bot) {
        console.warn("Ouvintes do bot não foram inicializados pois o bot não está configurado.");
        return;
    }

    // Escuta por mensagens do tipo "documento"
    bot.on('document', handleDocumentMessage);

    // Remove listeners antigos para evitar duplicação em caso de HMR (Hot Module Replacement) no modo dev
    bot.removeListener('message', bot.listeners('message').find(l => l.name === 'bound an'))

    // Adiciona um listener geral para mensagens
    bot.on('message', (msg) => {
        // Verifica se a mensagem de texto é um dos comandos desejados
        if (msg.text && (msg.text === '/start' || msg.text === '/menu')) {
            handleStartOrMenuCommand(msg);
            return; // Encerra a execução para não logar o comando como uma mensagem qualquer
        }

        // Lógica original para logar outras mensagens (opcional, bom para depuração)
        if (!msg.document) { // Evita logar a mesma mensagem de documento duas vezes
            console.log(`Mensagem recebida de ${msg.from.first_name} (${msg.from.id}): ${msg.text || '[Não é texto]'}`);
        }
    });

    console.log("Ouvintes de mensagens do bot foram inicializados.");
};