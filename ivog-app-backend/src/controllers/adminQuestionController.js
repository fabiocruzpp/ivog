import db from '../database/database.js';
import { promisify } from 'util';
import { clearQuestionsCache } from '../services/quizService.js';
import csv from 'csv-parser';
import { Readable } from 'stream';

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

// Importar perguntas de um arquivo CSV
export const importQuestionsFromCsvController = (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "Nenhum arquivo CSV foi enviado." });
    }

    const questions = [];
    const bufferStream = new Readable();
    bufferStream.push(req.file.buffer);
    bufferStream.push(null);

    bufferStream
        .pipe(csv({ separator: ';' }))
        .on('data', (row) => {
            try {
                const alternativas = row.ALTERNATIVAS ? row.ALTERNATIVAS.split('|').map(alt => alt.trim()).filter(Boolean) : [];
                if (!row.PERGUNTA || alternativas.length === 0 || !row.CORRETA) return;

                let respostaCorretaTexto = '';
                const respostaCorretaInput = row.CORRETA.trim().toLowerCase();
                if (respostaCorretaInput.length === 1 && 'abcdefghijklmnopqrstuvwxyz'.includes(respostaCorretaInput)) {
                    const index = respostaCorretaInput.charCodeAt(0) - 'a'.charCodeAt(0);
                    if (index >= 0 && index < alternativas.length) {
                        respostaCorretaTexto = alternativas[index];
                    }
                } else {
                    const matchExato = alternativas.find(alt => alt.trim().toLowerCase() === respostaCorretaInput);
                    if (matchExato) respostaCorretaTexto = matchExato;
                }

                if (!respostaCorretaTexto) return;

                questions.push({
                    pergunta_formatada_display: row.PERGUNTA.trim(),
                    alternativas: JSON.stringify(alternativas),
                    correta: respostaCorretaTexto,
                    publico: JSON.stringify(row.PUBLICO ? row.PUBLICO.split('|').map(p => p.trim()).filter(Boolean) : []),
                    canal: JSON.stringify(row.CANAL ? row.CANAL.split('|').map(c => c.trim()).filter(Boolean) : []),
                    tema: row.TEMA ? row.TEMA.trim() : 'Não especificado',
                    subtema: row.SUBTEMA ? row.SUBTEMA.trim() : 'Não especificado',
                    feedback: row.FEEDBACK ? row.FEEDBACK.trim() : '',
                    fonte: row.FONTE ? row.FONTE.trim() : '',
                });
            } catch (error) {
                console.error('Erro processando linha do CSV na importação:', row, error);
            }
        })
        .on('end', async () => {
            if (questions.length === 0) {
                return res.status(400).json({ error: "Nenhuma pergunta válida encontrada no arquivo CSV." });
            }

            try {
                const stmt = db.prepare(`INSERT INTO perguntas (pergunta_formatada_display, alternativas, correta, publico, canal, tema, subtema, feedback, fonte) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
                await dbRun('BEGIN TRANSACTION');
                for (const q of questions) {
                    await dbRun.call(stmt, Object.values(q));
                }
                stmt.finalize();
                await dbRun('COMMIT');
                
                clearQuestionsCache();
                res.status(201).json({ message: `${questions.length} perguntas importadas com sucesso.` });
            } catch (dbError) {
                await dbRun('ROLLBACK');
                console.error("Erro de banco de dados ao importar CSV:", dbError);
                res.status(500).json({ error: "Falha ao salvar perguntas no banco de dados." });
            }
        })
        .on('error', (err) => {
            res.status(500).json({ error: "Falha ao processar o arquivo CSV." });
        });
};