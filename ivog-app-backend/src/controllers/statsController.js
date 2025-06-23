import db from '../database/database.js';
import { promisify } from 'util';

const dbGet = promisify(db.get.bind(db));
const dbAll = promisify(db.all.bind(db));

export const getMyStatsController = async (req, res) => {
    const { telegram_id } = req.query;

    if (!telegram_id) {
        return res.status(400).json({ error: 'telegram_id é obrigatório.' });
    }

    try {
        const totalSimuladosPromise = dbGet(
            "SELECT COUNT(DISTINCT id_simulado) as count FROM simulados WHERE telegram_id = ?",
            [telegram_id]
        );

        const globalStatsPromise = dbGet(
            "SELECT COUNT(*) as total_respostas, SUM(acertou) as total_acertos FROM respostas_simulado WHERE telegram_id = ?",
            [telegram_id]
        );

        const desempenhoSubtemasPromise = dbAll(
            `SELECT subtema as categoria_valor, SUM(acertou) as acertos_brutos, COUNT(*) as total_respostas
             FROM respostas_simulado
             WHERE telegram_id = ? AND subtema IS NOT NULL AND subtema != '' AND subtema != 'Não especificado'
             GROUP BY subtema ORDER BY subtema`,
            [telegram_id]
        );

        // Executa todas as consultas em paralelo
        const [
            totalSimuladosResult,
            globalStatsResult,
            desempenhoSubtemasResult
        ] = await Promise.all([
            totalSimuladosPromise,
            globalStatsPromise,
            desempenhoSubtemasPromise
        ]);

        const total_acertos_geral = globalStatsResult ? globalStatsResult.total_acertos || 0 : 0;
        const total_respostas_geral = globalStatsResult ? globalStatsResult.total_respostas || 0 : 0;
        const percentual_geral_acerto = total_respostas_geral > 0
            ? ((total_acertos_geral / total_respostas_geral) * 100).toFixed(2)
            : '0.00';

        const desempenhoSubtemasFormatado = desempenhoSubtemasResult.map(item => ({
            subtema: item.categoria_valor,
            acertos_brutos: item.acertos_brutos || 0,
            total_respostas: item.total_respostas,
            percentual_acerto_bruto: item.total_respostas > 0
                ? ((item.acertos_brutos / item.total_respostas) * 100).toFixed(2)
                : '0.00'
        }));

        res.status(200).json({
            total_simulados_realizados: totalSimuladosResult ? totalSimuladosResult.count || 0 : 0,
            total_respostas_geral: total_respostas_geral,
            total_acertos_geral_bruto: total_acertos_geral,
            percentual_acerto_geral_formatado: percentual_geral_acerto,
            desempenho_subtemas: desempenhoSubtemasFormatado
        });

    }
    catch (error) {
        console.error("Erro ao buscar estatísticas do usuário:", error);
        res.status(500).json({ error: "Erro interno do servidor ao buscar estatísticas." });
    }
};


// Função getMyChallengeDetailsController com lógica de título corrigida
export const getMyChallengeDetailsController = async (req, res) => {
    const { telegram_id } = req.query;

    if (!telegram_id) {
        return res.status(400).json({ error: 'telegram_id é obrigatório.' });
    }

    try {
        const challengeStats = await dbAll(
            `SELECT
                s.contexto_desafio,
                d.titulo AS titulo_desafio,
                COUNT(rs.id) as total_perguntas_no_desafio,
                SUM(rs.acertou) as total_acertos_brutos_no_desafio
             FROM simulados s
             JOIN respostas_simulado rs ON s.id_simulado = rs.id_simulado
             LEFT JOIN desafios d ON s.contexto_desafio = 'desafio_id:' || d.id -- <--- Ajustado aqui também para o JOIN
             WHERE s.telegram_id = ? AND s.contexto_desafio IS NOT NULL AND s.contexto_desafio != ''
             GROUP BY s.contexto_desafio, d.titulo
             ORDER BY s.data_inicio DESC`,
            [telegram_id]
        );

        const formattedChallengeStats = challengeStats.map(item => {
            // Extrai o ID do contexto usando a regex CORRIGIDA
            const contexto = item.contexto_desafio;
            const challengeIdMatch = contexto ? contexto.match(/desafio_id:(\d+)/) : null; // <--- Regex CORRIGIDA
            const challengeId = challengeIdMatch ? challengeIdMatch[1] : 'Desconhecido';

            // Lógica de exibição do título:
            // Usa item.titulo_desafio se existir e não for vazio após trim.
            // Caso contrário, usa o formato "Desafio ID [ID]" com o ID extraído.
            const tituloDisplay = (item.titulo_desafio && String(item.titulo_desafio).trim() !== '')
                ? item.titulo_desafio // Usa o título do banco se existir e não for vazio
                : `Desafio ID ${challengeId}`; // Fallback para "Desafio ID [ID]"

            return {
                contexto_desafio: item.contexto_desafio,
                titulo_desafio: tituloDisplay, // Usa o título formatado
                total_perguntas_no_desafio: item.total_perguntas_no_desafio,
                total_acertos_brutos_no_desafio: item.total_acertos_brutos_no_desafio || 0,
                percentual_acerto_bruto_formatado: item.total_perguntas_no_desafio > 0
                    ? ((item.total_acertos_brutos_no_desafio / item.total_perguntas_no_desafio) * 100).toFixed(2)
                    : '0.00'
            };
        });

        res.status(200).json(formattedChallengeStats);

    } catch (error) {
        console.error("Erro ao buscar detalhes de desafios do usuário:", error);
        res.status(500).json({ error: "Erro interno do servidor ao buscar detalhes de desafios." });
    }
};

export const getChallengeDetailsController = async (req, res) => {
    const { challenge_id } = req.query;

    if (!challenge_id) {
        return res.status(400).json({ error: 'challenge_id é obrigatório.' });
    }

    try {
        const challenge = await dbGet('SELECT * FROM desafios WHERE id = ?', [challenge_id]);
        if (!challenge) {
            return res.status(404).json({ error: 'Desafio não encontrado.' });
        }

        res.status(200).json(challenge);

    } catch (error) {
        console.error("Erro ao buscar detalhes do desafio:", error);
        res.status(500).json({ error: "Erro interno do servidor ao buscar detalhes do desafio." });
    }
};

export const getMyTestsListController = async (req, res) => {
    try {
        const { telegram_id } = req.query;
        if (!telegram_id) {
            return res.status(400).json({ error: 'telegram_id é obrigatório.' });
        }

        const testsList = await dbAll(
            `SELECT
                s.id_simulado,
                s.data_inicio,
                s.is_training,
                s.contexto_desafio,
                COUNT(rs.id) as total_perguntas,
                SUM(rs.acertou) as total_acertos
             FROM simulados s
             JOIN respostas_simulado rs ON s.id_simulado = rs.id_simulado
             WHERE s.telegram_id = ?
             GROUP BY s.id_simulado, s.data_inicio, s.is_training, s.contexto_desafio
             ORDER BY s.data_inicio DESC`,
            [telegram_id]
        );

        const formattedTestsList = testsList.map(test => {
            let tipo = 'Simulado';
            if (test.is_training) {
                tipo = 'Treino';
            } else if (test.contexto_desafio) {
                // Tenta extrair o ID do desafio para o tipo
                const challengeIdMatch = test.contexto_desafio.match(/desafio:(\d+)/);
                tipo = challengeIdMatch ? `Desafio ID ${challengeIdMatch[1]}` : 'Desafio';
            }

            const percentual_acerto = test.total_perguntas > 0
                ? (test.total_acertos / test.total_perguntas * 100).toFixed(2)
                : '0.00';

            return {
                id_simulado: test.id_simulado,
                data_inicio: test.data_inicio,
                tipo: tipo,
                total_perguntas: test.total_perguntas,
                total_acertos: test.total_acertos || 0,
                percentual_acerto: percentual_acerto,
                acertos_display: `${test.total_acertos || 0}/${test.total_perguntas}`
            };
        });

        res.status(200).json(formattedTestsList);

    } catch (error) {
        console.error("Erro ao buscar lista de testes do usuário:", error);
        res.status(500).json({ error: "Erro interno do servidor ao buscar lista de testes." });
    }
};

export const getTestDetailsController = async (req, res) => {
    try {
        const { id_simulado, telegram_id } = req.query; // telegram_id não é usado nesta função, mas mantido por consistência se necessário
        if (!id_simulado) {
            return res.status(400).json({ error: 'id_simulado é obrigatório.' });
        }

        const testDetails = await dbAll(
            `SELECT
                pergunta,
                resposta_usuario,
                resposta_correta,
                acertou,
                tema,
                subtema
             FROM respostas_simulado
             WHERE id_simulado = ?`,
            [id_simulado]
        );

        const simuladoInfo = await dbGet(
            `SELECT data_inicio, is_training, contexto_desafio
             FROM simulados
             WHERE id_simulado = ?`,
            [id_simulado]
        );

        let tipo = 'Simulado';
        if (simuladoInfo) {
             if (simuladoInfo.is_training) {
                tipo = 'Treino';
            } else if (simuladoInfo.contexto_desafio) {
                // Tenta extrair o ID do desafio para o tipo
                const challengeIdMatch = simuladoInfo.contexto_desafio.match(/desafio:(\d+)/);
                tipo = challengeIdMatch ? `Desafio ID ${challengeIdMatch[1]}` : 'Desafio';
            }
        }

        res.status(200).json({
            simuladoInfo: {
                 data_inicio: simuladoInfo ? simuladoInfo.data_inicio : null,
                 tipo: tipo
            },
            respostas: testDetails
        });

    } catch (error) {
        console.error("Erro ao buscar detalhes do teste:", error);
        res.status(500).json({ error: "Erro interno do servidor ao buscar detalhes do teste." });
    }
};
