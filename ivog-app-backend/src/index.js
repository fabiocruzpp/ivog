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
import optionsRoutes from './routes/optionsRoutes.js'; // NOVA IMPORTAÇÃO

const app = express();
const PORT = process.env.PORT || 5001;

const corsOptions = {
  origin: 'https://frontivog.ivogapi.xyz',
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

app.use('/api', userRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api', rankingRoutes);
app.use('/api', statsRoutes);
app.use('/api', utilityRoutes);
app.use('/api', biRoutes);
app.use('/api', adminRoutes);
app.use('/api', challengeRoutes);
app.use('/api', optionsRoutes); // NOVO USO DA ROTA

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});