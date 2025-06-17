import db from '../database/database.js';
import { promisify } from 'util';
import { loadAllQuestions } from '../services/quizService.js';

const dbGet = promisify(db.get.bind(db));
const dbAll = promisify(db.all.bind(db));
const dbRun = promisify(db.run.bind(db));

// NOVO CONTROLLER
export const getAvailableThemesController = async (req, res) => {
    try {
        const { telegram_id } = req.query;
        if (!telegram_id) return res.status(400).json({ error: 'telegram_id é obrigatório.' });

        const user = await dbGet("SELECT cargo, canal_principal FROM usuarios WHERE telegram_id = ?", [telegram_id]);
        if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });
        
        const allQuestions = await loadAllQuestions();

        const userAvailableQuestions = allQuestions.filter(q => 
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

    const allQuestions = await loadAllQuestions();
    console.log('[START QUIZ CONTROLLER] Total de perguntas carregadas:', allQuestions.length);
    
    let quizQuestions = [];
    let contextoDesafio = null;
    const isTrainingMode = is_training === 'true';

    if (desafio_id) {
      // Lógica de desafio permanece a mesma
      contextoDesafio = `desafio_id:${desafio_id}`;
      const challenge = await dbGet("SELECT * FROM desafios WHERE id = ?", [desafio_id]);
      if (!challenge) return res.status(404).json({ message: "Desafio não encontrado." });
      const challengeFilters = await dbAll("SELECT tipo_filtro, valor_filtro FROM desafio_filtros WHERE desafio_id = ?", [desafio_id]);
      if (challengeFilters.length === 0) return res.status(404).json({ message: "Desafio inválido." });
      const temaFiltro = challengeFilters.find(f => f.tipo_filtro === 'tema')?.valor_filtro;
      const subtemaFiltro = challengeFilters.find(f => f.tipo_filtro === 'subtema')?.valor_filtro;
      let filteredQuestions = allQuestions;
      if (temaFiltro) filteredQuestions = filteredQuestions.filter(q => q.tema === temaFiltro);
      if (subtemaFiltro) filteredQuestions = filteredQuestions.filter(q => q.subtema === subtemaFiltro);
      quizQuestions = filteredQuestions.sort(() => 0.5 - Math.random()).slice(0, challenge.num_perguntas);

    } else {
      // Lógica para Simulado Livre e Modo Treino
      let userFilteredQuestions = allQuestions.filter(q => 
          (q.canal.length === 0 || q.canal.includes(canal_principal)) && 
          (q.publico.length === 0 || q.publico.includes(cargo))
      );
      
      console.log('[START QUIZ CONTROLLER] Perguntas filtradas por perfil:', userFilteredQuestions.length);
      
      // Filtro adicional para Modo Treino
      if (isTrainingMode && temas) {
          const selectedThemes = temas.split(',');
          userFilteredQuestions = userFilteredQuestions.filter(q => selectedThemes.includes(q.tema));
          console.log('[START QUIZ CONTROLLER] Perguntas filtradas por tema:', userFilteredQuestions.length);
      }

      if (userFilteredQuestions.length === 0) {
        console.log('[START QUIZ CONTROLLER] Nenhuma pergunta disponível');
        return res.status(404).json({ message: "Não há perguntas disponíveis para seu perfil e filtros selecionados." });
      }
      
      quizQuestions = userFilteredQuestions.sort(() => 0.5 - Math.random()).slice(0, 20);
    }

    if (quizQuestions.length === 0) {
        console.log('[START QUIZ CONTROLLER] Nenhuma pergunta encontrada para os critérios');
        return res.status(404).json({ message: "Nenhuma pergunta encontrada para os critérios." });
    }

    const dataInicio = new Date().toISOString();
    
    // CORREÇÃO: Usando um wrapper de Promise para capturar o lastID
    const result = await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO simulados (telegram_id, data_inicio, contexto_desafio, is_training) VALUES (?, ?, ?, ?)`,
          [telegram_id, dataInicio, contextoDesafio, isTrainingMode],
          function(err) {
            if (err) return reject(err);
            resolve(this); // 'this' contém lastID e changes
          }
        );
    });

    console.log('[START QUIZ CONTROLLER] Simulado criado com ID:', result.lastID);
    console.log('[START QUIZ CONTROLLER] Total de perguntas no quiz:', quizQuestions.length);

    res.json({
      simulado_id: result.lastID,
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
    console.log('[SAVE ANSWER CONTROLLER] Requisição recebida:', req.body);
    
    const { simulado_id, telegram_id, acertou, ...rest } = req.body;
    if (simulado_id === undefined || telegram_id === undefined || acertou === undefined) {
      console.log('[SAVE ANSWER CONTROLLER] Campos obrigatórios ausentes');
      return res.status(400).json({ error: 'Campos obrigatórios ausentes.' });
    }
    
    const sql = `INSERT INTO respostas_simulado (id_simulado, telegram_id, pergunta, resposta_usuario, resposta_correta, acertou, data, tema, subtema) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const params = [simulado_id, telegram_id, rest.pergunta, rest.resposta_usuario, rest.resposta_correta, acertou, new Date().toISOString(), rest.tema, rest.subtema];
    
    await dbRun(sql, params);
    console.log('[SAVE ANSWER CONTROLLER] Resposta salva com sucesso');
    
    res.status(200).json({ status: "success", message: "Resposta registrada." });
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
      console.log('[FINISH QUIZ CONTROLLER] Campos obrigatórios ausentes');
      return res.status(400).json({ error: 'Campos obrigatórios ausentes.' });
    }

    const simulado = await dbGet("SELECT is_training FROM simulados WHERE id_simulado = ?", [simulado_id]);
    console.log('[FINISH QUIZ CONTROLLER] Simulado encontrado:', simulado);

    if (simulado && simulado.is_training) {
      console.log('[FINISH QUIZ CONTROLLER] Modo treino - não salvando pontuação');
      return res.status(200).json({
        status: "success",
        is_training: true,
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
    
    console.log('[FINISH QUIZ CONTROLLER] Resultado salvo com sucesso');
    
    res.status(200).json({ 
      status: "success", 
      is_training: false,
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
