import TelegramBot from 'node-telegram-bot-api';
import db from '../database/database.js';
import { promisify } from 'util';

const botToken = process.env.BOT_TOKEN;
let bot;
if (botToken) {
    bot = new TelegramBot(botToken, { polling: false });
}

const dbAll = promisify(db.all.bind(db));

export const sendMessageToAllUsers = async (messageText) => {
  if (!bot) {
    console.log("AVISO: Mensagem não enviada pois o BOT_TOKEN não está configurado.");
    return;
  }
  try {
    const users = await dbAll("SELECT telegram_id FROM usuarios");
    console.log(`Tentando enviar mensagem para ${users.length} usuários...`);
    let countSuccess = 0, countFail = 0;
    await Promise.all(users.map(async (user) => {
      try {
        await bot.sendMessage(user.telegram_id, messageText, { parse_mode: 'HTML' });
        countSuccess++;
      } catch (error) {
        countFail++;
      }
    }));
    console.log(`Envio em massa concluído: Sucesso=${countSuccess}, Falha=${countFail}`);
  } catch (dbError) {
    console.error("Erro ao buscar usuários no banco de dados:", dbError);
  }
};