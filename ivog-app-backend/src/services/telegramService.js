// telegramService.js

import TelegramBot from 'node-telegram-bot-api';
import db from '../database/database.js';
import { promisify } from 'util';
import fs from 'fs';

const botToken = process.env.BOT_TOKEN;
let bot;

if (botToken) {
    bot = new TelegramBot(botToken, { polling: true });
    console.log("Bot do Telegram inicializado em modo polling.");
} else {
    console.warn("AVISO: BOT_TOKEN não está definido. Funcionalidades do Telegram estarão desativadas.");
}

const dbAll = promisify(db.all.bind(db));

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// VERSÃO ATUALIZADA: Aceita um terceiro parâmetro "options"
export const sendMessageToAllUsers = async (messageText, targetUserIds = null, options = {}) => {
    if (!bot) {
        console.log("AVISO: Mensagem não enviada pois o bot não foi inicializado.");
        return;
    }
    try {
        let users;
        if (targetUserIds && Array.isArray(targetUserIds)) {
            users = targetUserIds.map(id => ({ telegram_id: id }));
        } else {
            users = await dbAll("SELECT telegram_id FROM usuarios");
        }
        
        if (users.length === 0) return;

        console.log(`Iniciando envio de texto para ${users.length} usuários...`);
        let countSuccess = 0, countFail = 0, countBlocked = 0;

        // Combina as opções padrão com as novas opções passadas
        const defaultOptions = { parse_mode: 'HTML' };
        const combinedOptions = { ...defaultOptions, ...options };

        for (const user of users) {
            try {
                // Usa as opções combinadas no envio
                await bot.sendMessage(user.telegram_id, messageText, combinedOptions);
                countSuccess++;
            } catch (error) {
                countFail++;
                if (error.response && error.response.statusCode === 403) {
                    countBlocked++;
                    console.log(`Usuário ${user.telegram_id} bloqueou o bot.`);
                } else if (error.response && error.response.statusCode === 429) {
                    const retryAfter = error.response.body.parameters.retry_after;
                    console.warn(`Limite de taxa atingido. Aguardando ${retryAfter} segundos...`);
                    await sleep(retryAfter * 1000);
                    try {
                        await bot.sendMessage(user.telegram_id, messageText, combinedOptions);
                        countSuccess++;
                        countFail--;
                    } catch (retryError) {
                        console.error(`Falha no reenvio para ${user.telegram_id}:`, retryError.message);
                    }
                } else {
                     console.error(`Falha ao enviar para ${user.telegram_id}:`, error.message);
                }
            }
            
            await sleep(50); 
        }
        console.log(`Envio de texto concluído: Sucesso=${countSuccess}, Falha=${countFail}, Bloquearam=${countBlocked}`);
    } catch (dbError) {
        console.error("Erro ao buscar usuários no banco de dados:", dbError);
    }
};

export const sendFileAndGetId = async (filePath, targetChatId) => {
    if (!bot) {
        throw new Error("Bot não inicializado.");
    }
    try {
        if (!fs.existsSync(filePath)) {
            throw new Error(`Arquivo não encontrado em: ${filePath}`);
        }
        const fileStream = fs.createReadStream(filePath);
        const sentFile = await bot.sendDocument(targetChatId, fileStream);
        
        if (sentFile.document) {
            return sentFile.document.file_id;
        }
        return null;

    } catch (error) {
        console.error(`Erro ao enviar arquivo ${filePath} para obter file_id:`, error.message);
        throw error;
    }
};

// Esta função não será mais usada pela pílula, mas pode ser útil para outros fins.
export const sendFileToUsers = async (file_id, targetUserIds, caption) => {
    if (!bot || !file_id || !targetUserIds || targetUserIds.length === 0) {
        return;
    }
    console.log(`Iniciando envio do arquivo (file_id: ${file_id}) para ${targetUserIds.length} usuários com legenda...`);
    
    for (const userId of targetUserIds) {
        try {
            await bot.sendDocument(userId, file_id, { caption: caption, parse_mode: 'HTML' });
        } catch (error) {
             console.error(`Falha ao enviar arquivo com legenda para ${userId}:`, error.message);
        }
        await sleep(50);
    }
    console.log('Envio de arquivo com legenda concluído.');
};

export { bot };