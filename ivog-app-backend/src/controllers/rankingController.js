import db from '../database/database.js';
import { promisify } from 'util';

const dbAll = promisify(db.all.bind(db));

export const getTop10Controller = async (req, res) => {
  try {
    // 1. Extrai filtros da query string
    const { periodo, ddd_filter, canal_filter, rede_filter, loja_filter } = req.query;
    const limite = 10;

    // 2. Monta filtros de período para a consulta
    let filtroPeriodoNormais = "";
    if (periodo === 'mensal') {
      filtroPeriodoNormais = "AND strftime('%Y-%m', data) = strftime('%Y-%m', 'now', 'localtime')";
    } else if (periodo === 'semanal') {
      filtroPeriodoNormais = "AND strftime('%Y-%W', data) = strftime('%Y-%W', 'now', 'localtime')";
    }

    let filtroPeriodoDesafios = "";
    if (periodo === 'mensal') {
        filtroPeriodoDesafios = "AND strftime('%Y-%m', r_desafio.data) = strftime('%Y-%m', 'now', 'localtime')";
    } else if (periodo === 'semanal') {
        filtroPeriodoDesafios = "AND strftime('%Y-%W', r_desafio.data) = strftime('%Y-%W', 'now', 'localtime')";
    }
    
    // 3. Define a consulta SQL base completa
    const baseSql = `
      WITH PontosNormaisAgregados AS (
          SELECT
              r.telegram_id,
              SUM(r.pontos) as total_pontos_normais
          FROM (
              SELECT
                  telegram_id,
                  pontos,
                  data,
                  ROW_NUMBER() OVER (PARTITION BY telegram_id, DATE(data) ORDER BY pontos DESC) as rn
              FROM resultados
              WHERE (id_simulado IN (SELECT id_simulado FROM simulados WHERE contexto_desafio IS NULL OR contexto_desafio = ''))
          ) as r
          WHERE r.rn <= 3 ${filtroPeriodoNormais}
          GROUP BY r.telegram_id
      ),
      PontosDesafioAgregados AS (
          SELECT
              r_desafio.telegram_id,
              SUM(r_desafio.pontos) as total_pontos_desafio
          FROM resultados r_desafio
          JOIN simulados s_desafio ON r_desafio.id_simulado = s_desafio.id_simulado
          WHERE s_desafio.contexto_desafio IS NOT NULL AND s_desafio.contexto_desafio != '' ${filtroPeriodoDesafios}
          GROUP BY r_desafio.telegram_id
      )
      SELECT
          u.first_name,
          COALESCE(pna.total_pontos_normais, 0) + COALESCE(pda.total_pontos_desafio, 0) as total_pontos_combinados
      FROM usuarios u
      LEFT JOIN PontosNormaisAgregados pna ON u.telegram_id = pna.telegram_id
      LEFT JOIN PontosDesafioAgregados pda ON u.telegram_id = pda.telegram_id
    `;
    
    // 4. Monta cláusulas WHERE dinamicamente para evitar SQL Injection
    const whereClauses = [];
    const params = [];

    if (ddd_filter) {
      whereClauses.push("u.ddd = ?");
      params.push(ddd_filter);
    }
    if (canal_filter) {
      whereClauses.push("u.canal_principal = ?");
      params.push(canal_filter);
    }
    if (rede_filter) {
      whereClauses.push("u.rede_parceiro = ?");
      params.push(rede_filter);
    }
    if (loja_filter) {
      whereClauses.push("u.loja_revenda = ?");
      params.push(loja_filter);
    }
    
    let finalSql = baseSql;
    if (whereClauses.length > 0) {
      finalSql += ` WHERE ${whereClauses.join(' AND ')}`;
    }
    finalSql += ` ORDER BY total_pontos_combinados DESC, u.telegram_id ASC LIMIT ?`;
    params.push(limite);
    
    // 5. Executa a consulta e formata a resposta
    const rows = await dbAll(finalSql, params);
    const topUsers = rows.map(row => ({
        nome: row.first_name,
        pontos: row.total_pontos_combinados,
    }));

    res.status(200).json(topUsers);

  } catch (error) {
    console.error("Erro ao buscar o ranking:", error); // Adicionado para melhor log de erros
    res.status(500).json({ error: "Erro interno do servidor ao buscar ranking." });
  }
};