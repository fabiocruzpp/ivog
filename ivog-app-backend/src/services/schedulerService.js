import cron from 'node-cron';
import db from '../database/database.js';
import { sendMessageToAllUsers, sendFileToUsers } from './telegramService.js';
import { promisify } from 'util';

const dbGet = promisify(db.get.bind(db));
const dbAll = promisify(db.all.bind(db));
const dbRun = promisify(db.run.bind(db));

let cronJob; 

// Lógica de envio centralizada
const sendNextPill = async () => {
    let pill;
    try {
        const config = await dbGet("SELECT valor FROM configuracoes WHERE chave = 'pills_broadcast_enabled'");
        if (!config || config.valor !== 'true') {
            return { success: false, message: 'Envio de pílulas desabilitado.' };
        }
        
        pill = await dbGet("SELECT * FROM knowledge_pills ORDER BY last_sent_at ASC NULLS FIRST LIMIT 1");
        if (!pill) {
            return { success: false, message: "Nenhuma pílula disponível para enviar." };
        }

        const targetCargos = JSON.parse(pill.target_cargo || '[]');
        const targetCanais = JSON.parse(pill.target_canal || '[]');
        let query = "SELECT telegram_id FROM usuarios WHERE 1=1";
        const params = [];
        if (targetCargos.length > 0) {
            query += ` AND cargo IN (${'?,'.repeat(targetCargos.length).slice(0, -1)})`;
            params.push(...targetCargos);
        }
        if (targetCanais.length > 0) {
            query += ` AND canal_principal IN (${'?,'.repeat(targetCanais.length).slice(0, -1)})`;
            params.push(...targetCanais);
        }
        const targetUsers = await dbAll(query, params);

        if (targetUsers.length > 0) {
            const userIds = targetUsers.map(u => u.telegram_id);
            const messageContent = `<b>Você sabia?</b>\n\n${pill.conteudo}\n\n<b>Tema:</b>\n${pill.tema}\n<b>Fonte:</b>\nPág. ${pill.source_page}`;
            
            if (pill.telegram_file_id) {
                await sendFileToUsers(pill.telegram_file_id, userIds, messageContent);
            } else {
                await sendMessageToAllUsers(messageContent, userIds);
            }
            const message = `Pílula #${pill.id} enviada para ${targetUsers.length} usuários.`;
            console.log(message);
            return { success: true, message };
        } else {
             const message = `Nenhum usuário encontrado para a pílula #${pill.id}. Marcada como enviada.`;
             console.log(message);
             return { success: true, message };
        }
    } catch (error) {
        const message = 'Erro ao executar o envio de pílulas.';
        console.error(message, error);
        return { success: false, message };
    } finally {
        if (pill) {
            await dbRun("UPDATE knowledge_pills SET last_sent_at = ? WHERE id = ?", [new Date().toISOString(), pill.id]);
        }
    }
};

const scheduledTask = () => {
    console.log('Tarefa agendada executada. Disparando envio de pílula...');
    sendNextPill();
};

export const startPillsScheduler = async () => {
    if (cronJob) {
        cronJob.stop();
        console.log("Agendador anterior interrompido para reconfiguração.");
    }
    
    try {
        const intervalConfig = await dbGet("SELECT valor FROM configuracoes WHERE chave = 'pills_broadcast_interval_minutes'");
        const interval = parseInt(intervalConfig?.valor, 10) || 60;
        
        const cronExpression = `*/${interval} * * * *`;
        
        if (!cron.validate(cronExpression)) {
            console.error(`Expressão cron inválida: '*/${interval} * * * *'. Usando padrão de 60 min.`);
            cronJob = cron.schedule('0 * * * *', scheduledTask, { scheduled: true, timezone: "America/Sao_Paulo" });
        } else {
            cronJob = cron.schedule(cronExpression, scheduledTask, { scheduled: true, timezone: "America/Sao_Paulo" });
        }
        
        console.log(`Agendador de Pílulas do Conhecimento configurado para executar a cada ${interval} minuto(s).`);
    } catch(error) {
        console.error("Erro ao buscar intervalo do banco. Usando padrão de 60 minutos.", error);
        cronJob = cron.schedule('0 * * * *', scheduledTask, { scheduled: true, timezone: "America/Sao_Paulo" });
    }
};

// Esta função será usada pelo disparo manual
export const manualSendAndResetScheduler = async () => {
    console.log("Disparo manual de pílula solicitado.");
    const result = await sendNextPill(); // Envia imediatamente
    await startPillsScheduler(); // Reinicia o agendador para que o próximo ciclo comece a contar a partir de agora
    return result;
};