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
  getQuestionFormOptionsController, // IMPORTADO
} from '../controllers/adminController.js';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post(
    '/admin/import-questions',
    cors(),
    upload.single('csvfile'),
    requireAdminAccess,
    importQuestionsFromCsvController
);

router.use(requireAdminAccess);

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

// ROTA ADICIONADA
router.get('/admin/form-options', getQuestionFormOptionsController);

export default router;