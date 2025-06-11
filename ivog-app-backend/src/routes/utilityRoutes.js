import express from 'express';
import {
  getFeedbackConfigController,
  getTopScoresTodayController
} from '../controllers/utilityController.js';

const router = express.Router();

router.get('/config/feedback_detalhado_ativo', getFeedbackConfigController);
router.get('/user_stats/top_scores_today', getTopScoresTodayController);

export default router;
