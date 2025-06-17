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
      console.log('[USER PROFILE CONTROLLER] Usuário não encontrado, criando perfil temporário');
      
      const tempUser = {
        id: parseInt(telegramUserId),
        name: 'Usuário Telegram',
        email: `user${telegramUserId}@ivog.com`,
        role: 'user',
        avatar: null,
        telegram_id: parseInt(telegramUserId),
        first_name: 'Usuário',
        ddd: '91',
        canal_principal: 'Loja Própria',
        cargo: 'GG',
        loja_revenda: 'Loja Padrão',
        created_at: new Date().toISOString()
      };
      
      console.log('[USER PROFILE CONTROLLER] Retornando perfil temporário:', tempUser);
      res.status(200).json(tempUser);
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
    
    const { telegram_id, first_name, username, ddd, canal_principal, cargo, loja_revenda } = req.body;
    
    if (!telegram_id || !first_name) {
      return res.status(400).json({ error: 'telegram_id e first_name são obrigatórios' });
    }
    
    // Verificar se o usuário já existe
    const existingUser = await dbGet("SELECT * FROM usuarios WHERE telegram_id = ?", [telegram_id]);
    
    if (existingUser) {
      // Atualizar usuário existente
      const updateSql = `
        UPDATE usuarios 
        SET first_name = ?, username = ?, ddd = ?, canal_principal = ?, cargo = ?, loja_revenda = ?
        WHERE telegram_id = ?
      `;
      
      await dbRun(updateSql, [first_name, username, ddd, canal_principal, cargo, loja_revenda, telegram_id]);
      
      console.log('[REGISTER USER] Usuário atualizado:', telegram_id);
      res.status(200).json({ message: 'Usuário atualizado com sucesso', user: { telegram_id, first_name } });
    } else {
      // Criar novo usuário
      const insertSql = `
        INSERT INTO usuarios (telegram_id, first_name, username, ddd, canal_principal, cargo, loja_revenda, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      await dbRun(insertSql, [
        telegram_id, 
        first_name, 
        username, 
        ddd || '91', 
        canal_principal || 'Loja Própria', 
        cargo || 'GG', 
        loja_revenda || 'Loja Padrão',
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
