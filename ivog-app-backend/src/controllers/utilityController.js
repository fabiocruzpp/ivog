import db from '../database/database.js';
import { promisify } from 'util';

const dbGet = promisify(db.get.bind(db));
const dbAll = promisify(db.all.bind(db));

/**
 * Controller para buscar a configuração 'feedback_detalhado_ativo'.
 */
export const getFeedbackConfigController = async (req, res) => {
  try {
    const key = 'feedback_detalhado_ativo';
    const sql = "SELECT valor FROM configuracoes WHERE chave = ?";
    const result = await dbGet(sql, [key]);

    // O valor no banco é uma string 'true' ou 'false'. Convertemos para booleano.
    const isActive = result ? result.valor === 'true' : false;

    res.status(200).json({ value: isActive });
  } catch (error) {
    console.error("Erro ao buscar configuração de feedback:", error);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
};

/**
 * Controller para buscar as 3 melhores pontuações de um usuário no dia atual.
 */
export const getTopScoresTodayController = async (req, res) => {
  try {
    const { telegram_id } = req.query;
    if (!telegram_id) {
      return res.status(400).json({ error: 'telegram_id é obrigatório.' });
    }

    // A função DATE('now', 'localtime') do SQLite pega a data atual no fuso do servidor.
    const sql = `
      SELECT r.pontos
      FROM resultados r
      JOIN simulados s ON r.id_simulado = s.id_simulado
      WHERE r.telegram_id = ?
        AND DATE(r.data) = DATE('now', 'localtime')
        AND (s.contexto_desafio IS NULL OR s.contexto_desafio = '')
      ORDER BY r.pontos DESC
      LIMIT 3
    `;

    const rows = await dbAll(sql, [telegram_id]);

    // O resultado 'rows' é um array de objetos. Usamos map para extrair apenas os pontos.
    const scores = rows.map(row => row.pontos);

    res.status(200).json(scores);
  } catch (error) {
    console.error("Erro ao buscar top scores do dia:", error);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
};