import db from '../database/database.js';
import { promisify } from 'util';
import { clearQuestionsCache } from '../services/quizService.js';
import fs from 'fs'; // Necessário para manipular arquivos temporários
import XLSX from 'xlsx'; // Importa a biblioteca XLSX

const dbAll = promisify(db.all.bind(db));
const dbGet = promisify(db.get.bind(db));
const dbRun = promisify(db.run.bind(db));

// Listar todas as perguntas (mantido)
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

// Criar uma nova pergunta (mantido)
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

// Atualizar uma pergunta existente (mantido)
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

// Deletar uma pergunta (mantido)
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

// Exclusão em massa (mantido)
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

// --- NOVA FUNÇÃO PARA IMPORTAÇÃO XLSX ---
export const importQuestionsController = async (req, res) => {
    // req.file é disponibilizado pelo middleware 'multer' configurado na rota
    if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    }

    const filePath = req.file.path; // Caminho temporário onde o multer salvou o arquivo
    const questionsToImport = [];

    try {
        // Lê o arquivo XLSX
        const workbook = XLSX.readFile(filePath);
        // Assume que os dados estão na primeira planilha
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Converte a planilha para um array de objetos, usando a primeira linha como cabeçalho
        // raw: false tenta preservar a formatação (útil para datas, etc., embora não se aplique diretamente aqui)
        const rows = XLSX.utils.sheet_to_json(worksheet, { raw: false });

        if (rows.length === 0) {
             fs.unlinkSync(filePath); // Limpa o arquivo temporário
             return res.status(400).json({ error: 'O arquivo XLSX está vazio ou não contém dados.' });
        }

        // Cabeçalhos esperados com base na estrutura CSV original
        const requiredHeaders = ['pergunta_formatada_display', 'alternativas', 'correta', 'tema'];
        const actualHeaders = Object.keys(rows[0] || {});

        // Verifica se os cabeçalhos obrigatórios estão presentes
        const missingHeaders = requiredHeaders.filter(header => !actualHeaders.includes(header));
        if (missingHeaders.length > 0) {
             fs.unlinkSync(filePath); // Limpa o arquivo temporário
             return res.status(400).json({ error: `Colunas obrigatórias ausentes no arquivo: ${missingHeaders.join(', ')}` });
        }


        // Processa cada linha (objeto) do arquivo
        for (const row of rows) {
            // Mapeia as colunas para o formato esperado
            const question = {
                pergunta_formatada_display: row.pergunta_formatada_display,
                alternativas: row.alternativas, // Virá como string, precisa de parse
                correta: row.correta,
                publico: row.publico, // Virá como string, precisa de parse
                canal: row.canal,   // Virá como string, precisa de parse
                tema: row.tema,
                subtema: row.subtema || '', // Usa string vazia se for undefined/null
                feedback: row.feedback || '',
                fonte: row.fonte || ''
            };

            // Validação básica dos campos obrigatórios
            if (!question.pergunta_formatada_display || !question.alternativas || !question.correta || !question.tema) {
                 console.warn(`Pulando linha devido a campos obrigatórios ausentes: ${JSON.stringify(row)}`);
                 continue; // Pula linhas com campos obrigatórios faltando
            }

            try {
                // Tenta fazer o parse dos campos que devem ser JSON (arrays)
                // Garante que os valores são strings antes de tentar o parse
                question.alternativas = JSON.parse(String(question.alternativas || '[]'));
                question.publico = JSON.parse(String(question.publico || '[]'));
                question.canal = JSON.parse(String(question.canal || '[]'));
            } catch (parseError) {
                console.error(`Erro ao parsear JSON em uma linha: ${JSON.stringify(row)}`, parseError);
                continue; // Pula a linha se o parse JSON falhar
            }

            // Validação básica para garantir que os campos parseados são arrays
            if (!Array.isArray(question.alternativas) || !Array.isArray(question.publico) || !Array.isArray(question.canal)) {
                 console.warn(`Pulando linha devido a formato de array inválido após parse: ${JSON.stringify(row)}`);
                 continue;
            }

            questionsToImport.push(question);
        }

        if (questionsToImport.length === 0) {
             fs.unlinkSync(filePath); // Limpa o arquivo temporário
             return res.status(400).json({ error: 'Nenhuma pergunta válida encontrada no arquivo para importar.' });
        }

        // Insere as perguntas no banco de dados usando uma transação para melhor performance
        db.serialize(() => {
            db.run("BEGIN TRANSACTION;");
            const stmt = db.prepare(`INSERT INTO perguntas (
                pergunta_formatada_display, alternativas, correta, publico, canal, 
                tema, subtema, feedback, fonte
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);

            questionsToImport.forEach(q => {
                stmt.run(
                    q.pergunta_formatada_display, JSON.stringify(q.alternativas), q.correta,
                    JSON.stringify(q.publico), JSON.stringify(q.canal),
                    q.tema, q.subtema, q.feedback, q.fonte
                );
            });

            stmt.finalize(); // Finaliza o statement preparado
            
            // Executa o COMMIT da transação e trata o resultado
            db.run("COMMIT;", async function(err) {
                 if (err) {
                     console.error("Erro no COMMIT da transação:", err);
                     db.run("ROLLBACK;"); // Reverte a transação em caso de erro
                     if (fs.existsSync(filePath)) {
                         fs.unlinkSync(filePath); // Limpa o arquivo temporário
                     }
                     return res.status(500).json({ error: "Erro interno do servidor ao salvar perguntas no banco de dados." });
                 }

                 // Transação bem-sucedida
                 clearQuestionsCache(); // Limpa o cache após a importação
                 if (fs.existsSync(filePath)) {
                     fs.unlinkSync(filePath); // Limpa o arquivo temporário
                 }
                 res.status(200).json({ message: `${questionsToImport.length} perguntas importadas com sucesso!` });
            });
        });


    } catch (error) {
        console.error("Erro ao importar perguntas XLSX:", error);
        if (fs.existsSync(filePath)) {
             fs.unlinkSync(filePath); // Limpa o arquivo temporário em caso de erro
        }
        // Verifica por erros específicos da leitura de arquivo
        if (error.code === 'ENOENT') {
             return res.status(500).json({ error: 'Erro interno: Arquivo temporário não encontrado.' });
        }
        if (error.message.includes('Corrupted zip')) {
             return res.status(400).json({ error: 'Erro ao ler o arquivo XLSX. Verifique se é um arquivo Excel válido.' });
        }
        res.status(500).json({ error: "Erro interno do servidor ao importar perguntas." });
    }
};
