import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import db from '../database/database.js';
import { promisify } from 'util';

const dbGet = promisify(db.get.bind(db));

export const loginController = async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Usuário e senha são obrigatórios.' });
    }

    try {
        const adminUser = await dbGet('SELECT * FROM admin_credentials WHERE username = ?', [username]);

        if (!adminUser) {
            return res.status(401).json({ error: 'Credenciais inválidas.' });
        }

        const passwordMatch = await bcrypt.compare(password, adminUser.password_hash);

        if (passwordMatch) {
            const payload = { 
                user: { 
                    username: adminUser.username, 
                    telegram_id: adminUser.telegram_id,
                    role: 'admin' 
                } 
            };
            
            const token = jwt.sign(
                payload,
                process.env.JWT_SECRET,
                { expiresIn: '8h' }
            );

            res.status(200).json({ message: 'Login bem-sucedido!', token });
        } else {
            res.status(401).json({ error: 'Credenciais inválidas.' });
        }
    } catch (error) {
        console.error('Erro no processo de login:', error);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};