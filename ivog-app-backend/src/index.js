import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import db from './database/database.js';

import userRoutes from './routes/userRoutes.js';
import quizRoutes from './routes/quizRoutes.js';
import rankingRoutes from './routes/rankingRoutes.js';
import statsRoutes from './routes/statsRoutes.js';
import utilityRoutes from './routes/utilityRoutes.js';
import biRoutes from './routes/biRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import challengeRoutes from './routes/challengeRoutes.js';
import optionsRoutes from './routes/optionsRoutes.js';
import adminQuestionRoutes from './routes/adminQuestionRoutes.js';
import authRoutes from './routes/authRoutes.js';

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// --- ORDEM DE ROTAS CORRIGIDA ---

// 1. Rotas de Autenticação e Públicas primeiro
app.use('/api/auth', authRoutes);
app.use('/api', userRoutes);
app.use('/api', optionsRoutes); // <<-- Rota pública movida para cima
app.use('/api/quiz', quizRoutes);
app.use('/api', rankingRoutes);
app.use('/api', statsRoutes);
app.use('/api', utilityRoutes);
app.use('/api', challengeRoutes);

// 2. Rotas Protegidas por API Key
app.use('/api', biRoutes);

// 3. Rotas Protegidas por Login de Admin por último
app.use('/api', adminRoutes);
app.use('/api/admin/questions', adminQuestionRoutes);


app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});