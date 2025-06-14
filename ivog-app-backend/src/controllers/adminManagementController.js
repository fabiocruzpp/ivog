import db from '../database/database.js';
import bcrypt from 'bcrypt';
import { promisify } from 'util';

const dbAll = promisify(db.all.bind(db));
const dbGet = promisify(db.get.bind(db));
const dbRun = promisify(db.run.bind(db));

export const listAdminsController = async (req, res) => {
    try {
        const admins = await dbAll("SELECT telegram_id, first_name FROM usuarios WHERE is_admin = TRUE");
        res.status(200).json(admins);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao listar administradores.' });
    }
};

export const addAdminController = async (req, res) => {
    const { telegram_id_to_add } = req.body;
    if (!telegram_id_to_add) {
        return res.status(400).json({ error: 'ID do Telegram é obrigatório.' });
    }

    try {
        const user = await dbGet("SELECT first_name FROM usuarios WHERE telegram_id = ?", [telegram_id_to_add]);
        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado na base. Ele precisa usar o bot pelo menos uma vez.' });
        }

        const username = user.first_name.replace(/\s+/g, '').toLowerCase() + telegram_id_to_add.slice(-4);
        const password = `${telegram_id_to_add}@Vivo2025`;
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        await dbRun('BEGIN TRANSACTION');
        await dbRun("UPDATE usuarios SET is_admin = TRUE WHERE telegram_id = ?", [telegram_id_to_add]);
        await dbRun("INSERT INTO admin_credentials (username, password_hash, telegram_id) VALUES (?, ?, ?)", [username, hashedPassword, telegram_id_to_add]);
        await dbRun('COMMIT');

        res.status(201).json({ 
            message: 'Administrador adicionado com sucesso!',
            newUser: { username, password } // Retorna a senha para o admin que está criando
        });

    } catch (error) {
        await dbRun('ROLLBACK');
        if (error.code === 'SQLITE_CONSTRAINT') {
            return res.status(409).json({ error: 'Este usuário já é um administrador.' });
        }
        res.status(500).json({ error: 'Erro ao adicionar administrador.' });
    }
};

export const removeAdminController = async (req, res) => {
    const { telegram_id_to_remove } = req.params;
    const superAdminId = process.env.ADMIN_TELEGRAM_ID || '1318210843';

    if (telegram_id_to_remove === superAdminId) {
        return res.status(403).json({ error: 'O super administrador não pode ser removido.' });
    }

    try {
        await dbRun('BEGIN TRANSACTION');
        await dbRun("UPDATE usuarios SET is_admin = FALSE WHERE telegram_id = ?", [telegram_id_to_remove]);
        await dbRun("DELETE FROM admin_credentials WHERE telegram_id = ?", [telegram_id_to_remove]);
        await dbRun('COMMIT');

        res.status(200).json({ message: 'Administrador removido com sucesso.' });
    } catch (error) {
        await dbRun('ROLLBACK');
        res.status(500).json({ error: 'Erro ao remover administrador.' });
    }
};