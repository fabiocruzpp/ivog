import db from '../database/database.js';
import { promisify } from 'util';

// Transforma os métodos de callback do DB em Promises para usar com async/await
const dbGet = promisify(db.get.bind(db));
const dbRun = promisify(db.run.bind(db));

/**
 * Busca e retorna o perfil de um usuário.
 */
export const getUserProfile = async (req, res) => {
  try {
    const { telegram_id } = req.params;
    const sql = "SELECT * FROM usuarios WHERE telegram_id = ?";
    const user = await dbGet(sql, [telegram_id]);
    
    if (user) {
      res.status(200).json(user);
    } else {
      res.status(404).json({ error: 'Usuário não encontrado.' });
    }
  } catch (error) {
    console.error("Erro ao buscar perfil de usuário:", error.message);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
};

/**
 * Registra um novo usuário ou atualiza um existente (lógica de "upsert").
 */
export const registerOrUpdateUser = async (req, res) => {
  try {
    const data = req.body;
    const { telegram_id, first_name } = data;

    if (!telegram_id) {
      return res.status(400).json({ error: 'Telegram ID é obrigatório.' });
    }

    const findUserSql = "SELECT * FROM usuarios WHERE telegram_id = ?";
    const userExists = await dbGet(findUserSql, [telegram_id]);

    // 1. Se o usuário não existir, cria um registro básico.
    if (!userExists) {
      const insertSql = "INSERT INTO usuarios (telegram_id, first_name, data_cadastro) VALUES (?, ?, ?)";
      const dataCadastro = new Date().toISOString();
      await dbRun(insertSql, [telegram_id, first_name || `User ${telegram_id}`, dataCadastro]);
    }

    // 2. Prepara os campos para a atualização (para usuários novos e existentes).
    const possibleFields = ['ddd', 'canal_principal', 'tipo_parceiro', 'rede_parceiro', 'loja_revenda', 'cargo', 'first_name'];
    const fieldsToUpdate = {};

    for (const field of possibleFields) {
      if (data[field] !== undefined) {
        fieldsToUpdate[field] = data[field];
      }
    }

    // Lógica de negócio para limpar campos dependentes
    if (fieldsToUpdate.canal_principal === "Loja Própria") {
      fieldsToUpdate.tipo_parceiro = null;
      fieldsToUpdate.rede_parceiro = null;
    }
    if (fieldsToUpdate.tipo_parceiro && fieldsToUpdate.tipo_parceiro !== "Parceiro Lojas") {
      fieldsToUpdate.rede_parceiro = null;
    }

    // 3. Se houver campos para atualizar, monta e executa a query de UPDATE.
    const setClauseParts = Object.keys(fieldsToUpdate).map(key => `${key} = ?`);
    if (setClauseParts.length > 0) {
      const setClause = setClauseParts.join(', ');
      const values = [...Object.values(fieldsToUpdate), telegram_id];
      const updateSql = `UPDATE usuarios SET ${setClause} WHERE telegram_id = ?`;
      await dbRun(updateSql, values);
    }
    
    // 4. Busca o usuário final (já criado ou atualizado) e o retorna.
    const finalUser = await dbGet(findUserSql, [telegram_id]);
    res.status(200).json(finalUser);

  } catch (error) {
    console.error("Erro ao registrar ou atualizar usuário:", error.message);
    res.status(500).json({ error: 'Erro interno do servidor ao processar usuário.' });
  }
};