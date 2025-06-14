import db from '../database/database.js';
import { promisify } from 'util';

const dbGet = promisify(db.get.bind(db));
const dbAll = promisify(db.all.bind(db));

const buildWhereClause = (filters, tableAlias = 'u') => {
    const conditions = [];
    const params = [];
    
    const prefix = tableAlias ? `${tableAlias}.` : '';

    if (filters.ddd) {
        conditions.push(`${prefix}ddd = ?`);
        params.push(filters.ddd);
    }
    if (filters.canal_principal) {
        conditions.push(`${prefix}canal_principal = ?`);
        params.push(filters.canal_principal);
    }
    if (filters.rede_parceiro) {
        const directPartnerTypes = ['PAP', 'GA', 'GA Multicanal'];
        if (directPartnerTypes.includes(filters.rede_parceiro)) {
            conditions.push(`${prefix}tipo_parceiro = ?`);
        } else {
            conditions.push(`${prefix}rede_parceiro = ?`);
        }
        params.push(filters.rede_parceiro);
    }
    if (filters.loja_revenda) {
        conditions.push(`${prefix}loja_revenda = ?`);
        params.push(filters.loja_revenda);
    }
    if (filters.cargo) {
        conditions.push(`${prefix}cargo = ?`);
        params.push(filters.cargo);
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return { whereClause, params };
};

// ... (Restante do arquivo permanece o mesmo)
export const getFilterOptionsController = async (req, res) => {
    try {
        const dddsPromise = dbAll("SELECT DISTINCT ddd FROM usuarios WHERE ddd IS NOT NULL AND ddd != '' ORDER BY ddd");
        const canaisPromise = dbAll("SELECT DISTINCT canal_principal FROM usuarios WHERE canal_principal IS NOT NULL AND canal_principal != '' ORDER BY canal_principal");
        
        const [ddds, canais] = await Promise.all([dddsPromise, canaisPromise]);

        res.status(200).json({
            ddds: ddds.map(r => r.ddd),
            canais: canais.map(r => r.canal_principal),
        });
    } catch (error) {
         res.status(500).json({ error: 'Erro ao buscar opções de filtro.' });
    }
};

export const getKpisController = async (req, res) => {
    const { whereClause: userWhere, params: userParams } = buildWhereClause(req.query, '');
    const { whereClause: joinWhere, params: joinParams } = buildWhereClause(req.query, 'u');

    try {
        const totalUsersPromise = dbGet(`SELECT COUNT(telegram_id) as count FROM usuarios ${userWhere}`, userParams);
        const totalQuestionsPromise = dbGet("SELECT COUNT(id) as count FROM perguntas");
        
        const quizzesAndTrainingsPromise = dbAll(`
            SELECT is_training, COUNT(s.id_simulado) as count
            FROM simulados s
            JOIN usuarios u ON s.telegram_id = u.telegram_id
            ${joinWhere}
            GROUP BY s.is_training
        `, joinParams);

        const [users, questions, quizStats] = await Promise.all([
            totalUsersPromise,
            totalQuestionsPromise,
            quizzesAndTrainingsPromise,
        ]);

        const totalQuizzes = quizStats.find(item => item.is_training === 0)?.count || 0;
        const totalTrainings = quizStats.find(item => item.is_training === 1)?.count || 0;

        res.status(200).json({
            totalUsers: users.count,
            totalQuestions: questions.count,
            totalQuizzes: totalQuizzes,
            totalTrainings: totalTrainings
        });
    } catch (error) {
        console.error("Erro ao buscar KPIs:", error);
        res.status(500).json({ error: 'Erro ao buscar KPIs.' });
    }
};


export const getActivityOverTimeController = async (req, res) => {
    const { whereClause, params } = buildWhereClause(req.query, 'u');
    const query = `
        SELECT 
            DATE(s.data_inicio) as date, 
            COUNT(s.id_simulado) as count 
        FROM simulados s
        JOIN usuarios u ON s.telegram_id = u.telegram_id
        ${whereClause}
        ${whereClause ? 'AND' : 'WHERE'} s.data_inicio >= DATE('now', '-30 days')
        GROUP BY date 
        ORDER BY date ASC
    `;
    try {
        const rows = await dbAll(query, params);
        res.status(200).json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar atividade ao longo do tempo.' });
    }
};

export const getTopThemesController = async (req, res) => {
    const { whereClause, params } = buildWhereClause(req.query, 'u');
    const query = `
        SELECT 
            r.tema, 
            COUNT(r.id) as count 
        FROM respostas_simulado r
        JOIN usuarios u ON r.telegram_id = u.telegram_id
        ${whereClause}
        ${whereClause ? 'AND' : 'WHERE'} r.tema IS NOT NULL AND r.tema != 'Não especificado'
        GROUP BY r.tema 
        ORDER BY count DESC
        LIMIT 7
    `;
    try {
        const rows = await dbAll(query, params);
        res.status(200).json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar temas mais populares.' });
    }
};

export const getThemePerformanceController = async (req, res) => {
    const { whereClause, params } = buildWhereClause(req.query, 'u');
    const query = `
        SELECT 
            r.tema, 
            CAST(SUM(r.acertou) AS REAL) * 100 / COUNT(r.id) as successRate
        FROM respostas_simulado r
        JOIN usuarios u ON r.telegram_id = u.telegram_id
        ${whereClause}
        ${whereClause ? 'AND' : 'WHERE'} r.tema IS NOT NULL AND r.tema != 'Não especificado'
        GROUP BY r.tema
        ORDER BY successRate DESC
    `;
    try {
        const rows = await dbAll(query, params);
        res.status(200).json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar performance por tema.' });
    }
};

export const getUserDistributionController = async (req, res) => {
    const { whereClause, params } = buildWhereClause(req.query, 'usuarios');
     const query = `
        SELECT 
            canal_principal, 
            COUNT(telegram_id) as userCount 
        FROM usuarios
        ${whereClause}
        ${whereClause ? 'AND' : 'WHERE'} canal_principal IS NOT NULL AND canal_principal != ''
        GROUP BY canal_principal
    `;
    try {
        const rows = await dbAll(query, params);
        res.status(200).json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar distribuição de usuários.' });
    }
};

export const getQuestionPerformanceController = async (req, res) => {
    const { whereClause, params } = buildWhereClause(req.query, 'u');
    const baseQuery = `
        FROM respostas_simulado r
        JOIN usuarios u ON r.telegram_id = u.telegram_id
        ${whereClause}
        ${whereClause ? 'AND' : 'WHERE'} r.pergunta IS NOT NULL AND r.pergunta != ''
        GROUP BY r.pergunta
        HAVING COUNT(r.id) >= 5
    `;

    const hardestPromise = dbAll(`SELECT r.pergunta, CAST(SUM(r.acertou) AS REAL) * 100 / COUNT(r.id) as successRate, COUNT(r.id) as totalAnswers ${baseQuery} ORDER BY successRate ASC, totalAnswers DESC LIMIT 5`, params);
    const easiestPromise = dbAll(`SELECT r.pergunta, CAST(SUM(r.acertou) AS REAL) * 100 / COUNT(r.id) as successRate, COUNT(r.id) as totalAnswers ${baseQuery} ORDER BY successRate DESC, totalAnswers DESC LIMIT 5`, params);

    try {
        const [hardest, easiest] = await Promise.all([hardestPromise, easiestPromise]);
        res.status(200).json({ hardest, easiest });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar desempenho das perguntas.' });
    }
};

export const getTopUsersByActivityController = async (req, res) => {
    const { whereClause, params } = buildWhereClause(req.query, 'u');
    const query = `
        SELECT
            u.first_name,
            COUNT(s.id_simulado) as activityCount
        FROM simulados s
        JOIN usuarios u ON s.telegram_id = u.telegram_id
        ${whereClause}
        GROUP BY s.telegram_id
        ORDER BY activityCount DESC
        LIMIT 10
    `;
    try {
        const rows = await dbAll(query, params);
        res.status(200).json(rows);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar usuários mais ativos.' });
    }
};