import cron from 'node-cron';
import db from '../database/database.js';
import { sendMessageToAllUsers, sendFileToUsers } from './telegramService.js';
import { promisify } from 'util';

const dbGet = promisify(db.get.bind(db));
const dbAll = promisify(db.all.bind(db));
const dbRun = promisify(db.run.bind(db));

let cronJob; // Variável para manter a referência da tarefa agendada

const sendPillToUsers = async (pill, users) => {
    const userIds = users.map(u => u.telegram_id);
    // A mensagem agora será a legenda
    const caption = `<b>Você sabia?</b>\n\n${pill.conteudo}\n\n<b>Fonte:</b> Página ${pill.source_page}`;
    
    // Se houver um arquivo, envie-o com a legenda
    if (pill.telegram_file_id) {
        await sendFileToUsers(pill.telegram_file_id, userIds, caption);
    } else {
        // Se não houver arquivo, envie a mensagem como texto normal
        await sendMessageToAllUsers(caption, userIds);
    }
};

export const triggerPillSend = async () => {
    console.log('Disparo de pílula do conhecimento iniciado.');

    const config = await dbGet("SELECT valor FROM configuracoes WHERE chave = 'pills_broadcast_enabled'");
    if (!config || config.valor !== 'true') {
        const message = 'Envio de pílulas desabilitado pela configuração.';
        console.log(message);
        return { success: false, message };
    }

    try {
        const pill = await dbGet("SELECT * FROM knowledge_pills ORDER BY last_sent_at ASC NULLS FIRST LIMIT 1");
        if (!pill) {
            const message = "Nenhuma pílula do conhecimento encontrada para enviar.";
            console.log(message);
            return { success: false, message };
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
            await sendPillToUsers(pill, targetUsers);
            await dbRun("UPDATE knowledge_pills SET last_sent_at = ? WHERE id = ?", [new Date().toISOString(), pill.id]);
            const message = `Pílula #${pill.id} enviada para ${targetUsers.length} usuários.`;
            console.log(message);
            return { success: true, message };
        } else {
            await dbRun("UPDATE knowledge_pills SET last_sent_at = ? WHERE id = ?", [new Date().toISOString(), pill.id]);
            const message = `Nenhum usuário encontrado para a pílula #${pill.id}. Marcada como enviada para não bloquear a fila.`;
            console.log(message);
            return { success: true, message };
        }
    } catch (error) {
        const message = 'Erro ao executar a tarefa de envio de pílulas.';
        console.error(message, error);
        return { success: false, message };
    }
};

const scheduledTask = () => {
    console.log('Verificação agendada do cron job...');
    triggerPillSend();
};

export const startPillsScheduler = async () => {
    if (cronJob) {
        cronJob.stop();
        console.log("Tarefa agendada anterior interrompida.");
    }
    
    try {
        const intervalConfig = await dbGet("SELECT valor FROM configuracoes WHERE chave = 'pills_broadcast_interval_minutes'");
        const interval = parseInt(intervalConfig?.valor, 10) || 60;
        
        const cronExpression = `*/${interval} * * * *`;
        
        if (!cron.validate(cronExpression)) {
            console.error(`Expressão cron inválida gerada: ${cronExpression}. Usando padrão de 60 minutos.`);
            cronJob = cron.schedule('0 * * * *', scheduledTask, { scheduled: true, timezone: "America/Sao_Paulo" });
        } else {
             cronJob = cron.schedule(cronExpression, scheduledTask, { scheduled: true, timezone: "America/Sao_Paulo" });
        }
        
        console.log(`Agendador de Pílulas do Conhecimento iniciado. Executará a cada ${interval} minuto(s).`);
    } catch(error) {
        console.error("Erro ao buscar intervalo de pílulas do banco. Usando padrão de 60 minutos.", error);
        cronJob = cron.schedule('0 * * * *', scheduledTask, { scheduled: true, timezone: "America/Sao_Paulo" });
    }
};