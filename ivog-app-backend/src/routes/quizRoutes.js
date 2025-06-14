import express from 'express';
import {
  startQuizController,
  saveAnswerController,
  finishQuizController,
  getAvailableThemesController,
} from '../controllers/quizController.js';

const router = express.Router();

router.get('/start', startQuizController);
router.post('/answer', saveAnswerController);
router.post('/finish', finishQuizController);
router.get('/available-themes', getAvailableThemesController);

export default router;