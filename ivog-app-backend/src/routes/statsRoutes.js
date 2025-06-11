import express from 'express';
import {
  getMyStatsController,
  getMyChallengeDetailsController,
  getChallengeDetailsController,
} from '../controllers/statsController.js';

const router = express.Router();

router.get('/stats/my_stats', getMyStatsController);
router.get('/stats/my_challenges_participated_details', getMyChallengeDetailsController);
router.get('/stats/challenge_details', getChallengeDetailsController);

export default router;
