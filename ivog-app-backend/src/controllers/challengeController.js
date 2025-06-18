import db from '../database/database.js';
import { promisify } from 'util';

const dbGet = promisify(db.get.bind(db));
const dbAll = promisify(db.all.bind(db));

const userMatchesTarget = (userProfile, publicoAlvo) => {
    if (!publicoAlvo || Object.keys(publicoAlvo).length === 0) {
        return true;
    }

    for (const key in publicoAlvo) {
        const ruleValues = publicoAlvo[key];
        
        if (!ruleValues || !Array.isArray(ruleValues) || ruleValues.length === 0) {
            continue;
        }

        const userValue = userProfile[key];
        
        if (!userValue || !ruleValues.includes(userValue)) {
            return false;
        }
    }
    
    return true;
};

export const getAvailableChallengesController = async (req, res) => {
    try {
        const { telegram_id } = req.query;
        if (!telegram_id) return res.status(400).json({ error: 'telegram_id é obrigatório.' });

        const userProfile = await dbGet("SELECT * FROM usuarios WHERE telegram_id = ?", [telegram_id]);
        if (!userProfile) return res.status(404).json({ error: 'Usuário não encontrado.' });
        
        // Busca desafios ativos que já começaram (independentemente da data fim neste ponto)
        const challenges = await dbAll(
            "SELECT * FROM desafios WHERE status = 'ativo' AND data_inicio <= datetime('now')"
        );
        
        const challengesWithStatus = await Promise.all(challenges.map(async (challenge) => {
            // Verifica se o desafio expirou
            const now = new Date();
            const endDate = new Date(challenge.data_fim);
            const isExpired = endDate < now;

            // Verifica se o usuário já concluiu o desafio
            // Um desafio é considerado concluído se houver um resultado associado a um simulado
            // que foi iniciado com o contexto_desafio correspondente.
            const completedCount = await dbGet(
                `SELECT COUNT(*) AS count
                 FROM simulados s
                 JOIN resultados r ON s.id_simulado = r.id_simulado
                 WHERE s.telegram_id = ? AND s.contexto_desafio = ?`,
                [telegram_id, `desafio_id:${challenge.id}`]
            );
            const isCompleted = completedCount.count > 0;

            // Verifica se o usuário corresponde ao público alvo
            let userIsTarget = false;
            try {
                const publicoAlvo = JSON.parse(challenge.publico_alvo_json);
                userIsTarget = userMatchesTarget(userProfile, publicoAlvo);
            } catch (e) {
                console.error(`Erro ao parsear JSON do desafio ID ${challenge.id}:`, e);
                userIsTarget = false; // Assume que não é público alvo se o JSON for inválido
            }

            // Inclui apenas desafios para os quais o usuário é público alvo
            if (!userIsTarget) {
                return null; // Será filtrado depois
            }

            return {
                ...challenge,
                isExpired,
                isCompleted
            };
        }));

        // Filtra desafios que não correspondem ao perfil do usuário
        const availableChallenges = challengesWithStatus.filter(challenge => challenge !== null);

        res.status(200).json(availableChallenges);

    } catch (error) {
        console.error("Erro ao buscar desafios disponíveis:", error);
        res.status(500).json({ error: "Erro interno do servidor." });
    }
};
