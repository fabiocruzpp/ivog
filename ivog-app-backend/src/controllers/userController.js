import db from '../database/database.js';
import { promisify } from 'util';

const dbGet = promisify(db.get.bind(db));
const dbAll = promisify(db.all.bind(db));
const dbRun = promisify(db.run.bind(db));

export const getUserProfileController = async (req, res) => {
  try {
    console.log('[USER PROFILE CONTROLLER] Requisição recebida');
    
    const telegramUserId = req.headers['x-telegram-user-id'];
    console.log('[USER PROFILE CONTROLLER] telegram_id dos headers:', telegramUserId);
    
    if (!telegramUserId) {
      console.log('[USER PROFILE CONTROLLER] telegram_id não encontrado nos headers');
      return res.status(400).json({ error: 'telegram_id é obrigatório' });
    }
    
    const sql = "SELECT * FROM usuarios WHERE telegram_id = ?";
    const realUser = await dbGet(sql, [telegramUserId]);
    console.log('[USER PROFILE CONTROLLER] Usuário encontrado no banco:', realUser);
    
    if (realUser) {
      const userFormatted = {
        ...realUser,
        id: realUser.telegram_id,
        name: realUser.first_name,
        email: realUser.email || `user${realUser.telegram_id}@ivog.com`,
        avatar: realUser.avatar || null,
        role: 'user'
      };
      
      console.log('[USER PROFILE CONTROLLER] Retornando usuário real:', userFormatted);
      res.status(200).json(userFormatted);
    } else {
      // CORREÇÃO: Se o usuário não for encontrado, retorna 404.
      // O frontend (userStore) tratará esse status para redirecionar ao registro.
      console.log('[USER PROFILE CONTROLLER] Usuário não encontrado, retornando 404');
      res.status(404).json({ error: 'Usuário não encontrado' });
    }
    
  } catch (error) {
    console.error('[USER PROFILE CONTROLLER] Erro:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const getUserProfile = async (req, res) => {
  try {
    const { telegram_id } = req.params;
    console.log('[GET USER PROFILE] Buscando usuário com telegram_id:', telegram_id);
    
    const sql = "SELECT * FROM usuarios WHERE telegram_id = ?";
    const user = await dbGet(sql, [telegram_id]);
    
    console.log('[GET USER PROFILE] Usuário encontrado:', user);
    
    if (user) {
      const userFormatted = {
        ...user,
        id: user.telegram_id,
        name: user.first_name,
        email: user.email || `user${user.telegram_id}@ivog.com`,
        avatar: user.avatar || null
      };
      
      console.log('[GET USER PROFILE] Usuário formatado para frontend:', userFormatted);
      res.status(200).json(userFormatted);
    } else {
      console.log('[GET USER PROFILE] Usuário não encontrado na base de dados');
      res.status(404).json({ error: 'Usuário não encontrado.' });
    }
  } catch (error) {
    console.error("Erro ao buscar perfil de usuário:", error.message);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
};

export const registerOrUpdateUser = async (req, res) => {
  try {
    console.log('[REGISTER USER] Requisição recebida:', req.body);
    
    // 1. ADICIONADO `rede_parceiro` para ser recebido do frontend.
    const { telegram_id, first_name, ddd, canal_principal, tipo_parceiro, rede_parceiro, cargo, loja_revenda, matricula } = req.body;
    
    if (!telegram_id || !first_name) {
      return res.status(400).json({ error: 'telegram_id e first_name são obrigatórios' });
    }
    
    const existingUser = await dbGet("SELECT * FROM usuarios WHERE telegram_id = ?", [telegram_id]);
    
    if (existingUser) {
      // 2. QUERY SQL ATUALIZADA para incluir o campo 'rede_parceiro'
      const updateSql = `
        UPDATE usuarios 
        SET first_name = ?, ddd = ?, canal_principal = ?, tipo_parceiro = ?, rede_parceiro = ?, cargo = ?, loja_revenda = ?, matricula = ?
        WHERE telegram_id = ?
      `;
      
      // 3. PARÂMETROS ATUALIZADOS para passar o valor de 'rede_parceiro'
      await dbRun(updateSql, [first_name, ddd, canal_principal, tipo_parceiro, rede_parceiro, cargo, loja_revenda, matricula, telegram_id]);
      
      console.log('[REGISTER USER] Usuário atualizado:', telegram_id);
      res.status(200).json({ message: 'Usuário atualizado com sucesso', user: { telegram_id, first_name } });
    } else {
      // 4. INSERT SQL ATUALIZADO para incluir 'rede_parceiro' no cadastro de novos usuários.
      const insertSql = `
        INSERT INTO usuarios (telegram_id, first_name, ddd, canal_principal, tipo_parceiro, rede_parceiro, cargo, loja_revenda, matricula, data_cadastro)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      await dbRun(insertSql, [
        telegram_id, 
        first_name, 
        ddd || null, 
        canal_principal || null, 
        tipo_parceiro || null,
        rede_parceiro || null, // 5. Valor de 'rede_parceiro' adicionado.
        cargo || null, 
        loja_revenda || null,
        matricula || null,
        new Date().toISOString()
      ]);
      
      console.log('[REGISTER USER] Novo usuário criado:', telegram_id);
      res.status(201).json({ message: 'Usuário criado com sucesso', user: { telegram_id, first_name } });
    }
    
  } catch (error) {
    console.error('[REGISTER USER] Erro:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};