import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import db from './database/database.js';
import { startPillsScheduler } from './services/schedulerService.js';
import { initializeBotListeners } from './services/botListenerService.js'; // 1. Importa

import userRoutes from './routes/userRoutes.js';
import quizRoutes from './routes/quizRoutes.js';
import rankingRoutes from './routes/rankingRoutes.js';
import statsRoutes from './routes/statsRoutes.js';
import utilityRoutes from './routes/utilityRoutes.js';
import biRoutes from './routes/biRoutes.js';
import masterAdminRouter from './routes/admin/index.js';
import challengeRoutes from './routes/challengeRoutes.js';
import optionsRoutes from './routes/optionsRoutes.js';
import authRoutes from './routes/authRoutes.js';
import configRoutes from './routes/configRoutes.js';
import knowledgePillsRoutes from './routes/knowledgePillsRoutes.js'; // Adicione esta linha

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// Rotas públicas e de autenticação
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api', optionsRoutes); 
app.use('/api/quiz', quizRoutes);
app.use('/api', rankingRoutes);
app.use('/api', statsRoutes);
app.use('/api', utilityRoutes);
app.use('/api', challengeRoutes);
app.use('/api', configRoutes);
app.use('/api/knowledge-pills', knowledgePillsRoutes); // Adicione esta linha

// Rota protegida por API Key
app.use('/api', biRoutes);

// Rotas de Admin
app.use('/api/admin', masterAdminRouter);

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  startPillsScheduler();
  initializeBotListeners(); // 2. Inicia os "ouvintes" do bot
});
