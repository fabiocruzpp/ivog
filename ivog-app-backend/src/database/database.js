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
          { chave: 'pills_broadcast_interval_minutes', valor: '60' }
        ];
        const sql = `INSERT OR IGNORE INTO configuracoes (chave, valor) VALUES (?, ?)`;
        defaultConfigs.forEach(config => {
          db.run(sql, [config.chave, config.valor]);
        });
        console.log('Configurações iniciais verificadas/inseridas.');
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
            is_admin BOOLEAN DEFAULT FALSE
        )`, (err) => { if (err) console.error("Erro ao criar tabela 'usuarios':", err.message); });
    
        db.run("ALTER TABLE usuarios ADD COLUMN is_admin BOOLEAN DEFAULT FALSE", (err) => {
            if (err && !err.message.includes('duplicate column name')) {
                console.error("Erro ao adicionar coluna 'is_admin':", err.message);
            }
        });
        
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
            telegram_id TEXT NOT NULL,
            id_simulado INTEGER NOT NULL,
            pontos INTEGER NOT NULL,
            total_perguntas INTEGER NOT NULL,
            data TEXT NOT NULL,
            FOREIGN KEY (id_simulado) REFERENCES simulados (id_simulado)
        )`, (err) => { if (err) console.error("Erro ao criar tabela 'resultados':", err.message); });
    
        db.run(`CREATE TABLE IF NOT EXISTS configuracoes (
            chave TEXT PRIMARY KEY,
            valor TEXT
        )`, (err) => { if (err) console.error("Erro ao criar tabela 'configuracoes':", err.message); });
    
        db.run(`CREATE TABLE IF NOT EXISTS desafios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            titulo TEXT NOT NULL,
            descricao TEXT,
            publico_alvo_json TEXT,
            data_inicio TEXT NOT NULL,
            data_fim TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'ativo',
            num_perguntas INTEGER DEFAULT 10
        )`, (err) => { if (err) console.error("Erro ao criar tabela 'desafios':", err.message); });
    
        db.run(`CREATE TABLE IF NOT EXISTS desafio_filtros (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            desafio_id INTEGER NOT NULL,
            tipo_filtro TEXT NOT NULL,
            valor_filtro TEXT NOT NULL,
            FOREIGN KEY (desafio_id) REFERENCES desafios (id) ON DELETE CASCADE
        )`, (err) => { if (err) console.error("Erro ao criar tabela 'desafio_filtros':", err.message); });
    
        db.run(`CREATE TABLE IF NOT EXISTS perguntas (
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
          )`, (err) => {
          if (err) console.error("Erro ao criar tabela 'perguntas':", err.message);
        });

        db.run(`CREATE TABLE IF NOT EXISTS knowledge_pills (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            target_cargo TEXT,
            target_canal TEXT,
            tema TEXT,
            conteudo TEXT NOT NULL,
            source_file TEXT,
            source_page TEXT,
            telegram_file_id TEXT,
            last_sent_at TEXT
        )`, (err) => { if (err) console.error("Erro ao criar tabela 'knowledge_pills':", err.message); });
    
        db.run("CREATE INDEX IF NOT EXISTS idx_respostas_telegram ON respostas_simulado (telegram_id);");
        db.run("CREATE INDEX IF NOT EXISTS idx_simulados_telegram ON simulados (telegram_id);");
        db.run("CREATE INDEX IF NOT EXISTS idx_resultados_telegram ON resultados (telegram_id);");
        
        console.log("Verificação de tabelas e índices concluída.");
        seedInitialConfigs();
        seedSuperAdmin();
    });
};

export default db;