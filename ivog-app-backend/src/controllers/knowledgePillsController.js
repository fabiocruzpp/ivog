import db from '../database/database.js';
import { promisify } from 'util';
import csv from 'csv-parser';
import { Readable } from 'stream';
import { sendFileAndGetId } from '../services/telegramService.js';
import { manualSendAndResetScheduler } from '../services/schedulerService.js';
import path from 'path';

const dbAll = promisify(db.all.bind(db));
const dbRun = promisify(db.run.bind(db));
const dbGet = promisify(db.get.bind(db));

const listPillsController = async (req, res) => {
    try {
        const pills = await dbAll("SELECT * FROM knowledge_pills ORDER BY id DESC");
        res.status(200).json(pills);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao listar pílulas do conhecimento.' });
    }
};

const createPillController = async (req, res) => {
    const { target_cargo, target_canal, tema, conteudo, source_file, source_page } = req.body;
    if (!conteudo) {
        return res.status(400).json({ error: "O campo 'conteudo' é obrigatório." });
    }
    try {
        const sql = `INSERT INTO knowledge_pills (target_cargo, target_canal, tema, conteudo, source_file, source_page) VALUES (?, ?, ?, ?, ?, ?)`;
        const params = [
            JSON.stringify(target_cargo || []), JSON.stringify(target_canal || []),
            tema || '', conteudo, source_file || '', source_page || ''
        ];
        const result = await new Promise((resolve, reject) => {
            db.run(sql, params, function (err) {
                if (err) reject(err);
                else resolve({ id: this.lastID });
            });
        });
        res.status(201).json({ message: 'Pílula criada com sucesso!', id: result.id });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao criar pílula.' });
    }
};

const updatePillController = async (req, res) => {
    const { id } = req.params;
    const { target_cargo, target_canal, tema, conteudo, source_file, source_page } = req.body;
    if (!conteudo) {
        return res.status(400).json({ error: "O campo 'conteudo' é obrigatório." });
    }
    try {
        const sql = `UPDATE knowledge_pills SET target_cargo = ?, target_canal = ?, tema = ?, conteudo = ?, source_file = ?, source_page = ? WHERE id = ?`;
        const params = [
            JSON.stringify(target_cargo || []), JSON.stringify(target_canal || []),
            tema || '', conteudo, source_file || '', source_page || '',
            id
        ];
        await dbRun(sql, params);
        res.status(200).json({ message: 'Pílula atualizada com sucesso!' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao atualizar pílula.' });
    }
};

const deletePillController = async (req, res) => {
    const { id } = req.params;
    try {
        await dbRun("DELETE FROM knowledge_pills WHERE id = ?", [id]);
        res.status(200).json({ message: 'Pílula deletada com sucesso!' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao deletar pílula.' });
    }
};

const importPillsCsvController = async (req, res) => {
    console.log('[DIAGNÓSTICO CSV PÍLULAS] === INÍCIO DO DIAGNÓSTICO ===');
    console.log('[DIAGNÓSTICO CSV PÍLULAS] Content-Type:', req.headers['content-type']);
    console.log('[DIAGNÓSTICO CSV PÍLULAS] Content-Length:', req.headers['content-length']);
    console.log('[DIAGNÓSTICO CSV PÍLULAS] req.body:', JSON.stringify(req.body, null, 2));

    try {
        let csvContent;
        let fileName = 'imported.csv';

        // Verificar se é JSON (novo formato do frontend)
        if (req.body && req.body.csvContent) {
            csvContent = req.body.csvContent;
            fileName = req.body.fileName || 'imported.csv';
            console.log('[CSV] ✅ Recebido via JSON, tamanho:', csvContent.length);
        }
        // Verificar se é arquivo via multer
        else if (req.file) {
            csvContent = req.file.buffer.toString('utf-8');
            fileName = req.file.originalname;
            console.log('[CSV] ✅ Recebido via arquivo, tamanho:', csvContent.length);
        }
        else {
            console.log('[CSV] ❌ Nenhum conteúdo CSV encontrado');
            return res.status(400).json({ error: 'Nenhum arquivo CSV enviado' });
        }

        console.log('[CSV] Conteúdo recebido (primeiros 200 chars):', csvContent.substring(0, 200));
        console.log('[CSV] Nome do arquivo:', fileName);

        // Processar o CSV linha por linha
        const lines = csvContent.split(/\r?\n/).filter(line => line.trim() !== '');
        console.log('[CSV] Número de linhas (incluindo cabeçalho):', lines.length);

        if (lines.length < 2) {
            return res.status(400).json({ error: 'CSV deve conter pelo menos uma linha de dados além do cabeçalho' });
        }

        // Verificar cabeçalho
        const header = lines[0].trim();
        const expectedHeader = 'CARGO;TEMA;CONTEUDO;ARQUIVO_DE_ORIGEM;PAGINA';
        
        if (header !== expectedHeader) {
            console.log('[CSV] ❌ Cabeçalho incorreto. Esperado:', expectedHeader);
            console.log('[CSV] ❌ Recebido:', header);
            return res.status(400).json({ 
                error: `Cabeçalho CSV inválido. Esperado: ${expectedHeader}` 
            });
        }

        console.log('[CSV] ✅ Cabeçalho válido');

        // Processar cada linha de dados
        const successfulImports = [];
        const errors = [];

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            console.log(`[CSV] Processando linha ${i}: ${line}`);

            const parts = line.split(';');
            if (parts.length !== 5) {
                errors.push(`Linha ${i + 1}: Formato inválido (esperado 5 colunas, encontrado ${parts.length})`);
                continue;
            }

            const [cargo, tema, conteudo, arquivo_origem, pagina] = parts.map(p => p.trim());

            if (!conteudo) {
                errors.push(`Linha ${i + 1}: Conteúdo não pode estar vazio`);
                continue;
            }

            try {
                const target_cargo = cargo ? JSON.stringify(cargo.split('|').map(c => c.trim())) : JSON.stringify([]);
                const target_canal = JSON.stringify([]);
                
                const result = await new Promise((resolve, reject) => {
                    db.run(`
                        INSERT INTO knowledge_pills (
                            target_cargo, 
                            target_canal, 
                            tema, 
                            conteudo, 
                            source_file, 
                            source_page
                        ) VALUES (?, ?, ?, ?, ?, ?)
                    `, [
                        target_cargo,
                        target_canal,
                        tema || '',
                        conteudo,
                        arquivo_origem || '',
                        pagina || ''
                    ], function (err) {
                        if (err) reject(err);
                        else resolve({ lastID: this.lastID });
                    });
                });

                successfulImports.push({
                    id: result.lastID,
                    conteudo: conteudo.substring(0, 50) + (conteudo.length > 50 ? '...' : ''),
                    cargo: cargo || 'N/A',
                    tema: tema || 'N/A'
                });

                console.log(`[CSV] ✅ Linha ${i} importada com sucesso, ID: ${result.lastID}`);

            } catch (dbError) {
                console.error(`[CSV] ❌ Erro ao inserir linha ${i}:`, dbError);
                errors.push(`Linha ${i + 1}: Erro ao salvar no banco de dados - ${dbError.message}`);
            }
        }

        const totalProcessed = lines.length - 1;
        const successCount = successfulImports.length;
        const errorCount = errors.length;

        console.log('[CSV] === RESULTADO DO IMPORT ===');
        console.log('[CSV] Total processado:', totalProcessed);
        console.log('[CSV] Sucessos:', successCount);
        console.log('[CSV] Erros:', errorCount);

        if (successCount === 0) {
            return res.status(400).json({
                error: 'Nenhuma pílula foi importada com sucesso',
                details: errors
            });
        }

        res.json({
            message: `Import concluído! ${successCount} pílulas importadas${errorCount > 0 ? `, ${errorCount} erros encontrados` : ''}`,
            imported: successfulImports,
            errors: errors,
            stats: {
                total: totalProcessed,
                success: successCount,
                errors: errorCount
            }
        });

    } catch (error) {
        console.error('[CSV] ❌ Erro geral no import:', error);
        res.status(500).json({ 
            error: 'Erro interno do servidor ao processar CSV',
            details: error.message 
        });
    }
};

const importPillsCsvContentController = (req, res) => {
    console.log('[DIAGNÓSTICO CSV CONTENT] === INÍCIO DO DIAGNÓSTICO ===');
    console.log('[DIAGNÓSTICO CSV CONTENT] req.body:', JSON.stringify(req.body, null, 2));
    
    const { csvContent } = req.body;
    
    if (!csvContent) {
        return res.status(400).json({ 
            error: "Campo 'csvContent' é obrigatório.",
            example: {
                csvContent: "CARGO;TEMA;CONTEUDO;ARQUIVO_DE_ORIGEM;PAGINA\nAnalista;Tema 1;Conteúdo da pílula;arquivo.pdf;1"
            }
        });
    }
    
    console.log('[DIAGNÓSTICO CSV CONTENT] Conteúdo CSV recebido, tamanho:', csvContent.length);
    processCsvData(csvContent, res);
};

const debugCsvUploadController = (req, res) => {
    console.log('[DEBUG] === ANÁLISE COMPLETA DA REQUISIÇÃO ===');
    console.log('[DEBUG] Method:', req.method);
    console.log('[DEBUG] Headers:', JSON.stringify(req.headers, null, 2));
    console.log('[DEBUG] Body:', JSON.stringify(req.body, null, 2));
    console.log('[DEBUG] Files:', req.files);
    console.log('[DEBUG] File:', req.file);
    console.log('[DEBUG] Params:', req.params);
    console.log('[DEBUG] Query:', req.query);
    
    res.status(200).json({
        message: 'Debug realizado com sucesso',
        received: {
            method: req.method,
            contentType: req.headers['content-type'],
            contentLength: req.headers['content-length'],
            hasFile: !!req.file,
            hasFiles: !!req.files,
            bodyKeys: Object.keys(req.body || {}),
            body: req.body
        }
    });
};

// Função para processar CSV de string (JSON)
const processCsvData = (csvData, res) => {
    console.log('[DIAGNÓSTICO CSV DATA] Processando dados CSV...');
    console.log('[DIAGNÓSTICO CSV DATA] Tamanho dos dados:', csvData.length);
    console.log('[DIAGNÓSTICO CSV DATA] Primeiros 200 caracteres:', csvData.substring(0, 200));
    
    const pills = [];
    const csvStream = Readable.from(csvData);

    csvStream
        .pipe(csv({ 
            separator: ';',
            headers: ['CARGO', 'TEMA', 'CONTEUDO', 'ARQUIVO_DE_ORIGEM', 'PAGINA'],
            skipEmptyLines: true
        }))
        .on('data', (row) => {
            console.log('[DIAGNÓSTICO CSV DATA] Linha lida:', row);
            if (row.CONTEUDO && row.CONTEUDO.trim()) {
                pills.push({
                    target_cargo: JSON.stringify(row.CARGO ? row.CARGO.split('|') : []),
                    target_canal: JSON.stringify([]),
                    tema: row.TEMA || '',
                    conteudo: row.CONTEUDO.trim(),
                    source_file: row.ARQUIVO_DE_ORIGEM || '',
                    source_page: row.PAGINA || ''
                });
            }
        })
        .on('end', () => {
            console.log('[DIAGNÓSTICO CSV DATA] Total de pílulas processadas:', pills.length);
            savePillsToDatabase(pills, res);
        })
        .on('error', (error) => {
            console.error('[DIAGNÓSTICO CSV DATA] Erro no processamento do CSV:', error);
            res.status(500).json({ error: 'Erro ao processar dados CSV.' });
        });
};

// Função para salvar no banco de dados
const savePillsToDatabase = async (pills, res) => {
    if (pills.length === 0) {
        return res.status(400).json({ error: "Nenhuma pílula válida encontrada no CSV." });
    }

    try {
        const sql = `INSERT INTO knowledge_pills (target_cargo, target_canal, tema, conteudo, source_file, source_page) VALUES (?, ?, ?, ?, ?, ?)`;
        
        let successCount = 0;
        let errorCount = 0;

        for (const pill of pills) {
            try {
                await new Promise((resolve, reject) => {
                    db.run(sql, [
                        pill.target_cargo,
                        pill.target_canal,
                        pill.tema,
                        pill.conteudo,
                        pill.source_file,
                        pill.source_page
                    ], function (err) {
                        if (err) reject(err);
                        else resolve({ id: this.lastID });
                    });
                });
                successCount++;
            } catch (insertError) {
                console.error('[DIAGNÓSTICO CSV] Erro ao inserir pílula:', insertError);
                errorCount++;
            }
        }

        res.status(200).json({
            message: `Importação concluída! ${successCount} pílulas importadas com sucesso.`,
            details: {
                total_processadas: pills.length,
                sucesso: successCount,
                erros: errorCount
            }
        });

    } catch (error) {
        console.error('[DIAGNÓSTICO CSV] Erro geral na importação:', error);
        res.status(500).json({ error: 'Erro ao importar pílulas do CSV.' });
    }
};

const getPillByIdController = async (req, res) => {
    const { id } = req.params;
    try {
        const pill = await dbGet("SELECT * FROM knowledge_pills WHERE id = ?", [id]);
        if (!pill) {
            return res.status(404).json({ error: 'Pílula não encontrada.' });
        }
        res.status(200).json(pill);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar pílula.' });
    }
};

const sendPillToTelegramController = async (req, res) => {
    const { id } = req.params;
    try {
        const pill = await dbGet("SELECT * FROM knowledge_pills WHERE id = ?", [id]);
        if (!pill) {
            return res.status(404).json({ error: 'Pílula não encontrada.' });
        }

        const message = `💊📚 **${pill.tema || 'Pílula de Conhecimento'}**\n\n${pill.conteudo}`;
        
        const fileId = await sendFileAndGetId(message);
        res.status(200).json({ 
            message: 'Pílula enviada para o Telegram com sucesso!',
            fileId: fileId
        });
    } catch (error) {
        console.error('Erro ao enviar pílula para Telegram:', error);
        res.status(500).json({ error: 'Erro ao enviar pílula para o Telegram.' });
    }
};

const syncMediaController = async (req, res) => {
    const adminId = process.env.ADMIN_TELEGRAM_ID || '1318210843';
    try {
        const uniqueFilesToSync = await dbAll("SELECT DISTINCT source_file FROM knowledge_pills WHERE source_file != '' AND (telegram_file_id IS NULL OR telegram_file_id = '')");
        
        if (uniqueFilesToSync.length === 0) {
            return res.status(200).json({ message: "Nenhum arquivo novo para sincronizar." });
        }
        
        let syncedFileCount = 0;
        let errors = [];
        
        for (const fileRecord of uniqueFilesToSync) {
            const filename = fileRecord.source_file;
            const filePath = path.join('uploads', 'pills_media', filename);
            
            try {
                console.log(`Sincronizando arquivo: ${filename}`);
                const fileId = await sendFileAndGetId(filePath, adminId);
                
                if (fileId) {
                    await dbRun("UPDATE knowledge_pills SET telegram_file_id = ? WHERE source_file = ?", [fileId, filename]);
                    syncedFileCount++;
                    console.log(`✅ Arquivo ${filename} sincronizado com file_id: ${fileId}`);
                } else {
                    console.log(`❌ Não foi possível obter file_id para: ${filename}`);
                    errors.push(filename);
                }
            } catch (error) {
                console.error(`❌ Falha ao sincronizar o arquivo ${filename}:`, error);
                errors.push(filename);
            }
        }
        
        let message = `${syncedFileCount} arquivo(s) único(s) foram sincronizados com sucesso.`;
        if (errors.length > 0) {
            message += ` Falha ao sincronizar: ${errors.join(', ')}. Verifique se os arquivos existem na pasta uploads/pills_media/`;
        }
        
        res.status(200).json({ 
            message,
            details: {
                total: uniqueFilesToSync.length,
                synced: syncedFileCount,
                errors: errors.length,
                errorFiles: errors
            }
        });
        
    } catch (error) {
        console.error('❌ Erro durante o processo de sincronização:', error);
        res.status(500).json({ error: "Erro durante o processo de sincronização." });
    }
};

const manualSendPillsController = async (req, res) => {
    try {
        await manualSendAndResetScheduler();
        res.status(200).json({ message: 'Envio manual de pílulas executado com sucesso!' });
    } catch (error) {
        console.error('Erro no envio manual:', error);
        res.status(500).json({ error: 'Erro ao executar envio manual de pílulas.' });
    }
};

export default {
    listPillsController,
    createPillController,
    updatePillController,
    deletePillController,
    importPillsCsvController,
    importPillsCsvContentController,
    debugCsvUploadController,
    getPillByIdController,
    sendPillToTelegramController,
    manualSendPillsController,
    syncMediaController
};
