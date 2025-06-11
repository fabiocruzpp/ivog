import express from 'express';
import { requireAdmin } from '../middleware/adminMiddleware.js';
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
} from '../controllers/adminController.js';

const router = express.Router();

router.get('/admin/configs', requireAdmin, getAdminConfigsController);
router.post('/admin/toggle_config/:key', requireAdmin, toggleAdminConfigController);
router.post('/admin/set_config/:key', requireAdmin, setAdminConfigController);
router.get('/admin/challenge_options', requireAdmin, getChallengeOptionsController);
router.post('/admin/challenge/activate', requireAdmin, activateChallengeController);
router.post('/admin/challenge/deactivate', requireAdmin, deactivateChallengeController);
router.get('/admin/all_distinct_challenges', requireAdmin, getAllDistinctChallengesController);
router.get('/admin/challenge_stats', requireAdmin, getChallengeStatsController);
router.post('/admin/challenges', requireAdmin, createChallengeController);

export default router;
