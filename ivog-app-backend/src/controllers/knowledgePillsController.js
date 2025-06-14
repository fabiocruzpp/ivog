import db from '../database/database.js';
import { promisify } from 'util';
import csv from 'csv-parser';
import { Readable } from 'stream';
import { sendFileAndGetId } from '../services/telegramService.js';
import { triggerPillSend } from '../services/schedulerService.js';
import path from 'path';

const dbAll = promisify(db.all.bind(db));
const dbRun = promisify(db.run.bind(db));
const dbGet = promisify(db.get.bind(db));

export const listPillsController = async (req, res) => {
    try {
        const pills = await dbAll("SELECT * FROM knowledge_pills ORDER BY id DESC");
        res.status(200).json(pills);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao listar pílulas do conhecimento.' });
    }
};

export const createPillController = async (req, res) => {
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

export const updatePillController = async (req, res) => {
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

export const deletePillController = async (req, res) => {
    const { id } = req.params;
    try {
        await dbRun("DELETE FROM knowledge_pills WHERE id = ?", [id]);
        res.status(200).json({ message: 'Pílula deletada com sucesso.' });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao deletar pílula.' });
    }
};

export const bulkDeletePillsController = async (req, res) => {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: "Uma lista de IDs de pílulas é necessária." });
    }
    const placeholders = ids.map(() => '?').join(',');
    const sql = `DELETE FROM knowledge_pills WHERE id IN (${placeholders})`;
    try {
        await dbRun(sql, ids);
        res.status(200).json({ message: `${ids.length} pílulas foram deletadas com sucesso.` });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao deletar pílulas em massa.' });
    }
};

export const importPillsCsvController = (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "Nenhum arquivo CSV foi enviado." });
    }
    const pills = [];
    const bufferStream = new Readable();
    bufferStream.push(req.file.buffer);
    bufferStream.push(null);
    bufferStream
        .pipe(csv({ 
            separator: ';',
            mapHeaders: ({ header }) => header
                .trim()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toUpperCase()
        }))
        .on('data', (row) => {
            console.log('[DIAGNÓSTICO CSV PÍLULAS] Linha lida:', row);
            if (row.CONTEUDO) {
                pills.push({
                    target_cargo: JSON.stringify(row.CARGO ? row.CARGO.split('|').map(c => c.trim()) : []),
                    target_canal: JSON.stringify(row.CANAL ? row.CANAL.split('|').map(c => c.trim()) : []),
                    tema: row.TEMA || '',
                    conteudo: row.CONTEUDO,
                    source_file: row['ARQUIVO DE ORIGEM'] || '',
                    source_page: row['PAGINA'] || '',
                });
            }
        })
        .on('end', async () => {
            if (pills.length === 0) {
                return res.status(400).json({ error: "Nenhuma pílula válida encontrada no arquivo CSV. Verifique se o separador é ';' e se a coluna 'CONTEUDO' está preenchida e com o nome correto." });
            }
            try {
                await dbRun('BEGIN TRANSACTION');
                const stmt = db.prepare(`INSERT INTO knowledge_pills (target_cargo, target_canal, tema, conteudo, source_file, source_page) VALUES (?, ?, ?, ?, ?, ?)`);
                for (const pill of pills) {
                    await new Promise((resolve, reject) => {
                        stmt.run(Object.values(pill), (err) => {
                            if (err) return reject(err);
                            resolve();
                        });
                    });
                }
                stmt.finalize();
                await dbRun('COMMIT');
                res.status(201).json({ message: `${pills.length} pílulas importadas com sucesso.` });
            } catch (dbError) {
                await dbRun('ROLLBACK');
                res.status(500).json({ error: "Falha ao salvar pílulas no banco de dados." });
            }
        });
};

export const syncMediaController = async (req, res) => {
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
                }
            } catch (error) {
                console.error(`Falha ao sincronizar o arquivo ${filename}`);
                errors.push(filename);
            }
        }
        let message = `${syncedFileCount} arquivo(s) único(s) foram sincronizados com sucesso.`;
        if (errors.length > 0) {
            message += ` Falha ao sincronizar: ${errors.join(', ')}. Verifique se os arquivos existem na pasta uploads/pills_media/`;
        }
        res.status(200).json({ message });
    } catch (error) {
        res.status(500).json({ error: "Erro durante o processo de sincronização." });
    }
};

// NOVO CONTROLLER
export const sendPillNowController = async (req, res) => {
    try {
        const result = await triggerPillSend();
        if (result.success) {
            res.status(200).json({ message: result.message });
        } else {
            res.status(409).json({ error: result.message }); // 409 Conflict, por exemplo, se já estiver rodando ou desabilitado
        }
    } catch (error) {
        res.status(500).json({ error: 'Erro ao tentar o disparo avulso.' });
    }
};