import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { requireAdminAccess } from '../middleware/requireAdminAccess.js';
import {
  getAdminConfigsController,
  toggleAdminConfigController,
  setAdminConfigController,
  getChallengeOptionsController,
  activateChallengeController,
  deactivateChallengeController,
  getAllDistinctChallengesController,
  getChallengeStatsController,
  createChallengeController,
  listChallengesController,
  updateChallengeController,
  deleteChallengeController,
  getAllChallengesForDebug,
  importQuestionsFromCsvController,
} from '../controllers/adminController.js';

const router = express.Router();

// Configuração do Multer
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// --- ROTA DE UPLOAD AGORA SEGURA ---
router.post(
    '/admin/import-questions',
    cors(),
    upload.single('csvfile'),
    requireAdminAccess, // ADICIONAMOS A SEGURANÇA DE VOLTA
    importQuestionsFromCsvController
);

// Middleware de segurança para as outras rotas de admin
router.use(requireAdminAccess);

// Rotas de Configuração Geral
router.get('/admin/configs', getAdminConfigsController);
router.post('/admin/toggle_config/:key', toggleAdminConfigController);
router.post('/admin/set_config/:key', setAdminConfigController);
router.get('/admin/challenge_options', getChallengeOptionsController);
router.post('/admin/challenge/activate', activateChallengeController);
router.post('/admin/challenge/deactivate', deactivateChallengeController);
router.get('/admin/all_distinct_challenges', getAllDistinctChallengesController);
router.get('/admin/challenge_stats', getChallengeStatsController);
router.post('/admin/challenges', createChallengeController);
router.get('/admin/challenges', listChallengesController);
router.put('/admin/challenges/:id', updateChallengeController);
router.delete('/admin/challenges/:id', deleteChallengeController);
router.get('/admin/debug/all_challenges', getAllChallengesForDebug);

export default router;