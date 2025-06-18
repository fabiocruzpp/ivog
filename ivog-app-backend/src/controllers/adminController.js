import db from '../database/database.js';
import { promisify } from 'util';
import { loadAllQuestions } from '../services/quizService.js';
import { sendMessageToAllUsers } from '../services/telegramService.js';
import { clearQuestionsCache } from '../services/quizService.js';
import { getAllCanais, getAllCargos } from '../services/optionsService.js';
import { startPillsScheduler } from '../services/schedulerService.js';
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

const dbGet = promisify(db.get.bind(db));
const dbAll = promisify(db.all.bind(db));
const dbRun = promisify(db.run.bind(db));

export const getQuestionFormOptionsController = (req, res) => {
    try {
        const canais = getAllCanais();
        const cargos = getAllCargos();
        res.status(200).json({ canais, cargos });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar opções para o formulário.' });
    }
};

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
        const validKeys = [
            'simulado_livre_ativado',
            'feedback_detalhado_ativo',
            'desafio_ativo',
            'modo_treino_ativado',
            'pills_broadcast_enabled',
            'pills_quiet_time_enabled'
        ];
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
        if (key === 'pills_quiet_time_enabled') {
            startPillsScheduler();
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
        const validKeys = [
            'num_max_perguntas_simulado',
            'pills_broadcast_interval_minutes',
            'pills_quiet_time_start',
            'pills_quiet_time_end'
        ];
        if (!validKeys.includes(key)) {
            return res.status(400).json({ error: "Chave de configuração inválida para esta operação." });
        }
        if (key === 'pills_quiet_time_start' || key === 'pills_quiet_time_end') {
            const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
            if (!timeRegex.test(value)) {
                return res.status(400).json({ error: "Formato de horário inválido. Use HH:mm (ex: 21:00)" });
            }
        } else {
            if (value === undefined || value === '' || Number(value) < 1) {
                return res.status(400).json({ error: "Um valor válido é obrigatório." });
            }
        }
        await dbRun("INSERT OR REPLACE INTO configuracoes (chave, valor) VALUES (?, ?)", [key, value.toString()]);
        if (key === 'pills_broadcast_interval_minutes' || key === 'pills_quiet_time_start' || key === 'pills_quiet_time_end') {
            startPillsScheduler();
        }
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
        const mensagem = `🏆 <b>NOVO DESAFIO ATIVO!</b> 🏆\n\nPrepare-se! Um novo desafio foi ativado: <b>${tipoCapitalized}: ${nomeFormatado}</b>.\n\nEntre no <b>Ivo G App</b> e mostre o que você sabe! 💪`;
        sendMessageToAllUsers(mensagem);
        res.status(200).json({ status: "success", message: "Desafio ativado e notificação enviada." });
    } catch (error) {
        res.status(500).json({ error: "Erro interno do servidor." });
    }
};

export const deactivateChallengeController = async (req, res) => {
    try {
        const configsRaw = await dbAll("SELECT chave, valor FROM configuracoes WHERE chave IN ('desafio_tipo', 'desafio_valor')");
        const configs = configsRaw.reduce((acc, row) => ({ ...acc, [row.chave]: row.valor }), {});
        const { desafio_tipo: tipoAntigo, desafio_valor: valorAntigo } = configs;

        if (!tipoAntigo || !valorAntigo) {
            return res.status(400).json({ status: "info", message: "Nenhum desafio ativo para desativar." });
        }

        const contextoAntigo = `${tipoAntigo}:${valorAntigo}`;

        const statsPromise = dbGet(`SELECT COUNT(DISTINCT s.telegram_id) as total_participantes, SUM(rs.acertou) as acertos, COUNT(rs.id) as respostas FROM simulados s JOIN respostas_simulado rs ON s.id_simulado = rs.id_simulado WHERE s.contexto_desafio = ?`, [contextoAntigo]);
        const top10Promise = dbAll(`SELECT u.first_name, MAX(r.pontos) as pontos FROM resultados r JOIN usuarios u ON r.telegram_id = u.telegram_id JOIN simulados s ON r.id_simulado = s.id_simulado WHERE s.contexto_desafio = ? GROUP BY r.telegram_id ORDER BY pontos DESC LIMIT 10`, [contextoAntigo]);

        const [stats, top10] = await Promise.all([statsPromise, top10Promise]);

        const taxaAcerto = stats.respostas > 0 ? (stats.acertos / stats.respostas * 100) : 0;

        let mensagem = `🎉 <b>DESAFIO ENCERRADO!</b> 🎉\n\nO desafio '${tipoAntigo}: ${valorAntigo.replace(/_/g, ' ')}' chegou ao fim.\n\n📊 <b>Estatísticas:</b>\n- Participantes: ${stats.total_participantes || 0}\n- Acerto Médio: ${taxaAcerto.toFixed(2)}%\n\n`;

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
        console.error("Erro ao desativar desafio:", error);
        res.status(500).json({ error: "Erro interno do servidor ao desativar desafio." });
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
            taxa_acerto_media_bruta_formatada: `${taxaAcerto.toFixed(2)}%`,
            top_10: top10 || []
        });
    } catch (error) {
        console.error("Erro ao buscar estatísticas do desafio:", error);
        res.status(500).json({ error: "Erro interno do servidor ao buscar estatísticas do desafio." });
    }
};

// Funções de CRUD para desafios (se aplicável, mantenha ou remova conforme seu uso)
export const createChallengeController = async (req, res) => {
    // Implementação do CRUD de desafios
    res.status(501).json({ message: "Não implementado" });
};

export const listChallengesController = async (req, res) => {
    // Implementação do CRUD de desafios
    res.status(501).json({ message: "Não implementado" });
};

export const updateChallengeController = async (req, res) => {
    // Implementação do CRUD de desafios
    res.status(501).json({ message: "Não implementado" });
};

export const deleteChallengeController = async (req, res) => {
    // Implementação do CRUD de desafios
    res.status(501).json({ message: "Não implementado" });
};

export const getAllChallengesForDebug = async (req, res) => {
    // Implementação do CRUD de desafios
    res.status(501).json({ message: "Não implementado" });
};

export const importQuestionsController = async (req, res) => {
    const filePath = req.file ? req.file.path : null;
    if (!filePath) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado ou erro no upload.' });
    }

    try {
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (data.length === 0) {
            fs.unlinkSync(filePath);
            return res.status(400).json({ error: 'O arquivo XLSX está vazio.' });
        }

        const headers = data[0].map(header => String(header).trim());
        const dataRows = data.slice(1);

        const expectedHeaders = [
            'CANAL', 'PUBLICO', 'TEMA', 'SUBTEMA', 'PERGUNTA',
            'ALTERNATIVAS', 'CORRETA', 'FEEDBACK', 'FONTE', 'RESPONSAVEL'
        ];

        const headerIndexes = {};
        let missingRequiredHeader = false;
        const requiredHeadersInFile = ['PERGUNTA', 'ALTERNATIVAS', 'CORRETA', 'TEMA'];

        expectedHeaders.forEach(expectedHeader => {
            const index = headers.indexOf(expectedHeader);
            headerIndexes[expectedHeader] = index;
        });

        requiredHeadersInFile.forEach(requiredHeader => {
            if (headerIndexes[requiredHeader] === -1) {
                missingRequiredHeader = true;
            }
        });

        if (missingRequiredHeader) {
            fs.unlinkSync(filePath);
            const missingHeadersList = requiredHeadersInFile
                .filter(h => headerIndexes[h] === -1)
                .join(', ');
            return res.status(400).json({ error: `Colunas obrigatórias não encontradas no arquivo XLSX: ${missingHeadersList}. Certifique-se de que os cabeçalhos são: ${expectedHeaders.join(', ')}` });
        }

        const questionsToImport = [];
        for (const row of dataRows) {
            const questionDataDB = {};

            const perguntaIndex = headerIndexes['PERGUNTA'];
            questionDataDB.pergunta_formatada_display = perguntaIndex !== -1 && row[perguntaIndex] !== undefined ? String(row[perguntaIndex]).trim() : '';

            const alternativasIndex = headerIndexes['ALTERNATIVAS'];
            const alternativasRaw = alternativasIndex !== -1 && row[alternativasIndex] !== undefined ? String(row[alternativasIndex]).trim() : '';
            // --- MODIFICAÇÃO AQUI: Divide a string por '|' em vez de JSON.parse ---
            const alternativasParsed = alternativasRaw ? alternativasRaw.split('|').map(item => item.trim()).filter(item => item !== '') : [];
            // --- FIM MODIFICAÇÃO ---

            const corretaIndex = headerIndexes['CORRETA'];
            questionDataDB.correta = corretaIndex !== -1 && row[corretaIndex] !== undefined ? String(row[corretaIndex]).trim() : '';

            const publicoIndex = headerIndexes['PUBLICO'];
            const publicoRaw = publicoIndex !== -1 && row[publicoIndex] !== undefined ? String(row[publicoIndex]).trim() : '';
            // --- MODIFICAÇÃO AQUI: Divide a string por '|' em vez de JSON.parse ---
            const publicoParsed = publicoRaw ? publicoRaw.split('|').map(item => item.trim()).filter(item => item !== '') : [];
            // --- FIM MODIFICAÇÃO ---

            const canalIndex = headerIndexes['CANAL'];
            const canalRaw = canalIndex !== -1 && row[canalIndex] !== undefined ? String(row[canalIndex]).trim() : '';
            // --- MODIFICAÇÃO AQUI: Divide a string por '|' em vez de JSON.parse ---
            const canalParsed = canalRaw ? canalRaw.split('|').map(item => item.trim()).filter(item => item !== '') : [];
            // --- FIM MODIFICAÇÃO ---

            const temaIndex = headerIndexes['TEMA'];
            questionDataDB.tema = temaIndex !== -1 && row[temaIndex] !== undefined ? String(row[temaIndex]).trim() : '';

            const subtemaIndex = headerIndexes['SUBTEMA'];
            questionDataDB.subtema = subtemaIndex !== -1 && row[subtemaIndex] !== undefined ? String(row[subtemaIndex]).trim() : '';

            const feedbackIndex = headerIndexes['FEEDBACK'];
            questionDataDB.feedback = feedbackIndex !== -1 && row[feedbackIndex] !== undefined ? String(row[feedbackIndex]).trim() : '';

            const fonteIndex = headerIndexes['FONTE'];
            questionDataDB.fonte = fonteIndex !== -1 && row[fonteIndex] !== undefined ? String(row[fonteIndex]).trim() : '';


            // Validação básica dos campos obrigatórios (usando os nomes do DB)
            if (!questionDataDB.pergunta_formatada_display || alternativasParsed.length === 0 || !questionDataDB.correta || !questionDataDB.tema) {
                console.warn(`Pulando linha de pergunta devido a campos obrigatórios ausentes ou alternativas/público/canal vazios: ${JSON.stringify(questionDataDB)}`);
                continue;
            }

            // Adiciona a pergunta formatada para inserção no DB
            questionsToImport.push({
                pergunta_formatada_display: questionDataDB.pergunta_formatada_display,
                alternativas: alternativasParsed,
                correta: questionDataDB.correta,
                publico: publicoParsed,
                canal: canalParsed,
                tema: questionDataDB.tema,
                subtema: questionDataDB.subtema,
                feedback: questionDataDB.feedback,
                fonte: questionDataDB.fonte
            });
        }

        if (questionsToImport.length === 0) {
            fs.unlinkSync(filePath);
            return res.status(400).json({ error: 'Nenhuma pergunta válida encontrada no arquivo para importar. Verifique se os cabeçalhos, o formato dos dados (especialmente alternativas, público e canal usando "|") e os campos obrigatórios estão corretos.' });
        }

        db.serialize(() => {
            db.run("BEGIN TRANSACTION;");

            const stmt = db.prepare(`INSERT INTO perguntas (
                pergunta_formatada_display, alternativas, correta, publico, canal,
                tema, subtema, feedback, fonte
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);

            let addedCount = 0;
            let skippedCount = 0;
            const checkDuplicateStmt = db.prepare('SELECT id FROM perguntas WHERE pergunta_formatada_display = ?');

            let processedCount = 0;
            const totalToProcess = questionsToImport.length;

            function processNextQuestion() {
                if (processedCount >= totalToProcess) {
                    checkDuplicateStmt.finalize();
                    stmt.finalize();
                    db.run("COMMIT;", function(err) {
                        if (err) {
                            console.error("Erro no COMMIT da transação de perguntas:", err);
                            db.run("ROLLBACK;");
                            if (fs.existsSync(filePath)) {
                                fs.unlinkSync(filePath);
                            }
                            return res.status(500).json({ error: "Erro interno do servidor ao salvar perguntas no banco de dados." });
                        }
                        clearQuestionsCache();
                        if (fs.existsSync(filePath)) {
                            fs.unlinkSync(filePath);
                        }
                        res.status(200).json({ message: `Importação de perguntas concluída. ${addedCount} perguntas novas adicionadas. ${skippedCount} duplicadas ou inválidas foram ignoradas.` });
                    });
                    return;
                }

                const q = questionsToImport[processedCount];

                checkDuplicateStmt.get(q.pergunta_formatada_display, (err, existing) => {
                    if (err) {
                        console.error("Erro ao checar duplicidade de pergunta:", err);
                        skippedCount++;
                        processedCount++;
                        processNextQuestion();
                        return;
                    }

                    if (!existing) {
                        stmt.run(
                            q.pergunta_formatada_display, JSON.stringify(q.alternativas), q.correta,
                            JSON.stringify(q.publico), JSON.stringify(q.canal),
                            q.tema, q.subtema, q.feedback, q.fonte,
                            (insertErr) => {
                                if (insertErr) {
                                    console.error("Erro ao inserir pergunta:", insertErr);
                                    skippedCount++;
                                } else {
                                    addedCount++;
                                }
                                processedCount++;
                                processNextQuestion();
                            }
                        );
                    } else {
                        skippedCount++;
                        processedCount++;
                        processNextQuestion();
                    }
                });
            }

            processNextQuestion();
        });

    } catch (error) {
        console.error("Erro ao importar perguntas XLSX:", error);
        if (filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        if (error.code === 'ENOENT') {
            return res.status(500).json({ error: 'Erro interno: Arquivo temporário de pergunta não encontrado.' });
        }
        if (error.message.includes('Corrupted zip') || error.message.includes('Invalid file')) {
            return res.status(400).json({ error: 'Erro ao ler o arquivo XLSX de perguntas. Verifique se é um arquivo Excel válido.' });
        }
        res.status(500).json({ error: "Erro interno do servidor ao importar perguntas." });
    }
};


// --- NOVA FUNÇÃO PARA IMPORTAR PÍLULAS DO CONHECIMENTO (XLSX) ---
export const importPillsCsvController = async (req, res) => {
    const filePath = req.file ? req.file.path : null;

    if (!filePath) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado ou erro no upload.' });
    }

    try {
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0]; // Assume que os dados estão na primeira planilha
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }); // Lê como array de arrays

        if (data.length <= 1) { // Verifica se há pelo menos cabeçalho e uma linha de dados
            fs.unlinkSync(filePath);
            return res.status(400).json({ error: 'O arquivo XLSX está vazio ou contém apenas o cabeçalho.' });
        }

        const headers = data[0].map(header => String(header).trim());
        const dataRows = data.slice(1); // Ignora o cabeçalho

        const expectedHeaders = [
            'CARGO', 'TEMA', 'CONTEUDO', 'ARQUIVO_DE_ORIGEM', 'PAGINA'
        ];

        const headerIndexes = {};
        let missingRequiredHeader = false;
        const requiredHeadersInFile = ['CARGO', 'TEMA', 'CONTEUDO']; // Colunas obrigatórias

        expectedHeaders.forEach(expectedHeader => {
            const index = headers.indexOf(expectedHeader);
            headerIndexes[expectedHeader] = index;
        });

        requiredHeadersInFile.forEach(requiredHeader => {
            if (headerIndexes[requiredHeader] === -1) {
                missingRequiredHeader = true;
            }
        });

        if (missingRequiredHeader) {
            fs.unlinkSync(filePath);
            const missingHeadersList = requiredHeadersInFile
                .filter(h => headerIndexes[h] === -1)
                .join(', ');
            return res.status(400).json({ error: `Colunas obrigatórias não encontradas no arquivo XLSX: ${missingHeadersList}. Certifique-se de que os cabeçalhos são: ${expectedHeaders.join(', ')}` });
        }

        const pillsToImport = [];
        for (const row of dataRows) {
            // Mapeia os dados da linha para a estrutura que vamos usar para inserir
            const pillData = {
                cargo: headerIndexes['CARGO'] !== -1 && row[headerIndexes['CARGO']] !== undefined ? String(row[headerIndexes['CARGO']]).trim() : '',
                tema: headerIndexes['TEMA'] !== -1 && row[headerIndexes['TEMA']] !== undefined ? String(row[headerIndexes['TEMA']]).trim() : '',
                conteudo: headerIndexes['CONTEUDO'] !== -1 && row[headerIndexes['CONTEUDO']] !== undefined ? String(row[headerIndexes['CONTEUDO']]).trim() : '',
                arquivo_origem: headerIndexes['ARQUIVO_DE_ORIGEM'] !== -1 && row[headerIndexes['ARQUIVO_DE_ORIGEM']] !== undefined ? String(row[headerIndexes['ARQUIVO_DE_ORIGEM']]).trim() : null,
                pagina: headerIndexes['PAGINA'] !== -1 && row[headerIndexes['PAGINA']] !== undefined ? String(row[headerIndexes['PAGINA']]).trim() : null,
            };

            // Validação básica dos campos obrigatórios
            if (!pillData.cargo || !pillData.tema || !pillData.conteudo) {
                 console.warn(`Pulando linha de pílula devido a campos obrigatórios ausentes: ${JSON.stringify(pillData)}`);
                continue; // Pula a linha se campos obrigatórios estiverem vazios
            }

            pillsToImport.push(pillData);
        }

         if (pillsToImport.length === 0) {
             fs.unlinkSync(filePath);
             return res.status(400).json({ error: 'Nenhuma pílula válida encontrada no arquivo para importar. Verifique se os cabeçalhos e os campos obrigatórios (CARGO, TEMA, CONTEUDO) estão corretos.' });
         }


        // Inserção no banco de dados
        db.serialize(() => {
            db.run("BEGIN TRANSACTION;");

            // --- CORREÇÃO AQUI: Usando os nomes de coluna corretos do DB ---
            const stmt = db.prepare(`INSERT INTO knowledge_pills (
                target_cargo, tema, conteudo, source_file, source_page
            ) VALUES (?, ?, ?, ?, ?)`);
            // --- FIM CORREÇÃO ---

            let addedCount = 0;
            let skippedCount = 0;
            // Para pílulas, a duplicação é menos comum e pode ser definida pela combinação de campos
            // ou simplesmente permitir duplicatas, dependendo da regra de negócio.
            // Se quiser evitar duplicatas, precisaria de uma query de SELECT antes da inserção.
            // Por enquanto, vamos apenas inserir todas as pílulas válidas.

            let processedCount = 0;
            const totalToProcess = pillsToImport.length;

            function processNextPill() {
                if (processedCount >= totalToProcess) {
                    stmt.finalize();
                    db.run("COMMIT;", function(err) {
                        if (err) {
                            console.error("Erro no COMMIT da transação de pílulas:", err);
                            db.run("ROLLBACK;");
                            if (fs.existsSync(filePath)) {
                                fs.unlinkSync(filePath);
                            }
                            return res.status(500).json({ error: "Erro interno do servidor ao salvar pílulas no banco de dados." });
                        }
                        // Não há cache de pílulas para limpar como nas perguntas
                        if (fs.existsSync(filePath)) {
                            fs.unlinkSync(filePath);
                        }
                        res.status(200).json({ message: `Importação de pílulas concluída. ${addedCount} pílulas novas adicionadas. ${skippedCount} linhas ignoradas (campos obrigatórios vazios ou erro na inserção).` });
                    });
                    return;
                }

                const pill = pillsToImport[processedCount];

                // Inserir a pílula - Note que os valores passados (pill.cargo, etc.)
                // correspondem aos dados extraídos do XLSX pelos cabeçalhos,
                // e são mapeados pela posição para as colunas na query SQL.
                stmt.run(
                    pill.cargo, // Este valor vai para target_cargo (primeiro ?)
                    pill.tema, // Este valor vai para tema (segundo ?)
                    pill.conteudo, // Este valor vai para conteudo (terceiro ?)
                    pill.arquivo_origem, // Este valor vai para source_file (quarto ?)
                    pill.pagina, // Este valor vai para source_page (quinto ?)
                    (insertErr) => {
                        if (insertErr) {
                            console.error("Erro ao inserir pílula:", insertErr);
                            skippedCount++; // Conta como pulada se der erro na inserção
                        } else {
                            addedCount++;
                        }
                        processedCount++;
                        processNextPill();
                    }
                );
            }

            processNextPill();
        });

    } catch (error) {
        console.error("Erro ao importar pílulas XLSX:", error);
        if (filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        if (error.code === 'ENOENT') {
            return res.status(500).json({ error: 'Erro interno: Arquivo temporário de pílula não encontrado.' });
        }
         if (error.message.includes('Corrupted zip') || error.message.includes('Invalid file')) {
            return res.status(400).json({ error: 'Erro ao ler o arquivo XLSX de pílulas. Verifique se é um arquivo Excel válido.' });
        }
        res.status(500).json({ error: "Erro interno do servidor ao importar pílulas." });
    }
};


/**
 * Busca todos os usuários cadastrados.
 */
export const getAllUsers = async (req, res) => {
    try {
        const sql = `
            SELECT telegram_id, first_name, ddd, canal_principal, cargo
            FROM usuarios
            ORDER BY data_cadastro DESC
        `;
        const users = await dbAll(sql);
        res.status(200).json(users);
    } catch (error) {
        console.error('Erro ao buscar usuários:', error);
        res.status(500).json({ message: 'Erro interno do servidor ao buscar usuários.' });
    }
};

/**
 * Exclui um usuário e todos os seus dados relacionados.
 */
export const deleteUser = async (req, res) => {
    const { telegram_id } = req.params;
    try {
        await new Promise((resolve, reject) => db.run('BEGIN TRANSACTION', (err) => err ? reject(err) : resolve()));

        // Excluir dados relacionados (ordem importa devido a chaves estrangeiras, se existirem)
        await dbRun('DELETE FROM respostas_simulado WHERE telegram_id = ?', [telegram_id]);
        await dbRun('DELETE FROM resultados WHERE telegram_id = ?', [telegram_id]);
        await dbRun('DELETE FROM simulados WHERE telegram_id = ?', [telegram_id]);
        await dbRun('DELETE FROM admin_credentials WHERE telegram_id = ?', [telegram_id]); // Se houver admins na tabela de usuários

        // Excluir o usuário
        const result = await new Promise((resolve, reject) => {
            db.run('DELETE FROM usuarios WHERE telegram_id = ?', [telegram_id], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this); // 'this' contém informações como changes
                }
            });
        });

        if (result.changes === 0) {
            // Se nenhum usuário foi excluído, ele não foi encontrado
            await new Promise((resolve) => db.run('ROLLBACK', () => resolve()));
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }

        await new Promise((resolve, reject) => db.run('COMMIT', (err) => err ? reject(err) : resolve()));
        res.status(200).json({ message: 'Usuário e todos os seus dados foram excluídos com sucesso.' });

    } catch (error) {
        await new Promise((resolve) => db.run('ROLLBACK', () => resolve()));
        console.error(`Erro ao excluir usuário ${telegram_id}:`, error);
        res.status(500).json({ message: 'Erro interno do servidor ao excluir o usuário.' });
    }
};
