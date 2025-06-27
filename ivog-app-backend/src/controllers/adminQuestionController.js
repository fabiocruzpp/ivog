import db from '../database/database.js';
import { promisify } from 'util';
import { clearQuestionsCache } from '../services/quizService.js';
import fs from 'fs'; 
import XLSX from 'xlsx';

const dbAll = promisify(db.all.bind(db));
const dbGet = promisify(db.get.bind(db));
const dbRun = promisify(db.run.bind(db));

// Listar todas as perguntas
export const listQuestionsController = async (req, res) => {
    try {
        const questions = await dbAll("SELECT * FROM perguntas ORDER BY id DESC");
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

// --- INÍCIO DA ALTERAÇÃO ---
// Nova função para ativar/desativar uma pergunta
export const toggleQuestionStatusController = async (req, res) => {
    const { id } = req.params;
    try {
        // A query inverte o valor de is_active (0 vira 1, 1 vira 0)
        await dbRun("UPDATE perguntas SET is_active = NOT is_active WHERE id = ?", [id]);
        clearQuestionsCache(); // Invalida o cache para que a mudança seja refletida nos quizzes
        res.status(200).json({ message: "Status da pergunta alterado com sucesso." });
    } catch (error) {
        console.error("Erro ao alterar status da pergunta:", error);
        res.status(500).json({ error: "Erro interno do servidor." });
    }
};
// --- FIM DA ALTERAÇÃO ---


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
            tema, subtema, feedback, fonte, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        const params = [
            pergunta_formatada_display, JSON.stringify(alternativas || []), correta,
            JSON.stringify(publico || []), JSON.stringify(canal || []),
            tema, subtema || '', feedback || '', fonte || '', 1 // Pergunta começa como ativa
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
        tema, subtema, feedback, fonte, is_active // Recebe o is_active também
    } = req.body;

    if (!pergunta_formatada_display || !alternativas || !correta || !tema) {
        return res.status(400).json({ error: "Campos obrigatórios (pergunta, alternativas, correta, tema) estão ausentes." });
    }

    try {
        const sql = `UPDATE perguntas SET 
            pergunta_formatada_display = ?, alternativas = ?, correta = ?, publico = ?, canal = ?, 
            tema = ?, subtema = ?, feedback = ?, fonte = ?, is_active = ?
            WHERE id = ?`;
        
        const params = [
            pergunta_formatada_display, JSON.stringify(alternativas || []), correta,
            JSON.stringify(publico || []), JSON.stringify(canal || []),
            tema, subtema || '', feedback || '', fonte || '',
            is_active, // Atualiza o status
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

// Exclusão em massa
export const bulkDeleteQuestionsController = async (req, res) => {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: "Uma lista de IDs de perguntas é necessária." });
    }

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