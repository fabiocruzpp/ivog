import db from '../database/database.js';
import { promisify } from 'util';

const dbGet = promisify(db.get.bind(db));
const dbAll = promisify(db.all.bind(db));

/**
 * Controller para buscar as configurações públicas do aplicativo.
 */
export const getPublicConfigsController = async (req, res) => {
  try {
    const rows = await dbAll("SELECT * FROM configuracoes");
    const configs = rows.reduce((acc, row) => {
      // Retorna apenas as chaves seguras para o frontend
      const publicKeys = ['simulado_livre_ativado', 'feedback_detalhado_ativo', 'desafio_ativo', 'modo_treino_ativado'];
      if (publicKeys.includes(row.chave)) {
          if (row.valor === 'true') acc[row.chave] = true;
          else if (row.valor === 'false') acc[row.chave] = false;
          else acc[row.chave] = row.valor;
      }
      return acc;
    }, {});
    res.status(200).json(configs);
  } catch (error) {
    console.error("Erro ao buscar configurações públicas:", error);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
};

/**
 * Controller para buscar a configuração 'feedback_detalhado_ativo'.
 */
export const getFeedbackConfigController = async (req, res) => {
  try {
    const key = 'feedback_detalhado_ativo';
    const sql = "SELECT valor FROM configuracoes WHERE chave = ?";
    const result = await dbGet(sql, [key]);

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
    const scores = rows.map(row => row.pontos);

    res.status(200).json(scores);
  } catch (error) {
    console.error("Erro ao buscar top scores do dia:", error);
    res.status(500).json({ error: "Erro interno do servidor." });
  }
};