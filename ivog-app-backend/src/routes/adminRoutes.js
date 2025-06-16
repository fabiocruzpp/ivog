import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { requireAdminAccess } from '../middleware/requireAdminAccess.js';
import {
  // Funções que você já tinha
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
  getQuestionFormOptionsController,

  // Novas funções para gerenciamento de usuários
  getAllUsers,
  deleteUser,
} from '../controllers/adminController.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Aplica o middleware de segurança a TODAS as rotas deste arquivo
router.use(requireAdminAccess);

// Rotas que você já tinha
router.post('/import-questions', cors(), upload.single('csvfile'), importQuestionsFromCsvController);
router.post('/toggle_config/:key', toggleAdminConfigController);
router.post('/set_config/:key', setAdminConfigController);
router.get('/challenge_options', getChallengeOptionsController);
router.post('/challenge/activate', activateChallengeController);
router.post('/challenge/deactivate', deactivateChallengeController);
router.get('/all_distinct_challenges', getAllDistinctChallengesController);
router.get('/challenge_stats', getChallengeStatsController);
router.post('/challenges', createChallengeController);
router.get('/challenges', listChallengesController);
router.put('/challenges/:id', updateChallengeController);
router.delete('/challenges/:id', deleteChallengeController);
router.get('/debug/all_challenges', getAllChallengesForDebug);
router.get('/form-options', getQuestionFormOptionsController);

// === NOVAS ROTAS PARA GERENCIAR USUÁRIOS ===
router.get('/users', getAllUsers);
router.delete('/users/:telegram_id', deleteUser);

export default router;