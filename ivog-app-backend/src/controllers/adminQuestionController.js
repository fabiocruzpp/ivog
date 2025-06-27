import db from '../database/database.js';
import { promisify } from 'util';
import { clearQuestionsCache } from '../services/quizService.js';
import fs from 'fs'; 
import XLSX from 'xlsx';

const dbAll = promisify(db.all.bind(db));
const dbGet = promisify(db.get.bind(db));
const dbRun = promisify(db.run.bind(db));

// --- INÍCIO DA ALTERAÇÃO ---
// Listar perguntas com filtros opcionais para o seletor de desafios
export const listQuestionsController = async (req, res) => {
    const { canal, publico } = req.query;

    // Se a requisição contiver filtros (do seletor de desafios), retorna uma lista simplificada.
    if (canal || publico) {
        let query = "SELECT id, pergunta_formatada_display, tema, subtema FROM perguntas WHERE is_active = 1";
        const params = [];
        const whereConditions = [];

        if (canal) {
            const canais = Array.isArray(canal) ? canal : [canal];
            const canalConditions = canais.map(c => {
                params.push(`%"${c}"%`);
                return "canal LIKE ?";
            });
            if (canalConditions.length > 0) {
                whereConditions.push(`(canal = '[]' OR ${canalConditions.join(' OR ')})`);
            }
        }

        if (publico) {
            const publicos = Array.isArray(publico) ? publico : [publico];
            const publicoConditions = publicos.map(p => {
                params.push(`%"${p}"%`);
                return "publico LIKE ?";
            });
            if (publicoConditions.length > 0) {
                whereConditions.push(`(publico = '[]' OR ${publicoConditions.join(' OR ')})`);
            }
        }
        
        if (whereConditions.length > 0) {
            query += ` AND ${whereConditions.join(' AND ')}`;
        }

        query += " ORDER BY tema, subtema, id";

        try {
            const questions = await dbAll(query, params);
            return res.status(200).json(questions);
        } catch (error) {
           console.error("Erro ao listar perguntas com filtro:", error);
           return res.status(500).json({ error: "Erro interno do servidor ao buscar perguntas." });
        }
    }

    // Caso contrário (para a página principal de gerenciamento), executa a lógica original completa.
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
        console.error("Erro ao listar perguntas (listagem completa):", error);
        res.status(500).json({ error: "Erro interno do servidor." });
    }
};
// --- FIM DA ALTERAÇÃO ---

export const toggleQuestionStatusController = async (req, res) => {
    const { id } = req.params;
    try {
        await dbRun("UPDATE perguntas SET is_active = NOT is_active WHERE id = ?", [id]);
        clearQuestionsCache();
        res.status(200).json({ message: "Status da pergunta alterado com sucesso." });
    } catch (error) {
        console.error("Erro ao alterar status da pergunta:", error);
        res.status(500).json({ error: "Erro interno do servidor." });
    }
};

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
            tema, subtema || '', feedback || '', fonte || '', 1
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

export const updateQuestionController = async (req, res) => {
    const { id } = req.params;
    const {
        pergunta_formatada_display, alternativas, correta, publico, canal,
        tema, subtema, feedback, fonte, is_active
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
            is_active,
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