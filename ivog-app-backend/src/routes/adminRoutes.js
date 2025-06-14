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

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

router.post(
    '/import-questions', // REMOVIDO /admin
    cors(),
    upload.single('csvfile'),
    requireAdminAccess,
    importQuestionsFromCsvController
);

router.use(requireAdminAccess);

router.post('/toggle_config/:key', toggleAdminConfigController); // REMOVIDO /admin
router.post('/set_config/:key', setAdminConfigController); // REMOVIDO /admin
router.get('/challenge_options', getChallengeOptionsController); // REMOVIDO /admin
router.post('/challenge/activate', activateChallengeController); // REMOVIDO /admin
router.post('/challenge/deactivate', deactivateChallengeController); // REMOVIDO /admin
router.get('/all_distinct_challenges', getAllDistinctChallengesController); // REMOVIDO /admin
router.get('/challenge_stats', getChallengeStatsController); // REMOVIDO /admin
router.post('/challenges', createChallengeController); // REMOVIDO /admin
router.get('/challenges', listChallengesController); // REMOVIDO /admin
router.put('/challenges/:id', updateChallengeController); // REMOVIDO /admin
router.delete('/challenges/:id', deleteChallengeController); // REMOVIDO /admin
router.get('/debug/all_challenges', getAllChallengesForDebug); // REMOVIDO /admin
router.get('/form-options', getQuestionFormOptionsController); // REMOVIDO /admin

export default router;