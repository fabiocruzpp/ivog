import jwt from 'jsonwebtoken';

export const loginController = (req, res) => {
    const { username, password } = req.body;

    const adminUser = process.env.ADMIN_USER;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!username || !password) {
        return res.status(400).json({ error: 'Usuário e senha são obrigatórios.' });
    }

    if (username === adminUser && password === adminPassword) {
        // Credenciais corretas, gerar um token JWT
        const payload = { user: { username: adminUser, role: 'admin' } };
        
        const token = jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '8h' } // Token expira em 8 horas
        );

        res.status(200).json({ message: 'Login bem-sucedido!', token });
    } else {
        // Credenciais incorretas
        res.status(401).json({ error: 'Credenciais inválidas.' });
    }
};