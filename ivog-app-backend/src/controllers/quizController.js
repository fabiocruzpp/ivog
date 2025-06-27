import db from '../database/database.js';
import { promisify } from 'util';
import { loadAllQuestions } from '../services/quizService.js';

const dbGet = promisify(db.get.bind(db));
const dbAll = promisify(db.all.bind(db));
const dbRun = promisify(db.run.bind(db));

export const getAvailableThemesController = async (req, res) => {
    try {
        const { telegram_id } = req.query;
        if (!telegram_id) return res.status(400).json({ error: 'telegram_id é obrigatório.' });

        const user = await dbGet("SELECT cargo, canal_principal FROM usuarios WHERE telegram_id = ?", [telegram_id]);
        if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });
        
        const allQuestions = await loadAllQuestions();

        const userAvailableQuestions = allQuestions.filter(q => 
            q.is_active === 1 && // <-- FILTRO ADICIONADO AQUI
            (q.canal.length === 0 || q.canal.includes(user.canal_principal)) && 
            (q.publico.length === 0 || q.publico.includes(user.cargo)) &&
            (q.tema && q.tema !== 'Não especificado')
        );

        const availableThemes = [...new Set(userAvailableQuestions.map(q => q.tema))];

        res.status(200).json(availableThemes.sort());

    } catch (error) {
        console.error("Erro ao buscar temas disponíveis:", error);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

export const startQuizController = async (req, res) => {
  try {
    console.log('[START QUIZ CONTROLLER] Requisição recebida com params:', req.query);
    
    const { telegram_id, cargo, canal_principal, desafio_id, temas, is_training } = req.query;
    if (!telegram_id || !cargo || !canal_principal) {
      console.log('[START QUIZ CONTROLLER] Parâmetros obrigatórios ausentes');
      return res.status(400).json({ error: 'Parâmetros obrigatórios ausentes.' });
    }

    const allQuestionsRaw = await loadAllQuestions();
    const allQuestions = allQuestionsRaw.filter(q => q.is_active === 1);
    
    let quizQuestions = [];
    const isTrainingMode = is_training === 'true';

    if (desafio_id) {
      const challenge = await dbGet("SELECT * FROM desafios WHERE id = ?", [desafio_id]);
      if (!challenge) return res.status(404).json({ message: "Desafio não encontrado." });
      
      const now = new Date();
      if (challenge.status !== 'ativo' || now < new Date(challenge.data_inicio) || now > new Date(challenge.data_fim)) {
           return res.status(400).json({ message: "Desafio não está ativo." });
      }

      const completedCount = await dbGet(`SELECT COUNT(*) AS count FROM simulados s JOIN resultados r ON s.id_simulado = r.id_simulado WHERE s.telegram_id = ? AND s.contexto_desafio = ?`, [telegram_id, `desafio_id:${desafio_id}`]);
      if (completedCount.count > 0) return res.status(400).json({ message: "Você já concluiu este desafio." });
      
      // --- INÍCIO DA ALTERAÇÃO ---
      // Prioriza a seleção manual de perguntas
      if (challenge.perguntas_ids) {
          const questionIds = JSON.parse(challenge.perguntas_ids);
          if (questionIds.length > 0) {
              const placeholders = questionIds.map(() => '?').join(',');
              // Busca diretamente as perguntas selecionadas no banco
              quizQuestions = await dbAll(`SELECT * FROM perguntas WHERE id IN (${placeholders}) AND is_active = 1`, questionIds);
              quizQuestions = quizQuestions.map(q => ({ // Garante que os campos JSON sejam parseados
                  ...q,
                  alternativas: JSON.parse(q.alternativas || '[]'),
                  publico: JSON.parse(q.publico || '[]'),
                  canal: JSON.parse(q.canal || '[]'),
              }));
          }
      }
      
      // Se não houver perguntas manuais, usa o filtro por tema/subtema
      if (quizQuestions.length === 0) {
          const challengeFilters = await dbAll("SELECT tipo_filtro, valor_filtro FROM desafio_filtros WHERE desafio_id = ?", [desafio_id]);
          const temaFiltro = challengeFilters.find(f => f.tipo_filtro === 'tema')?.valor_filtro;
          const subtemaFiltro = challengeFilters.find(f => f.tipo_filtro === 'subtema')?.valor_filtro;
          
          let filteredQuestions = allQuestions;
          if (temaFiltro) filteredQuestions = filteredQuestions.filter(q => q.tema === temaFiltro);
          if (subtemaFiltro) filteredQuestions = filteredQuestions.filter(q => q.subtema === subtemaFiltro);
          
          quizQuestions = filteredQuestions.sort(() => 0.5 - Math.random()).slice(0, challenge.num_perguntas);
      }
      // --- FIM DA ALTERAÇÃO ---

    } else {
      let userFilteredQuestions = allQuestions.filter(q => 
          (q.canal.length === 0 || q.canal.includes(canal_principal)) && 
          (q.publico.length === 0 || q.publico.includes(cargo))
      );
      
      if (isTrainingMode && temas) {
          const selectedThemes = temas.split(',');
          userFilteredQuestions = userFilteredQuestions.filter(q => selectedThemes.includes(q.tema));
      }

      if (userFilteredQuestions.length === 0) return res.status(404).json({ message: "Não há perguntas disponíveis para seu perfil e filtros selecionados." });
      
      const config = await dbGet("SELECT valor FROM configuracoes WHERE chave = 'num_max_perguntas_simulado'");
      const maxQuestions = config ? parseInt(config.valor, 10) : 20;
      
      quizQuestions = userFilteredQuestions.sort(() => 0.5 - Math.random()).slice(0, maxQuestions);
    }

    if (quizQuestions.length === 0) {
        return res.status(404).json({ message: "Nenhuma pergunta encontrada para os critérios." });
    }

    res.json({
      total_perguntas_no_simulado: quizQuestions.length,
      questions: quizQuestions,
      is_training: isTrainingMode,
    });
  } catch (error) {
    console.error("[START QUIZ CONTROLLER] Erro ao iniciar quiz:", error);
    res.status(500).json({ error: 'Erro interno do servidor ao iniciar quiz.' });
  }
};

export const saveAnswerController = async (req, res) => {
  try {
    let { simulado_id, telegram_id, acertou, is_training, contexto_desafio, ...rest } = req.body;
    
    if (telegram_id === undefined || acertou === undefined) {
      return res.status(400).json({ error: 'Campos obrigatórios ausentes.' });
    }
    
    let newSimuladoId = null;

    if (!simulado_id) {
        const result = await new Promise((resolve, reject) => {
            db.run(
                "INSERT INTO simulados (telegram_id, data_inicio, is_training, contexto_desafio) VALUES (?, ?, ?, ?)",
                [telegram_id, new Date().toISOString(), !!is_training, contexto_desafio || null],
                function(err) {
                    if (err) return reject(err);
                    resolve(this);
                }
            );
        });

        simulado_id = result.lastID;
        newSimuladoId = simulado_id;
        console.log(`[SAVE ANSWER CONTROLLER] Novo simulado criado com ID: ${simulado_id}`);
    }
    
    const sql = `INSERT INTO respostas_simulado (id_simulado, telegram_id, pergunta, resposta_usuario, resposta_correta, acertou, data, tema, subtema) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const params = [simulado_id, telegram_id, rest.pergunta, rest.resposta_usuario, rest.resposta_correta, acertou, new Date().toISOString(), rest.tema, rest.subtema];
    
    await dbRun(sql, params);
    
    res.status(200).json({ status: "success", message: "Resposta registrada.", newSimuladoId });
  } catch (error) {
    console.error('[SAVE ANSWER CONTROLLER] Erro:', error);
    res.status(500).json({ error: 'Erro interno do servidor ao salvar resposta.' });
  }
};

export const finishQuizController = async (req, res) => {
  try {
    console.log('[FINISH QUIZ CONTROLLER] Requisição recebida:', req.body);
    
    const { telegram_id, simulado_id, num_acertos, total_perguntas } = req.body;
    if ([telegram_id, simulado_id, num_acertos, total_perguntas].some(f => f === undefined)) {
      return res.status(400).json({ error: 'Campos obrigatórios ausentes.' });
    }

    const simulado = await dbGet("SELECT is_training, contexto_desafio FROM simulados WHERE id_simulado = ?", [simulado_id]);
    const isChallenge = !!simulado?.contexto_desafio;

    if (simulado && simulado.is_training) {
      return res.status(200).json({
        status: "success",
        is_training: true,
        is_challenge: isChallenge,
        pontuacao_base: 0,
        pontuacao_final_com_bonus: 0,
        num_acertos,
        total_perguntas
      });
    }

    const pontuacao_base = num_acertos * 10;
    let pontos_finais_com_bonus = pontuacao_base;
    const percentual_acerto = total_perguntas > 0 ? (num_acertos / total_perguntas) * 100 : 0;
    
    if (percentual_acerto >= 90) pontos_finais_com_bonus *= 1.20;
    else if (percentual_acerto >= 80) pontos_finais_com_bonus *= 1.10;
    else if (percentual_acerto >= 70) pontos_finais_com_bonus *= 1.05;
    
    const pontos_finais_truncados = Math.floor(pontos_finais_com_bonus);
    
    await dbRun(`INSERT INTO resultados (telegram_id, id_simulado, pontos, total_perguntas, data) VALUES (?, ?, ?, ?, ?)`,
        [telegram_id, simulado_id, pontos_finais_truncados, total_perguntas, new Date().toISOString()]);
    
    res.status(200).json({ 
      status: "success", 
      is_training: false,
      is_challenge: isChallenge,
      pontuacao_base, 
      pontuacao_final_com_bonus: pontos_finais_truncados, 
      num_acertos, 
      total_perguntas 
    });
  } catch (error) {
    console.error("[FINISH QUIZ CONTROLLER] Erro ao finalizar quiz:", error);
    res.status(500).json({ error: 'Erro interno do servidor ao finalizar quiz.' });
  }
};