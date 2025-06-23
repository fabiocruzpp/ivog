import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import csv from 'csv-parser';
import bcrypt from 'bcrypt';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.resolve(__dirname, '..', '..', 'dados.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados SQLite:', err.message);
  } else {
    console.log('Conexão com o banco de dados SQLite estabelecida com sucesso.');
    initializeDb();
  }
});

const initializeDb = () => {
    const addMissingColumns = () => {
        db.run("ALTER TABLE simulados ADD COLUMN is_training BOOLEAN DEFAULT FALSE", (err) => {
            if (err && !err.message.includes('duplicate column name')) {
                console.error("Erro ao adicionar coluna 'is_training':", err.message);
            } else if (!err) {
                console.log("Coluna 'is_training' adicionada com sucesso à tabela simulados");
            }
        });
        db.run("ALTER TABLE usuarios ADD COLUMN matricula TEXT", (err) => {
             if (err && !err.message.includes('duplicate column name')) {
                console.error("Erro ao adicionar coluna 'matricula':", err.message);
            } else if (!err) {
                console.log("Coluna 'matricula' adicionada com sucesso à tabela usuarios");
            }
        });
    };

    const seedInitialConfigs = () => {
        const defaultConfigs = [
          { chave: 'simulado_livre_ativado', valor: 'true' },
          { chave: 'feedback_detalhado_ativo', valor: 'false' },
          { chave: 'num_max_perguntas_simulado', valor: '20' },
          { chave: 'desafio_ativo', valor: 'false' },
          { chave: 'desafio_tipo', valor: '' },
          { chave: 'desafio_valor', valor: '' },
          { chave: 'modo_treino_ativado', valor: 'true' },
          { chave: 'pills_broadcast_enabled', valor: 'true' },
          { chave: 'pills_broadcast_interval_minutes', valor: '60' },
          { chave: 'pills_quiet_time_enabled', valor: 'false' },
          { chave: 'pills_quiet_time_start', valor: '21:00' },
          { chave: 'pills_quiet_time_end', valor: '06:00' }
        ];
        const sql = `INSERT OR IGNORE INTO configuracoes (chave, valor) VALUES (?, ?)`;
        defaultConfigs.forEach(config => {
          db.run(sql, [config.chave, config.valor]);
        });
        console.log('Configurações iniciais verificadas/inseridas (incluindo horário silencioso).');
    };

    const seedSuperAdmin = async () => {
        const superAdminId = process.env.ADMIN_TELEGRAM_ID || '1318210843';
        const superAdminUser = process.env.ADMIN_USER || 'admin';
        const superAdminPass = process.env.ADMIN_PASSWORD || `${superAdminId}@Vivo2025`;
        db.get('SELECT * FROM admin_credentials WHERE username = ?', [superAdminUser], async (err, row) => {
          if (!row) {
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(superAdminPass, saltRounds);
            db.run('INSERT OR IGNORE INTO admin_credentials (username, password_hash, telegram_id) VALUES (?, ?, ?)', [superAdminUser, hashedPassword, superAdminId]);
            db.run('UPDATE usuarios SET is_admin = TRUE WHERE telegram_id = ?', [superAdminId]);
            console.log('Super Administrador inicial semeado no banco de dados.');
          }
        });
    };

    db.serialize(() => {
        db.run('PRAGMA foreign_keys = ON');

        db.run(`CREATE TABLE IF NOT EXISTS usuarios (
            telegram_id TEXT PRIMARY KEY,
            first_name TEXT,
            ddd TEXT,
            canal_principal TEXT,
            tipo_parceiro TEXT,
            rede_parceiro TEXT,
            loja_revenda TEXT,
            cargo TEXT,
            data_cadastro TEXT,
            photo_url TEXT,
            is_admin BOOLEAN DEFAULT FALSE,
            matricula TEXT
        )`, (err) => { if (err) console.error("Erro ao criar tabela 'usuarios':", err.message); });

        db.run(`CREATE TABLE IF NOT EXISTS admin_credentials (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            telegram_id TEXT UNIQUE NOT NULL
        )`, (err) => { if (err) console.error("Erro ao criar tabela 'admin_credentials':", err.message); });

        db.run(`CREATE TABLE IF NOT EXISTS simulados (
            id_simulado INTEGER PRIMARY KEY AUTOINCREMENT,
            telegram_id TEXT NOT NULL,
            data_inicio TEXT NOT NULL,
            contexto_desafio TEXT,
            is_training BOOLEAN DEFAULT FALSE
        )`, (err) => { if (err) console.error("Erro ao criar tabela 'simulados':", err.message); });

        db.run(`CREATE TABLE IF NOT EXISTS respostas_simulado (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            id_simulado INTEGER,
            telegram_id TEXT,
            pergunta TEXT,
            resposta_usuario TEXT,
            resposta_correta TEXT,
            acertou BOOLEAN,
            data TEXT,
            tema TEXT,
            subtema TEXT,
            FOREIGN KEY (id_simulado) REFERENCES simulados (id_simulado)
        )`, (err) => { if (err) console.error("Erro ao criar tabela 'respostas_simulado':", err.message); });

        db.run(`CREATE TABLE IF NOT EXISTS resultados (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            telegram_id TEXT UNIQUE NOT NULL,
            total_simulados_realizados INTEGER DEFAULT 0,
            total_perguntas_respondidas INTEGER DEFAULT 0,
            total_acertos INTEGER DEFAULT 0,
            FOREIGN KEY (telegram_id) REFERENCES usuarios (telegram_id)
        )`, (err) => { if (err) console.error("Erro ao criar tabela 'resultados':", err.message); });

         db.run(`CREATE TABLE IF NOT EXISTS desempenho_subtemas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            telegram_id TEXT NOT NULL,
            subtema TEXT NOT NULL,
            total_respostas INTEGER DEFAULT 0,
            acertos_brutos INTEGER DEFAULT 0,
            UNIQUE (telegram_id, subtema),
            FOREIGN KEY (telegram_id) REFERENCES usuarios (telegram_id)
        )`, (err) => { if (err) console.error("Erro ao criar tabela 'desempenho_subtemas':", err.message); });

        db.run(`CREATE TABLE IF NOT EXISTS configuracoes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            chave TEXT UNIQUE NOT NULL,
            valor TEXT
        )`, (err) => { if (err) console.error("Erro ao criar tabela 'configuracoes':", err.message); });

         db.run(`CREATE TABLE IF NOT EXISTS desafios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            titulo TEXT NOT NULL,
            descricao TEXT,
            data_inicio TEXT NOT NULL,
            data_fim TEXT NOT NULL,
            perguntas_ids TEXT,
            ativo BOOLEAN DEFAULT TRUE
        )`, (err) => { if (err) console.error("Erro ao criar tabela 'desafios':", err.message); });

        db.run(`CREATE TABLE IF NOT EXISTS desafio_participantes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            desafio_id INTEGER NOT NULL,
            telegram_id TEXT NOT NULL,
            data_participacao TEXT NOT NULL,
            UNIQUE (desafio_id, telegram_id),
            FOREIGN KEY (desafio_id) REFERENCES desafios (id),
            FOREIGN KEY (telegram_id) REFERENCES usuarios (telegram_id)
        )`, (err) => { if (err) console.error("Erro ao criar tabela 'desafio_participantes':", err.message); });

         db.run(`CREATE TABLE IF NOT EXISTS desafio_respostas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            desafio_id INTEGER NOT NULL,
            telegram_id TEXT NOT NULL,
            pergunta_id INTEGER NOT NULL,
            resposta_usuario TEXT,
            acertou BOOLEAN,
            data_resposta TEXT NOT NULL,
            FOREIGN KEY (desafio_id) REFERENCES desafios (id),
            FOREIGN KEY (telegram_id) REFERENCES usuarios (telegram_id)
        )`, (err) => { if (err) console.error("Erro ao criar tabela 'desafio_respostas':", err.message); });

        db.run(`CREATE TABLE IF NOT EXISTS pills (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            texto TEXT NOT NULL,
            data_criacao TEXT NOT NULL
        )`, (err) => { if (err) console.error("Erro ao criar tabela 'pills':", err.message); });


        addMissingColumns();
        seedInitialConfigs();
        seedSuperAdmin();
    });
};

export const loadQuestionsFromCsv = (filePath, callback) => {
    const questions = [];
    fs.createReadStream(filePath)
        .pipe(csv({ separator: ';' }))
        .on('data', (row) => {
            questions.push(row);
        })
        .on('end', () => {
            callback(null, questions);
        })
        .on('error', (error) => {
            callback(error);
        });
};

export default db;
