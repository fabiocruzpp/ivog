import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { requireAdminAccess } from '../middleware/requireAdminAccess.js';
import {
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
} from '../controllers/adminController.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Aplica o middleware de segurança a todas as rotas deste arquivo
router.use(requireAdminAccess);

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

export default router;