import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import csv from 'csv-parser';

// Correção para __dirname em ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, '..', '..', 'dados.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados SQLite:', err.message);
  } else {
    console.log('Conexão com o banco de dados SQLite estabelecida com sucesso.');
    initializeDb(); // Função que fará toda a configuração inicial
  }
});

// Função para migrar perguntas do CSV para o banco de dados (VERSÃO CORRIGIDA)
const migrateQuestionsFromCsv = () => {
    return new Promise((resolve, reject) => {
        const questionsCsvPath = path.resolve(__dirname, '..', '..', 'Base-Perguntas-IvoGiroV.csv');
        const questions = [];
        fs.createReadStream(questionsCsvPath)
            .pipe(csv({ separator: ';' }))
            .on('data', (row) => {
                try {
                    const alternativas = row.ALTERNATIVAS ? row.ALTERNATIVAS.split('|').map(alt => alt.trim()).filter(Boolean) : [];
                    if (!row.PERGUNTA || alternativas.length === 0 || !row.CORRETA) {
                        return;
                    }
                    let respostaCorretaTexto = '';
                    const respostaCorretaInput = row.CORRETA.trim().toLowerCase();
                    if (respostaCorretaInput.length === 1 && 'abcdefghijklmnopqrstuvwxyz'.includes(respostaCorretaInput)) {
                        const index = respostaCorretaInput.charCodeAt(0) - 'a'.charCodeAt(0);
                        if (index >= 0 && index < alternativas.length) {
                            respostaCorretaTexto = alternativas[index];
                        }
                    } else {
                        const matchExato = alternativas.find(alt => alt.trim().toLowerCase() === respostaCorretaInput);
                        if (matchExato) {
                            respostaCorretaTexto = matchExato;
                        }
                    }
                    if (!respostaCorretaTexto) return;
                    
                    questions.push({
                        pergunta_raw_csv: row.PERGUNTA.trim(),
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
                    console.error('Erro processando linha do CSV para migração:', row, error);
                }
            })
            .on('end', () => {
                if (questions.length === 0) {
                    return resolve();
                }

                db.run('BEGIN TRANSACTION', (beginErr) => {
                    if (beginErr) return reject(beginErr);

                    const stmt = db.prepare(`INSERT INTO perguntas (pergunta_raw_csv, pergunta_formatada_display, alternativas, correta, publico, canal, tema, subtema, feedback, fonte) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

                    const insertNext = (index) => {
                        if (index >= questions.length) {
                            // Todas as inserções foram bem-sucedidas
                            stmt.finalize((finalizeErr) => {
                                if (finalizeErr) return db.run('ROLLBACK', () => reject(finalizeErr));
                                db.run('COMMIT', (commitErr) => {
                                    if (commitErr) return db.run('ROLLBACK', () => reject(commitErr));
                                    console.log('Migração de perguntas do CSV para o banco de dados concluída com sucesso.');
                                    resolve();
                                });
                            });
                            return;
                        }
                        
                        stmt.run(Object.values(questions[index]), (runErr) => {
                            if (runErr) {
                                // Se uma inserção falhar, reverte tudo
                                stmt.finalize();
                                return db.run('ROLLBACK', () => reject(runErr));
                            }
                            insertNext(index + 1);
                        });
                    };
                    
                    insertNext(0);
                });
            })
            .on('error', (error) => reject(error));
    });
};

const initializeDb = () => {
  const seedInitialConfigs = () => {
    const defaultConfigs = [
      { chave: 'simulado_livre_ativado', valor: 'true' },
      { chave: 'feedback_detalhado_ativo', valor: 'false' },
      { chave: 'num_max_perguntas_simulado', valor: '20' },
      { chave: 'desafio_ativo', valor: 'false' },
      { chave: 'desafio_tipo', valor: '' },
      { chave: 'desafio_valor', valor: '' }
    ];
    const sql = `INSERT OR IGNORE INTO configuracoes (chave, valor) VALUES (?, ?)`;
    defaultConfigs.forEach(config => {
      db.run(sql, [config.chave, config.valor], (err) => {
        if (err) console.error(`Erro ao inserir config padrão '${config.chave}':`, err.message);
      });
    });
    console.log('Configurações iniciais verificadas/inseridas.');
  };

  db.serialize(() => {
    db.run('PRAGMA foreign_keys = ON', (err) => {
      if (err) console.error('Erro ao ativar PRAGMA foreign_keys:', err.message);
      else console.log('PRAGMA foreign_keys ativado.');
    });

    db.run(`
      CREATE TABLE IF NOT EXISTS desafios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        titulo TEXT NOT NULL,
        descricao TEXT,
        publico_alvo_json TEXT,
        data_inicio TEXT NOT NULL,
        data_fim TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'ativo'
      )
    `, (err) => {
      if (err) console.error("Erro ao criar/alterar tabela 'desafios':", err.message);
      else console.log("Tabela 'desafios' verificada/criada.");
    });
    
    db.run("ALTER TABLE desafios ADD COLUMN num_perguntas INTEGER DEFAULT 10", (err) => {
        if (err && !err.message.includes('duplicate column name')) {
            console.error("Erro ao adicionar coluna 'num_perguntas':", err.message);
        } else {
            console.log("Coluna 'num_perguntas' na tabela 'desafios' verificada/criada.");
        }
    });

    db.run(`
      CREATE TABLE IF NOT EXISTS desafio_filtros (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        desafio_id INTEGER NOT NULL,
        tipo_filtro TEXT NOT NULL,
        valor_filtro TEXT NOT NULL,
        FOREIGN KEY (desafio_id) REFERENCES desafios (id) ON DELETE CASCADE
      )
    `, (err) => {
      if (err) console.error("Erro ao criar tabela 'desafio_filtros':", err.message);
      else console.log("Tabela 'desafio_filtros' verificada/criada.");
    });

    db.run(`
      CREATE TABLE IF NOT EXISTS perguntas (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          pergunta_raw_csv TEXT,
          pergunta_formatada_display TEXT NOT NULL,
          alternativas TEXT NOT NULL,
          correta TEXT NOT NULL,
          publico TEXT,
          canal TEXT,
          tema TEXT,
          subtema TEXT,
          feedback TEXT,
          fonte TEXT
      )
    `, (err) => {
      if (err) {
        console.error("Erro ao criar tabela 'perguntas':", err.message);
      } else {
        console.log("Tabela 'perguntas' verificada/criada.");
        db.get("SELECT COUNT(*) as count FROM perguntas", async (err, row) => {
            if (err) return console.error("Erro ao contar perguntas para migração:", err.message);
            if (row.count === 0) {
                console.log("Tabela 'perguntas' está vazia. Iniciando migração do CSV...");
                try {
                    await migrateQuestionsFromCsv();
                } catch (migrationError) {
                    console.error("FALHA CRÍTICA na migração de perguntas do CSV:", migrationError);
                }
            } else {
                console.log(`Tabela 'perguntas' já contém ${row.count} registros. Migração não necessária.`);
            }
        });
      }
    });

    db.run("CREATE INDEX IF NOT EXISTS idx_respostas_telegram ON respostas_simulado (telegram_id);");
    db.run("CREATE INDEX IF NOT EXISTS idx_simulados_telegram ON simulados (telegram_id);");
    db.run("CREATE INDEX IF NOT EXISTS idx_resultados_telegram ON resultados (telegram_id);");
    console.log("Índices de performance verificados/criados.");

    seedInitialConfigs();
  });
};

export default db;