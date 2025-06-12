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
        
        // --- CONSULTA CORRIGIDA ---
        // Usa a função datetime('now') do SQLite para comparar com o tempo UTC atual do banco.
        const activeChallenges = await dbAll(
            "SELECT * FROM desafios WHERE status = 'ativo' AND data_inicio <= datetime('now') AND data_fim >= datetime('now')"
        );
        
        const availableChallenges = activeChallenges.filter(challenge => {
            try {
                const publicoAlvo = JSON.parse(challenge.publico_alvo_json);
                return userMatchesTarget(userProfile, publicoAlvo);
            } catch (e) { 
                console.error(`Erro ao parsear JSON do desafio ID ${challenge.id}:`, e);
                return false; 
            }
        });

        res.status(200).json(availableChallenges);

    } catch (error) {
        console.error("Erro ao buscar desafios disponíveis:", error);
        res.status(500).json({ error: "Erro interno do servidor." });
    }
};