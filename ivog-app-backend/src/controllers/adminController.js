import db from '../database/database.js';
import { promisify } from 'util';
import { loadAllQuestions } from '../services/quizService.js';
import { sendMessageToAllUsers } from '../services/telegramService.js';

const dbGet = promisify(db.get.bind(db));
const dbAll = promisify(db.all.bind(db));
const dbRun = promisify(db.run.bind(db));

// ... (as funções getAdminConfigsController, etc. permanecem inalteradas) ...
export const getAdminConfigsController = async (req, res) => {
  try {
    const rows = await dbAll("SELECT * FROM configuracoes");
    const configs = rows.reduce((acc, row) => {
      if (row.valor === 'true') acc[row.chave] = true;
      else if (row.valor === 'false') acc[row.chave] = false;
      else if (row.valor === '' || row.valor === null) acc[row.chave] = null;
      else if (!isNaN(parseFloat(row.valor))) acc[row.chave] = Number(row.valor);
      else acc[row.chave] = row.valor;
      return acc;
    }, {});
    res.status(200).json(configs);
  } catch (error) {
    res.status(500).json({ error: "Erro interno do servidor." });
  }
};

export const toggleAdminConfigController = async (req, res) => {
  try {
    const { key } = req.params;
    const validKeys = ['simulado_livre_ativado', 'feedback_detalhado_ativo', 'desafio_ativo'];
    if (!validKeys.includes(key)) {
      return res.status(400).json({ error: "Chave de configuração inválida." });
    }
    const currentConfig = await dbGet("SELECT valor FROM configuracoes WHERE chave = ?", [key]);
    const currentValue = currentConfig ? currentConfig.valor === 'true' : false;
    const newValue = !currentValue;
    await dbRun("INSERT OR REPLACE INTO configuracoes (chave, valor) VALUES (?, ?)", [key, newValue.toString()]);
    if (key === 'desafio_ativo' && newValue === false) {
      await dbRun("INSERT OR REPLACE INTO configuracoes (chave, valor) VALUES (?, ?)", ['desafio_tipo', '']);
      await dbRun("INSERT OR REPLACE INTO configuracoes (chave, valor) VALUES (?, ?)", ['desafio_valor', '']);
    }
    res.status(200).json({ status: "success", new_value: newValue });
  } catch (error) {
    res.status(500).json({ error: "Erro interno do servidor." });
  }
};

export const setAdminConfigController = async (req, res) => {
    try {
        const { key } = req.params;
        const { value } = req.body;
        const validKeys = ['num_max_perguntas_simulado'];
        if (!validKeys.includes(key)) {
            return res.status(400).json({ error: "Chave de configuração inválida para esta operação." });
        }
        if (value === undefined) {
            return res.status(400).json({ error: "O campo 'value' é obrigatório no corpo da requisição." });
        }
        await dbRun("INSERT OR REPLACE INTO configuracoes (chave, valor) VALUES (?, ?)", [key, value.toString()]);
        res.status(200).json({ status: "success", message: `Configuração '${key}' atualizada para '${value}'.` });
    } catch (error) {
        res.status(500).json({ error: "Erro interno do servidor." });
    }
};

export const getChallengeOptionsController = async (req, res) => {
    try {
        const { type } = req.query;
        if (!type || !['tema', 'subtema', 'cargo', 'canal_principal'].includes(type)) {
            return res.status(400).json({ error: "Parâmetro 'type' inválido." });
        }
        let options = new Set();
        if (type === 'cargo' || type === 'canal_principal') {
            const rows = await dbAll(`SELECT DISTINCT ${type} FROM usuarios WHERE ${type} IS NOT NULL AND ${type} != ''`);
            rows.forEach(row => options.add(row[type]));
        } else {
            const allQuestions = await loadAllQuestions();
            allQuestions.forEach(question => {
                if (question[type] && question[type] !== 'Não especificado') {
                    options.add(question[type]);
                }
            });
        }
        res.status(200).json(Array.from(options).sort());
    } catch (error) {
        res.status(500).json({ error: "Erro interno do servidor." });
    }
};

export const activateChallengeController = async (req, res) => {
    try {
        const { tipo, valor } = req.body;
        if (!tipo || !valor || !['tema', 'subtema'].includes(tipo)) {
            return res.status(400).json({ error: "Campos 'tipo' e 'valor' são obrigatórios." });
        }
        const configUpdates = [
            dbRun("INSERT OR REPLACE INTO configuracoes (chave, valor) VALUES (?, ?)", ['desafio_ativo', 'true']),
            dbRun("INSERT OR REPLACE INTO configuracoes (chave, valor) VALUES (?, ?)", ['desafio_tipo', tipo]),
            dbRun("INSERT OR REPLACE INTO configuracoes (chave, valor) VALUES (?, ?)", ['desafio_valor', valor]),
        ];
        await Promise.all(configUpdates.map(p => p.catch(e => e)));
        const nomeFormatado = valor.replace(/_/g, ' ');
        const tipoCapitalized = tipo.charAt(0).toUpperCase() + tipo.slice(1);
        const mensagem = `🚨 <b>NOVO DESAFIO ATIVO!</b> 🚨\n\nPrepare-se! Um novo desafio foi ativado: <b>${tipoCapitalized}: ${nomeFormatado}</b>.\n\nEntre no <b>Ivo G App</b> e mostre o que você sabe! 🚀`;
        sendMessageToAllUsers(mensagem);
        res.status(200).json({ status: "success", message: "Desafio ativado e notificação enviada." });
    } catch (error) {
        res.status(500).json({ error: "Erro interno do servidor." });
    }
};

export const deactivateChallengeController = async (req, res) => {
    try {
        const configsRaw = await dbAll("SELECT chave, valor FROM configuracoes WHERE chave IN ('desafio_tipo', 'desafio_valor')");
        const configs = configsRaw.reduce((acc, row) => ({...acc, [row.chave]: row.valor }), {});
        const { desafio_tipo: tipoAntigo, desafio_valor: valorAntigo } = configs;
        if (!tipoAntigo || !valorAntigo) {
            return res.status(400).json({ status: "info", message: "Nenhum desafio ativo para desativar." });
        }
        const contextoAntigo = `${tipoAntigo}:${valorAntigo}`;
        const statsPromise = dbGet(`SELECT COUNT(DISTINCT s.telegram_id) as total_participantes, SUM(rs.acertou) as acertos, COUNT(rs.id) as respostas FROM simulados s JOIN respostas_simulado rs ON s.id_simulado = rs.id_simulado WHERE s.contexto_desafio = ?`, [contextoAntigo]);
        const top10Promise = dbAll(`SELECT u.first_name, MAX(r.pontos) as pontos FROM resultados r JOIN usuarios u ON r.telegram_id = u.telegram_id JOIN simulados s ON r.id_simulado = s.id_simulado WHERE s.contexto_desafio = ? GROUP BY r.telegram_id ORDER BY pontos DESC LIMIT 10`, [contextoAntigo]);
        const [stats, top10] = await Promise.all([statsPromise, top10Promise]);
        const taxaAcerto = stats.respostas > 0 ? (stats.acertos / stats.respostas * 100) : 0;
        let mensagem = `🚫 <b>DESAFIO ENCERRADO!</b> 🚫\n\nO desafio '${tipoAntigo}: ${valorAntigo.replace(/_/g, ' ')}' chegou ao fim.\n\n📊 <b>Estatísticas:</b>\n- Participantes: ${stats.total_participantes || 0}\n- Acerto Médio: ${taxaAcerto.toFixed(2)}%\n\n`;
        if (top10 && top10.length > 0) {
            mensagem += "🏆 <b>TOP 10:</b>\n";
            top10.forEach((p, i) => { mensagem += `${i + 1}. ${p.first_name}: ${p.pontos} pts\n`; });
        }
        sendMessageToAllUsers(mensagem);
        await Promise.all([
            dbRun("REPLACE INTO configuracoes (chave, valor) VALUES (?, ?)", ['desafio_ativo', 'false']),
            dbRun("REPLACE INTO configuracoes (chave, valor) VALUES (?, ?)", ['desafio_tipo', '']),
            dbRun("REPLACE INTO configuracoes (chave, valor) VALUES (?, ?)", ['desafio_valor', '']),
        ]);
        res.status(200).json({ status: "success", message: "Desafio desativado." });
    } catch (error) {
        res.status(500).json({ error: "Erro interno do servidor." });
    }
};

export const getAllDistinctChallengesController = async (req, res) => {
    try {
        const desafios = await dbAll(`SELECT DISTINCT contexto_desafio FROM simulados WHERE contexto_desafio IS NOT NULL AND contexto_desafio != '' ORDER BY contexto_desafio ASC`);
        res.status(200).json(desafios.map(d => d.contexto_desafio));
    } catch (error) {
        res.status(500).json({ error: "Erro interno do servidor." });
    }
};

export const getChallengeStatsController = async (req, res) => {
    try {
        const { contexto_desafio } = req.query;
        if (!contexto_desafio) return res.status(400).json({ error: "Parâmetro 'contexto_desafio' é obrigatório." });
        const statsPromise = dbGet(`SELECT MIN(s.data_inicio) as p, COUNT(DISTINCT s.telegram_id) as t, SUM(rs.acertou) as a, COUNT(rs.id) as r FROM simulados s JOIN respostas_simulado rs ON s.id_simulado = rs.id_simulado WHERE s.contexto_desafio = ?`, [contexto_desafio]);
        const top10Promise = dbAll(`SELECT u.first_name as nome, MAX(r.pontos) as pontos FROM resultados r JOIN usuarios u ON r.telegram_id = u.telegram_id JOIN simulados s ON r.id_simulado = s.id_simulado WHERE s.contexto_desafio = ? GROUP BY r.telegram_id ORDER BY pontos DESC LIMIT 10`, [contexto_desafio]);
        const [stats, top10] = await Promise.all([statsPromise, top10Promise]);
        const taxaAcerto = stats.r > 0 ? (stats.a / stats.r * 100) : 0;
        res.status(200).json({
            primeira_participacao: stats.p, total_participantes: stats.t || 0,
            total_acertos_desafio_bruto: stats.a || 0, total_respostas_desafio: stats.r || 0,
            taxa_acerto_media_bruta_formatada: `${taxaAcerto.toFixed(2)}%`, top_10_desafio_final_scores: top10,
        });
    } catch (error) {
        res.status(500).json({ error: "Erro interno do servidor." });
    }
};

export const createChallengeController = async (req, res) => {
    const { titulo, descricao, data_inicio, data_fim, status, publico_alvo, filtros, num_perguntas } = req.body;
    if (!titulo || !data_inicio || !data_fim || !publico_alvo || !filtros ) {
        return res.status(400).json({ error: 'Campos obrigatórios estão ausentes.' });
    }
    
    const publicoAlvoJson = JSON.stringify(publico_alvo);

    try {
        await dbRun('BEGIN TRANSACTION');

        const desafioId = await new Promise((resolve, reject) => {
            db.run(
                `INSERT INTO desafios (titulo, descricao, publico_alvo_json, data_inicio, data_fim, status, num_perguntas) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [titulo, descricao, publicoAlvoJson, data_inicio, data_fim, status || 'ativo', num_perguntas || 10],
                function(err) {
                    if (err) return reject(err);
                    resolve(this.lastID);
                }
            );
        });

        for (const filtro of filtros) {
            if (filtro.valor) {
                await dbRun(
                    `INSERT INTO desafio_filtros (desafio_id, tipo_filtro, valor_filtro) VALUES (?, ?, ?)`,
                    [desafioId, filtro.tipo, filtro.valor]
                );
            }
        }

        await dbRun('COMMIT');
        res.status(201).json({ message: 'Desafio criado com sucesso!', desafioId: desafioId });

    } catch (err) {
        await dbRun('ROLLBACK');
        console.error("Erro ao criar desafio:", err);
        res.status(500).json({ error: 'Falha ao criar o desafio no banco de dados.' });
    }
};

export const listChallengesController = async (req, res) => {
  try {
    const desafios = await dbAll("SELECT * FROM desafios ORDER BY data_inicio DESC");
    const desafiosComFiltros = await Promise.all(
        desafios.map(async (desafio) => {
            const filtros = await dbAll("SELECT tipo_filtro, valor_filtro FROM desafio_filtros WHERE desafio_id = ?", [desafio.id]);
            return { ...desafio, filtros };
        })
    );
    res.status(200).json(desafiosComFiltros);
  } catch (error) {
    console.error("Erro ao listar desafios:", error);
    res.status(500).json({ error: "Erro interno do servidor ao listar desafios." });
  }
};

export const updateChallengeController = async (req, res) => {
  const { id } = req.params;
  const { titulo, descricao, data_inicio, data_fim, status, publico_alvo, filtros, num_perguntas } = req.body;

  if (!titulo || !data_inicio || !data_fim || !publico_alvo || !filtros) {
    return res.status(400).json({ error: 'Campos obrigatórios estão ausentes.' });
  }

  const publicoAlvoJson = JSON.stringify(publico_alvo);
  
  try {
    await dbRun('BEGIN TRANSACTION');

    await dbRun(
        `UPDATE desafios SET titulo = ?, descricao = ?, publico_alvo_json = ?, data_inicio = ?, data_fim = ?, status = ?, num_perguntas = ? WHERE id = ?`,
        [titulo, descricao, publicoAlvoJson, data_inicio, data_fim, status, num_perguntas || 10, id]
    );

    await dbRun("DELETE FROM desafio_filtros WHERE desafio_id = ?", [id]);

    if (filtros.length > 0) {
        for (const filtro of filtros) {
             if (filtro.valor) {
                await dbRun(
                    `INSERT INTO desafio_filtros (desafio_id, tipo_filtro, valor_filtro) VALUES (?, ?, ?)`,
                    [id, filtro.tipo, filtro.valor]
                );
            }
        }
    }

    await dbRun('COMMIT');
    res.status(200).json({ message: 'Desafio atualizado com sucesso!', desafioId: id });

  } catch (err) {
      await dbRun('ROLLBACK');
      console.error("Erro ao atualizar desafio:", err);
      res.status(500).json({ error: "Falha ao atualizar o desafio no banco de dados." });
  }
};

export const deleteChallengeController = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await new Promise((resolve, reject) => {
        db.run("DELETE FROM desafios WHERE id = ?", [id], function(err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
    
    if (result.changes === 0) {
      return res.status(404).json({ error: "Desafio não encontrado." });
    }
    res.status(200).json({ message: "Desafio deletado com sucesso." });
  } catch (error) {
    console.error("Erro ao deletar desafio:", error);
    res.status(500).json({ error: "Erro interno do servidor ao deletar desafio." });
  }
};

export const getAllChallengesForDebug = async (req, res) => {
    try {
        const todosOsDesafios = await dbAll("SELECT * FROM desafios");
        res.status(200).json(todosOsDesafios);
    } catch (err) {
        console.error("Erro ao buscar desafios para debug:", err)
        res.status(500).json({ error: "Erro ao buscar desafios para debug." });
    }
};