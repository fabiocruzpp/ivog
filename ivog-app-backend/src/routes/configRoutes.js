import express from 'express';
import { getPublicConfigsController } from '../controllers/utilityController.js';

const router = express.Router();

// Rota pública para qualquer usuário buscar as configurações
router.get('/configs', getPublicConfigsController);

export default router;