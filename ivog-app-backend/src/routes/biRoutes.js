import express from 'express';
import { requireApiKey } from '../middleware/authMiddleware.js';
import {
  getBiDataUsuarios,
  getBiDataResultados,
  getBiDataRespostas,
  getBiDataSimulados,
  getBiDataDesafios
} from '../controllers/biController.js';

const router = express.Router();

router.get('/bi/usuarios', requireApiKey, getBiDataUsuarios);
router.get('/bi/resultados', requireApiKey, getBiDataResultados);
router.get('/bi/respostas', requireApiKey, getBiDataRespostas);
router.get('/bi/simulados', requireApiKey, getBiDataSimulados);
router.get('/bi/desafios', requireApiKey, getBiDataDesafios);

export default router;
