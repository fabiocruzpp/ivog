import db from '../database/database.js';
import { promisify } from 'util';
import { loadAllQuestions } from '../services/quizService.js';

const dbGet = promisify(db.get.bind(db));
const dbRun = promisify(db.run.bind(db));

export const startQuizController = async (req, res) => {
  try {
    const { telegram_id, cargo, canal_principal } = req.query;
    if (!telegram_id || !cargo || !canal_principal) return res.status(400).json({ error: 'Parâmetros obrigatórios ausentes.' });

    const allQuestions = await loadAllQuestions();
    
    const userFilteredQuestions = allQuestions.filter(q => 
        (q.canal.length === 0 || q.canal.includes(canal_principal)) && 
        (q.publico.length === 0 || q.publico.includes(cargo))
    );

    if (userFilteredQuestions.length === 0) return res.status(404).json({ message: "Não há perguntas disponíveis para seu perfil." });

    const quizQuestions = userFilteredQuestions.sort(() => 0.5 - Math.random()).slice(0, 20);

    const dataInicio = new Date().toISOString();
    const result = await new Promise((resolve, reject) => {
        db.run(`INSERT INTO simulados (telegram_id, data_inicio, contexto_desafio) VALUES (?, ?, ?)`,
            [telegram_id, dataInicio, null], function(err) {
            if (err) reject(err); else resolve({ lastID: this.lastID });
        });
    });
    const simulado = await dbGet('SELECT id_simulado FROM simulados WHERE rowid = ?', [result.lastID]);

    res.json({
      simulado_id: simulado.id_simulado,
      total_perguntas_no_simulado: quizQuestions.length,
      questions: quizQuestions,
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro interno do servidor ao iniciar quiz.' });
  }
};

export const saveAnswerController = async (req, res) => {
  try {
    const { simulado_id, telegram_id, acertou, ...rest } = req.body;
    if (simulado_id === undefined || telegram_id === undefined || acertou === undefined) {
      return res.status(400).json({ error: 'Campos obrigatórios ausentes.' });
    }
    const sql = `INSERT INTO respostas_simulado (id_simulado, telegram_id, pergunta, resposta_usuario, resposta_correta, acertou, data, tema, subtema) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const params = [simulado_id, telegram_id, rest.pergunta, rest.resposta_usuario, rest.resposta_correta, acertou, new Date().toISOString(), rest.tema, rest.subtema];
    await dbRun(sql, params);
    res.status(200).json({ status: "success", message: "Resposta registrada." });
  } catch (error) {
    res.status(500).json({ error: 'Erro interno do servidor ao salvar resposta.' });
  }
};

export const finishQuizController = async (req, res) => {
  try {
    const { telegram_id, simulado_id, num_acertos, total_perguntas } = req.body;
    if ([telegram_id, simulado_id, num_acertos, total_perguntas].some(f => f === undefined)) return res.status(400).json({ error: 'Campos obrigatórios ausentes.' });

    const pontuacao_base = num_acertos * 10;
    let pontos_finais_com_bonus = pontuacao_base;
    const percentual_acerto = total_perguntas > 0 ? (num_acertos / total_perguntas) * 100 : 0;
    if (percentual_acerto >= 90) pontos_finais_com_bonus *= 1.20;
    else if (percentual_acerto >= 80) pontos_finais_com_bonus *= 1.10;
    else if (percentual_acerto >= 70) pontos_finais_com_bonus *= 1.05;
    
    const pontos_finais_truncados = Math.floor(pontos_finais_com_bonus);
    
    await dbRun(`INSERT INTO resultados (telegram_id, id_simulado, pontos, total_perguntas, data) VALUES (?, ?, ?, ?, ?)`,
        [telegram_id, simulado_id, pontos_finais_truncados, total_perguntas, new Date().toISOString()]);
    
    res.status(200).json({ status: "success", pontuacao_base, pontuacao_final_com_bonus: pontos_finais_truncados, num_acertos, total_perguntas });
  } catch (error) {
    res.status(500).json({ error: 'Erro interno do servidor ao finalizar quiz.' });
  }
};
