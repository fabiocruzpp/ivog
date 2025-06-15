import cron from 'node-cron';
import db from '../database/database.js';
import { sendMessageToAllUsers, sendFileToUsers } from './telegramService.js';
import { promisify } from 'util';

const dbGet = promisify(db.get.bind(db));
const dbAll = promisify(db.all.bind(db));
const dbRun = promisify(db.run.bind(db));

let cronJob; 

// Função para verificar se está no horário silencioso
const isQuietTime = async () => {
    try {
        console.log('🔍 Verificando horário silencioso...');
        
        // Buscar configurações
        const enabledConfig = await dbGet("SELECT valor FROM configuracoes WHERE chave = 'pills_quiet_time_enabled'");
        const startConfig = await dbGet("SELECT valor FROM configuracoes WHERE chave = 'pills_quiet_time_start'");
        const endConfig = await dbGet("SELECT valor FROM configuracoes WHERE chave = 'pills_quiet_time_end'");
        
        console.log('📋 Configurações encontradas:', {
            enabled: enabledConfig?.valor,
            start: startConfig?.valor,
            end: endConfig?.valor
        });
        
        // Se não está habilitado, pode enviar
        if (!enabledConfig || enabledConfig.valor !== 'true') {
            console.log('✅ Horário silencioso DESABILITADO - pode enviar');
            return false;
        }

        // Se não tem horários configurados, pode enviar
        if (!startConfig || !endConfig || !startConfig.valor || !endConfig.valor) {
            console.log('⚠️ Horários não configurados - pode enviar');
            return false;
        }

        // ✅ USAR HORÁRIO DO BRASIL (UTC-3)
        const now = new Date();
        const brasilTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
        const currentHour = brasilTime.getHours();
        const currentMinute = brasilTime.getMinutes();
        const currentTime = currentHour * 60 + currentMinute; // minutos desde meia-noite
        
        console.log(`🇧🇷 Horário Brasil: ${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')} (${currentTime} minutos)`);
        console.log(`🌍 Horário UTC: ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`);
        
        // Parsear horários configurados
        const [startHour, startMin] = startConfig.valor.split(':').map(Number);
        const [endHour, endMin] = endConfig.valor.split(':').map(Number);
        
        const startTime = startHour * 60 + startMin;
        const endTime = endHour * 60 + endMin;
        
        console.log(`⏰ Horário silencioso: ${startConfig.valor} (${startTime} min) até ${endConfig.valor} (${endTime} min)`);

        let isQuiet = false;
        
        // Caso especial: horário que cruza meia-noite (ex: 21:00 às 06:00)
        if (startTime > endTime) {
            isQuiet = currentTime >= startTime || currentTime <= endTime;
            console.log(`🌙 Horário cruza meia-noite: ${currentTime} >= ${startTime} || ${currentTime} <= ${endTime} = ${isQuiet}`);
        } else {
            // Horário normal (ex: 08:00 às 18:00)
            isQuiet = currentTime >= startTime && currentTime <= endTime;
            console.log(`☀️ Horário normal: ${currentTime} >= ${startTime} && ${currentTime} <= ${endTime} = ${isQuiet}`);
        }
        
        if (isQuiet) {
            console.log('🔇 HORÁRIO SILENCIOSO ATIVO - NÃO pode enviar');
        } else {
            console.log('🔊 Fora do horário silencioso - PODE enviar');
        }
        
        return isQuiet;
        
    } catch (error) {
        console.error('❌ Erro ao verificar horário silencioso:', error);
        return false; // Em caso de erro, permite envio
    }
};

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
            const messageContent = `<b>Você sabia?</b>\n\n${pill.conteudo}\n\n<b>Tema:</b> ${pill.tema}<b>\nFonte:</b> Pág.${pill.source_page}`;
            
            if (pill.telegram_file_id) {
                await sendFileToUsers(pill.telegram_file_id, userIds, messageContent);
            } else {
                await sendMessageToAllUsers(messageContent, userIds);
            }
            const message = `Pílula #${pill.id} enviada para ${targetUsers.length} usuários.`;
            console.log('📤 ' + message);
            return { success: true, message };
        } else {
             const message = `Nenhum usuário encontrado para a pílula #${pill.id}. Marcada como enviada.`;
             console.log('⚠️ ' + message);
             return { success: true, message };
        }
    } catch (error) {
        const message = 'Erro ao executar o envio de pílulas.';
        console.error('❌ ' + message, error);
        return { success: false, message };
    } finally {
        if (pill) {
            await dbRun("UPDATE knowledge_pills SET last_sent_at = ? WHERE id = ?", [new Date().toISOString(), pill.id]);
        }
    }
};

const scheduledTask = async () => {
    const now = new Date();
    const brasilTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
    
    console.log('\n⏰ =========================');
    console.log('📅 Tarefa agendada executada:', brasilTime.toLocaleString('pt-BR'));
    console.log('⏰ =========================');
    
    // ✅ VERIFICAR horário silencioso ANTES de tentar enviar
    const isQuiet = await isQuietTime();
    if (isQuiet) {
        console.log('🔇 Horário silencioso ativo. Envio adiado.');
        console.log('⏰ =========================\n');
        return;
    }
    
    console.log('✅ Fora do horário silencioso. Disparando envio de pílula...');
    const result = await sendNextPill();
    console.log('📋 Resultado:', result.message);
    console.log('⏰ =========================\n');
};

export const startPillsScheduler = async () => {
    if (cronJob) {
        cronJob.stop();
        console.log("🔄 Agendador anterior interrompido para reconfiguração.");
    }
    
    try {
        const intervalConfig = await dbGet("SELECT valor FROM configuracoes WHERE chave = 'pills_broadcast_interval_minutes'");
        const interval = parseInt(intervalConfig?.valor, 10) || 60;
        
        // Se for 999999, não agenda (desabilitado)
        if (interval >= 999999) {
            console.log('⏸️ Agendador de pílulas desabilitado (intervalo >= 999999).');
            return;
        }
        
        const cronExpression = `*/${interval} * * * *`;
        
        if (!cron.validate(cronExpression)) {
            console.error(`❌ Expressão cron inválida: '*/${interval} * * * *'. Usando padrão de 60 min.`);
            cronJob = cron.schedule('0 * * * *', scheduledTask, { scheduled: true, timezone: "America/Sao_Paulo" });
        } else {
            cronJob = cron.schedule(cronExpression, scheduledTask, { scheduled: true, timezone: "America/Sao_Paulo" });
        }
        
        console.log(`⚡ Agendador de Pílulas configurado para executar a cada ${interval} minuto(s).`);
        
        // ✅ VERIFICAR e logar horário silencioso
        const enabledConfig = await dbGet("SELECT valor FROM configuracoes WHERE chave = 'pills_quiet_time_enabled'");
        if (enabledConfig && enabledConfig.valor === 'true') {
            const [startConfig, endConfig] = await Promise.all([
                dbGet("SELECT valor FROM configuracoes WHERE chave = 'pills_quiet_time_start'"),
                dbGet("SELECT valor FROM configuracoes WHERE chave = 'pills_quiet_time_end'")
            ]);
            if (startConfig && endConfig) {
                console.log(`🔇 Horário silencioso ATIVO: ${startConfig.valor} às ${endConfig.valor} (horário Brasil)`);
            }
        } else {
            console.log('🔊 Horário silencioso DESABILITADO');
        }
        
        // Log do horário atual do Brasil
        const now = new Date();
        const brasilTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
      
    } catch(error) {
        console.error("❌ Erro ao buscar intervalo do banco. Usando padrão de 60 minutos.", error);
        cronJob = cron.schedule('0 * * * *', scheduledTask, { scheduled: true, timezone: "America/Sao_Paulo" });
    }
};

// Esta função será usada pelo disparo manual
export const manualSendAndResetScheduler = async () => {
    const now = new Date();
    const brasilTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
    
    console.log("💡 Disparo manual de pílula solicitado.");
    console.log(`🇧🇷 Horário Brasil: ${brasilTime.toLocaleString('pt-BR')}`);
    
    // Para envio manual, vamos RESPEITAR o horário silencioso também
    // Se quiser ignorar o horário silencioso no envio manual, descomente a linha abaixo:
    // console.log("💡 Envio manual ignora horário silencioso.");
    // const result = await sendNextPill();
    
    const isQuiet = await isQuietTime();
    if (isQuiet) {
        console.log('🔇 Horário silencioso ativo. Envio manual bloqueado.');
        return { success: false, message: 'Horário silencioso ativo. Envio não realizado.' };
    }
    
    const result = await sendNextPill();
    await startPillsScheduler();
    return result;
};

// Função utilitária para testar horário silencioso
export const checkQuietTimeStatus = async () => {
    const isQuiet = await isQuietTime();
    const now = new Date();
    const brasilTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
    
    return {
        isQuietTime: isQuiet,
        currentTimeBrasil: brasilTime.toLocaleTimeString('pt-BR'),
        currentDateBrasil: brasilTime.toLocaleDateString('pt-BR'),
        currentTimeUTC: now.toLocaleTimeString('pt-BR'),
        currentDateUTC: now.toLocaleDateString('pt-BR'),
        message: isQuiet ? 'Horário silencioso ativo' : 'Fora do horário silencioso',
        timezone: 'America/Sao_Paulo (UTC-3)',
        fullDateTimeBrasil: brasilTime.toLocaleString('pt-BR')
    };
};
