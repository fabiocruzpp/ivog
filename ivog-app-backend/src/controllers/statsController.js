import db from '../database/database.js';
import { promisify } from 'util';

// Promisificamos os métodos do DB para usar async/await
const dbGet = promisify(db.get.bind(db));
const dbAll = promisify(db.all.bind(db));

export const getMyStatsController = async (req, res) => {
  try {
    // 1. Pega o telegram_id da query string
    const { telegram_id } = req.query;
    if (!telegram_id) {
      return res.status(400).json({ error: 'telegram_id é obrigatório.' });
    }

    // 2. Prepara todas as consultas em paralelo
    const totalSimuladosPromise = dbGet(
      "SELECT COUNT(DISTINCT id_simulado) as count FROM simulados WHERE telegram_id = ?",
      [telegram_id]
    );

    const globalStatsPromise = dbGet(
      "SELECT COUNT(*) as total_respostas, SUM(acertou) as total_acertos FROM respostas_simulado WHERE telegram_id = ?",
      [telegram_id]
    );

    const temaPerformancePromise = dbAll(
      `SELECT tema as categoria_valor, SUM(acertou) as acertos_brutos, COUNT(*) as total_respostas
       FROM respostas_simulado
       WHERE telegram_id = ? AND tema IS NOT NULL AND tema != '' AND tema != 'Não especificado'
       GROUP BY tema ORDER BY tema`,
      [telegram_id]
    );

    const subtemaPerformancePromise = dbAll(
      `SELECT subtema as categoria_valor, SUM(acertou) as acertos_brutos, COUNT(*) as total_respostas
       FROM respostas_simulado
       WHERE telegram_id = ? AND subtema IS NOT NULL AND subtema != '' AND subtema != 'Não especificado'
       GROUP BY subtema ORDER BY subtema`,
      [telegram_id]
    );

    const desafiosParticipadosPromise = dbAll(
      `SELECT contexto_desafio FROM simulados
       WHERE telegram_id = ? AND contexto_desafio IS NOT NULL AND contexto_desafio != ''
       GROUP BY contexto_desafio
       ORDER BY MAX(data_inicio) DESC`,
      [telegram_id]
    );

    // 3. Executa todas as promises em paralelo
    const [
      totalSimuladosResult,
      globalStatsResult,
      desempenhoTemasResult,
      desempenhoSubtemasResult,
      desafiosParticipadosResult,
    ] = await Promise.all([
      totalSimuladosPromise,
      globalStatsPromise,
      temaPerformancePromise,
      subtemaPerformancePromise,
      desafiosParticipadosPromise,
    ]);

    // 4. Formata os resultados para a resposta final
    const total_acertos = globalStatsResult.total_acertos || 0;
    const total_respostas = globalStatsResult.total_respostas || 0;
    const percentual_geral_acerto = total_respostas > 0 ? (total_acertos / total_respostas * 100) : 0;

    const desempenho_temas_formatado = desempenhoTemasResult.map(item => ({
      tema: item.categoria_valor,
      acertos_brutos: item.acertos_brutos || 0,
      total_respostas: item.total_respostas,
      percentual_acerto_bruto: item.total_respostas > 0 ? parseFloat((item.acertos_brutos / item.total_respostas * 100).toFixed(2)) : 0,
    }));
    
    const desempenho_subtemas_formatado = desempenhoSubtemasResult.map(item => ({
          subtema: item.categoria_valor,
          acertos_brutos: item.acertos_brutos || 0,
          total_respostas: item.total_respostas,
          percentual_acerto_bruto: item.total_respostas > 0 ? parseFloat((item.acertos_brutos / item.total_respostas * 100).toFixed(2)) : 0,
    }));

    // 5. Envia a resposta consolidada
    res.status(200).json({
      total_simulados_realizados: totalSimuladosResult.count || 0,
      total_respostas_geral: total_respostas,
      total_acertos_geral_bruto: total_acertos,
      percentual_acerto_geral_formatado: percentual_geral_acerto.toFixed(2),
      desempenho_temas: desempenho_temas_formatado,
      desempenho_subtemas: desempenho_subtemas_formatado,
      desafios_participados: desafiosParticipadosResult.map(d => d.contexto_desafio),
    });

  } catch (error) {
    console.error("Erro ao buscar estatísticas do usuário:", error);
    res.status(500).json({ error: "Erro interno do servidor ao buscar estatísticas." });
  }
};

export const getMyChallengeDetailsController = async (req, res) => {
    try {
        const { telegram_id } = req.query;
        if (!telegram_id) {
            return res.status(400).json({ error: 'telegram_id é obrigatório.' });
        }

        const desafios = await dbAll(
            `SELECT DISTINCT contexto_desafio FROM simulados WHERE telegram_id = ? AND contexto_desafio IS NOT NULL AND contexto_desafio != '' ORDER BY data_inicio DESC`,
            [telegram_id]
        );

        if (desafios.length === 0) {
            return res.json([]);
        }

        const challengeDetailsPromises = desafios.map(async (desafio) => {
            const contexto = desafio.contexto_desafio;
            // Extrai o ID do desafio a partir do contexto
            const challengeId = contexto.split(':')[1];

            // Busca o título correto na tabela 'desafios'
            const titlePromise = dbGet("SELECT titulo FROM desafios WHERE id = ?", [challengeId]);
            
            const statsPromise = dbGet(
                `SELECT COUNT(*) as tr, SUM(acertou) as ta_bruto FROM respostas_simulado
                 WHERE telegram_id = ? AND id_simulado IN (SELECT id_simulado FROM simulados WHERE contexto_desafio = ?)`,
                [telegram_id, contexto]
            );

            const rankPromise = dbAll(
                `SELECT r.telegram_id, MAX(r.pontos) as max_pontos_desafio FROM resultados r
                 JOIN simulados s ON r.id_simulado = s.id_simulado
                 WHERE s.contexto_desafio = ? GROUP BY r.telegram_id ORDER BY max_pontos_desafio DESC, MAX(r.data) DESC`,
                [contexto]
            );

            // Executa as buscas em paralelo
            const [desafioInfo, stats, allRanks] = await Promise.all([titlePromise, statsPromise, rankPromise]);

            let userRank = "N/A", userMaxPoints = 0;
            const rankIndex = allRanks.findIndex(rank => rank.telegram_id == telegram_id);
            if (rankIndex !== -1) {
                userRank = (rankIndex + 1).toString();
                userMaxPoints = allRanks[rankIndex].max_pontos_desafio || 0;
            }

            const totalAcertos = stats.ta_bruto || 0;
            const totalRespostas = stats.tr || 0;
            const percentualAcerto = totalRespostas > 0 ? (totalAcertos / totalRespostas * 100) : 0;
            
            // Retorna o objeto com o título correto
            return {
                contexto_desafio: contexto,
                titulo_desafio: desafioInfo ? desafioInfo.titulo : contexto.replace(/.*:/,'').replace(/_/g, ' '),
                total_perguntas_no_desafio: totalRespostas,
                total_acertos_brutos_no_desafio: totalAcertos,
                percentual_acerto_bruto_formatado: percentualAcerto.toFixed(2),
                pontuacao_final_maxima_usuario: userMaxPoints,
                rank_usuario_no_desafio: userRank,
            };
        });

        const challenges_details_list = await Promise.all(challengeDetailsPromises);
        res.status(200).json(challenges_details_list);

    } catch (error) {
        console.error("Erro ao buscar detalhes dos desafios do usuário:", error);
        res.status(500).json({ error: "Erro interno do servidor." });
    }
};

export const getChallengeDetailsController = async (req, res) => {
    try {
        const { contexto_desafio, telegram_id } = req.query;
        if (!contexto_desafio) {
            return res.status(400).json({ error: 'contexto_desafio é obrigatório.' });
        }

        const generalStatsPromise = dbGet(
            `SELECT COUNT(DISTINCT telegram_id) as total_participantes, SUM(acertou) as total_acertos_desafio_bruto, COUNT(rs.id) as total_respostas_desafio
             FROM simulados s JOIN respostas_simulado rs ON s.id_simulado = rs.id_simulado
             WHERE s.contexto_desafio = ?`,
            [contexto_desafio]
        );

        const top10Promise = dbAll(
            `SELECT u.first_name, MAX(r.pontos) as max_pontos_desafio FROM resultados r
             JOIN usuarios u ON r.telegram_id = u.telegram_id
             JOIN simulados s ON r.id_simulado = s.id_simulado
             WHERE s.contexto_desafio = ?
             GROUP BY r.telegram_id, u.first_name ORDER BY max_pontos_desafio DESC LIMIT 10`,
            [contexto_desafio]
        );

        let userSpecificPromises = [];
        if (telegram_id) {
            const userStatsPromise = dbGet(
                `SELECT COUNT(*) as tr, SUM(acertou) as ta_bruto FROM respostas_simulado
                 WHERE telegram_id = ? AND id_simulado IN (SELECT id_simulado FROM simulados WHERE contexto_desafio = ?)`,
                [telegram_id, contexto_desafio]
            );
            const userRankPromise = dbAll(
                `SELECT r.telegram_id, MAX(r.pontos) as max_pontos_desafio FROM resultados r
                 JOIN simulados s ON r.id_simulado = s.id_simulado
                 WHERE s.contexto_desafio = ? GROUP BY r.telegram_id ORDER BY max_pontos_desafio DESC`,
                [contexto_desafio]
            );
            userSpecificPromises = [userStatsPromise, userRankPromise];
        }

        const [
            generalStats,
            top10,
            ...userSpecificResults
        ] = await Promise.all([
            generalStatsPromise,
            top10Promise,
            ...userSpecificPromises
        ]);

        const taxaAcertoMedia = generalStats.total_respostas_desafio > 0
            ? (generalStats.total_acertos_desafio_bruto / generalStats.total_respostas_desafio * 100)
            : 0;

        const responseData = {
            contexto_desafio: contexto_desafio,
            general_challenge_stats: {
                total_participantes_unicos: generalStats.total_participantes || 0,
                taxa_acerto_media_bruta_geral_formatada: `${taxaAcertoMedia.toFixed(2)}%`,
            },
            top_10_challenge_final_scores: top10.map(u => ({ nome: u.first_name, pontos: u.max_pontos_desafio })),
            user_specific_stats: null
        };
        
        if (telegram_id && userSpecificResults.length > 0) {
            const [userStats, allRanks] = userSpecificResults;
            
            let userRank = "N/A", userMaxPoints = 0;
            const rankIndex = allRanks.findIndex(rank => rank.telegram_id == telegram_id);
            if (rankIndex !== -1) {
                userRank = (rankIndex + 1).toString();
                userMaxPoints = allRanks[rankIndex].max_pontos_desafio || 0;
            }

            const userTotalAcertos = userStats.ta_bruto || 0;
            const userTotalRespostas = userStats.tr || 0;
            const userPercentual = userTotalRespostas > 0 ? (userTotalAcertos / userTotalRespostas * 100) : 0;

            responseData.user_specific_stats = {
                total_acertos_brutos_usuario: userTotalAcertos,
                percentual_acerto_bruto_usuario_formatado: `${userPercentual.toFixed(2)}%`,
                pontuacao_final_maxima_usuario_desafio: userMaxPoints,
                rank_usuario_no_desafio: userRank
            };
        }

        res.status(200).json(responseData);

    } catch (error) {
        console.error("Erro ao buscar detalhes do desafio:", error);
        res.status(500).json({ error: "Erro interno do servidor." });
    }
};