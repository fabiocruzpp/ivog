import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

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
    
    // --- GARANTE QUE A COLUNA num_perguntas EXISTE ---
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

    db.run("CREATE INDEX IF NOT EXISTS idx_respostas_telegram ON respostas_simulado (telegram_id);");
    db.run("CREATE INDEX IF NOT EXISTS idx_simulados_telegram ON simulados (telegram_id);");
    db.run("CREATE INDEX IF NOT EXISTS idx_resultados_telegram ON resultados (telegram_id);");
    console.log("Índices de performance verificados/criados.");

    seedInitialConfigs();
  });
};

export default db;