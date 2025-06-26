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

// --- INÍCIO DA ALTERAÇÃO CORS ---

// 1. Defina as origens permitidas
const allowedOrigins = [
  'http://34.53.92.86:3001',      // Acesso via IP para rede corporativa
  'https://frontivog.ivogapi.xyz', // Acesso via domínio de produção (Frontend)
  'http://localhost:5173',          // Para desenvolvimento local com `npm run dev`
  'http://localhost:4173'           // Para teste local com `npm run preview`
];

// 2. Crie as opções do CORS
const corsOptions = {
  origin: function (origin, callback) {
    // Permite requisições da nossa lista e requisições sem 'origin' (ex: Postman)
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
};

// 3. Use o middleware 'cors' com as opções configuradas
app.use(cors(corsOptions));

// --- FIM DA ALTERAÇÃO CORS ---


app.use(express.json());

// Rotas públicas e de autenticação
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api', optionsRoutes); 
app.use('/api/quiz', quizRoutes);
app.use('/api', rankingRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api', utilityRoutes);
app.use('/api', challengeRoutes);
app.use('/api', configRoutes);
app.use('/api/knowledge-pills', knowledgePillsRoutes); // Adicione esta linha
app.use('/media', express.static('/home/fabiocruzpp/ivog/ivog-app-backend/uploads/pills_media'));

// Rota protegida por API Key
app.use('/api', biRoutes);

// Rotas de Admin
app.use('/api/admin', masterAdminRouter);

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  startPillsScheduler();
  initializeBotListeners(); // 2. Inicia os "ouvintes" do bot
});
