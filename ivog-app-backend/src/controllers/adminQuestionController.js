import db from '../database/database.js';
import { promisify } from 'util';
import { clearQuestionsCache } from '../services/quizService.js';

const dbAll = promisify(db.all.bind(db));
const dbGet = promisify(db.get.bind(db));
const dbRun = promisify(db.run.bind(db));

// Listar todas as perguntas
export const listQuestionsController = async (req, res) => {
    try {
        const questions = await dbAll("SELECT * FROM perguntas ORDER BY id DESC");
        // Converte os campos JSON de volta para arrays para o frontend
        const parsedQuestions = questions.map(q => ({
            ...q,
            alternativas: JSON.parse(q.alternativas || '[]'),
            publico: JSON.parse(q.publico || '[]'),
            canal: JSON.parse(q.canal || '[]'),
        }));
        res.status(200).json(parsedQuestions);
    } catch (error) {
        console.error("Erro ao listar perguntas:", error);
        res.status(500).json({ error: "Erro interno do servidor." });
    }
};

// Criar uma nova pergunta
export const createQuestionController = async (req, res) => {
    const {
        pergunta_formatada_display, alternativas, correta, publico, canal,
        tema, subtema, feedback, fonte
    } = req.body;

    if (!pergunta_formatada_display || !alternativas || !correta || !tema) {
        return res.status(400).json({ error: "Campos obrigatórios (pergunta, alternativas, correta, tema) estão ausentes." });
    }

    try {
        const sql = `INSERT INTO perguntas (
            pergunta_formatada_display, alternativas, correta, publico, canal, 
            tema, subtema, feedback, fonte
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        const params = [
            pergunta_formatada_display, JSON.stringify(alternativas || []), correta,
            JSON.stringify(publico || []), JSON.stringify(canal || []),
            tema, subtema || '', feedback || '', fonte || ''
        ];

        const result = await new Promise((resolve, reject) => {
            db.run(sql, params, function (err) {
                if (err) return reject(err);
                resolve({ id: this.lastID });
            });
        });

        clearQuestionsCache();
        res.status(201).json({ message: "Pergunta criada com sucesso!", id: result.id });
    } catch (error) {
        console.error("Erro ao criar pergunta:", error);
        res.status(500).json({ error: "Erro interno do servidor." });
    }
};

// Atualizar uma pergunta existente
export const updateQuestionController = async (req, res) => {
    const { id } = req.params;
    const {
        pergunta_formatada_display, alternativas, correta, publico, canal,
        tema, subtema, feedback, fonte
    } = req.body;

    if (!pergunta_formatada_display || !alternativas || !correta || !tema) {
        return res.status(400).json({ error: "Campos obrigatórios (pergunta, alternativas, correta, tema) estão ausentes." });
    }

    try {
        const sql = `UPDATE perguntas SET 
            pergunta_formatada_display = ?, alternativas = ?, correta = ?, publico = ?, canal = ?, 
            tema = ?, subtema = ?, feedback = ?, fonte = ?
            WHERE id = ?`;
        
        const params = [
            pergunta_formatada_display, JSON.stringify(alternativas || []), correta,
            JSON.stringify(publico || []), JSON.stringify(canal || []),
            tema, subtema || '', feedback || '', fonte || '',
            id
        ];

        await dbRun(sql, params);

        clearQuestionsCache();
        res.status(200).json({ message: "Pergunta atualizada com sucesso!" });
    } catch (error) {
        console.error("Erro ao atualizar pergunta:", error);
        res.status(500).json({ error: "Erro interno do servidor." });
    }
};

// Deletar uma pergunta
export const deleteQuestionController = async (req, res) => {
    const { id } = req.params;
    try {
        await dbRun("DELETE FROM perguntas WHERE id = ?", [id]);
        clearQuestionsCache();
        res.status(200).json({ message: "Pergunta deletada com sucesso." });
    } catch (error) {
        console.error("Erro ao deletar pergunta:", error);
        res.status(500).json({ error: "Erro interno do servidor." });
    }
};

// --- NOVA FUNÇÃO PARA EXCLUSÃO EM MASSA ---
export const bulkDeleteQuestionsController = async (req, res) => {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: "Uma lista de IDs de perguntas é necessária." });
    }

    // Cria os placeholders (?) para a cláusula IN
    const placeholders = ids.map(() => '?').join(',');
    const sql = `DELETE FROM perguntas WHERE id IN (${placeholders})`;

    try {
        await dbRun(sql, ids);
        clearQuestionsCache();
        res.status(200).json({ message: `${ids.length} perguntas foram deletadas com sucesso.` });
    } catch (error) {
        console.error("Erro ao deletar perguntas em massa:", error);
        res.status(500).json({ error: "Erro interno do servidor ao deletar perguntas." });
    }
};