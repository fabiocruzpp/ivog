import db from '../database/database.js';
import { promisify } from 'util';
import csv from 'csv-parser';
import { Readable } from 'stream';
import { manualSendAndResetScheduler } from '../services/schedulerService.js';
import path from 'path';
import fs from 'fs';
import { writeFile } from 'fs/promises';

const dbAll = promisify(db.all.bind(db));
const dbRun = promisify(db.run.bind(db));
const dbGet = promisify(db.get.bind(db));

const listPillsController = async (req, res) => {
    try {
        const pills = await dbAll("SELECT * FROM knowledge_pills ORDER BY id DESC");
        const uploadPath = '/home/fabiocruzpp/ivog/ivog-app-backend/uploads/pills_media';
        const pillsWithFileStatus = pills.map(pill => {
            let fileExists = null;
            if (pill.source_file) {
                const filePath = path.join(uploadPath, pill.source_file);
                fileExists = fs.existsSync(filePath);
            }
            return { ...pill, fileExists };
        });
        res.status(200).json(pillsWithFileStatus);
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

        if (req.body && req.body.csvContent) {
            csvContent = req.body.csvContent;
            fileName = req.body.fileName || 'imported.csv';
            console.log('[CSV] ✅ Recebido via JSON, tamanho:', csvContent.length);
        } else if (req.file) {
            csvContent = req.file.buffer.toString('utf-8');
            fileName = req.file.originalname;
            console.log('[CSV] ✅ Recebido via arquivo, tamanho:', csvContent.length);
        } else {
            console.log('[CSV] ❌ Nenhum conteúdo CSV encontrado');
            return res.status(400).json({ error: 'Nenhum arquivo CSV enviado' });
        }

        const lines = csvContent.split(/\r?\n/).filter(line => line.trim() !== '');

        if (lines.length < 2) {
            return res.status(400).json({ error: 'CSV deve conter pelo menos uma linha de dados além do cabeçalho' });
        }

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

const manualSendPillsController = async (req, res) => {
    try {
        const result = await manualSendAndResetScheduler();
        if (result.success) {
            res.status(200).json({ message: result.message || 'Envio manual de pílulas executado com sucesso!' });
        } else {
            res.status(400).json({ error: result.message || 'Falha no envio manual de pílulas.' });
        }
    } catch (error) {
        console.error('Erro no envio manual:', error);
        res.status(500).json({ error: 'Erro ao executar envio manual de pílulas.' });
    }
};

const syncMediaController = async (req, res) => {
    try {
        const filesInDb = await dbAll("SELECT DISTINCT source_file FROM knowledge_pills WHERE source_file IS NOT NULL AND source_file != ''");

        if (filesInDb.length === 0) {
            return res.status(200).json({ message: "Nenhuma pílula com arquivo de origem para verificar." });
        }

        const filesFound = [];
        const filesMissing = [];
        const uploadPath = '/home/fabiocruzpp/ivog/ivog-app-backend/uploads/pills_media';

        for (const record of filesInDb) {
            const filename = record.source_file;
            const filePath = path.join(uploadPath, filename);

            if (fs.existsSync(filePath)) {
                filesFound.push(filename);
            } else {
                filesMissing.push(filename);
                console.warn(`[VERIFICAÇÃO DE MÍDIA] ❌ Arquivo não encontrado: ${filename}`);
            }
        }

        const message = `Verificação concluída. ${filesFound.length} arquivos encontrados. ${filesMissing.length} arquivos ausentes.`;
        console.log(`[VERIFICAÇÃO DE MÍDIA] ${message}`);

        res.status(200).json({
            message,
            details: {
                totalChecked: filesInDb.length,
                foundCount: filesFound.length,
                missingCount: filesMissing.length,
                missingFiles: filesMissing
            }
        });

    } catch (error) {
        console.error('❌ Erro durante o processo de verificação de mídia:', error);
        res.status(500).json({ error: "Erro durante o processo de verificação de mídia." });
    }
};

// ATUALIZADO com logs de diagnóstico
const uploadMediaController = async (req, res) => {
    console.log('\n[UPLOAD MÍDIA - DEBUG] === INÍCIO DA REQUISIÇÃO ===');
    console.log('[UPLOAD MÍDIA - DEBUG] req.method:', req.method);
    console.log('[UPLOAD MÍDIA - DEBUG] req.originalUrl:', req.originalUrl);
    console.log('[UPLOAD MÍDIA - DEBUG] Content-Type Header:', req.headers['content-type']);
    console.log('[UPLOAD MÍDIA - DEBUG] req.body:', req.body);
    console.log('[UPLOAD MÍDIA - DEBUG] req.files:', req.files);
    console.log('[UPLOAD MÍDIA - DEBUG] =================================\n');

    if (!req.files || req.files.length === 0) {
        console.log('[UPLOAD MÍDIA - DEBUG] ❌ NENHUM ARQUIVO ENCONTRADO EM req.files. Retornando erro 400.');
        return res.status(400).json({ error: 'Nenhum arquivo de mídia recebido pelo servidor.' });
    }

    const uploadPath = '/home/fabiocruzpp/ivog/ivog-app-backend/uploads/pills_media';
    const uploadedFiles = [];
    const errors = [];

    try {
        await fs.promises.mkdir(uploadPath, { recursive: true });
    } catch (dirError) {
        console.error(`[UPLOAD MÍDIA] ❌ Erro ao criar diretório ${uploadPath}:`, dirError);
        return res.status(500).json({ error: 'Erro interno ao preparar o diretório de upload.' });
    }

    for (const file of req.files) {
        const finalPath = path.join(uploadPath, file.originalname);
        try {
            await writeFile(finalPath, file.buffer);
            uploadedFiles.push(file.originalname);
            console.log(`[UPLOAD MÍDIA] ✅ Arquivo salvo: ${finalPath}`);
        } catch (error) {
            console.error(`[UPLOAD MÍDIA] ❌ Falha ao salvar ${file.originalname}:`, error);
            errors.push({ filename: file.originalname, error: error.message });
        }
    }

    if (uploadedFiles.length === 0) {
        return res.status(500).json({
            error: 'Nenhum arquivo pôde ser salvo com sucesso.',
            details: errors
        });
    }

    res.status(201).json({
        message: `${uploadedFiles.length} de ${req.files.length} arquivo(s) enviados com sucesso.`,
        uploaded: uploadedFiles,
        errors: errors
    });
};


export default {
    listPillsController,
    createPillController,
    updatePillController,
    deletePillController,
    importPillsCsvController,
    getPillByIdController,
    manualSendPillsController,
    syncMediaController,
    uploadMediaController
};