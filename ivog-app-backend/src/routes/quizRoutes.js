import express from 'express';
import {
  startQuizController,
  saveAnswerController,
  finishQuizController,
} from '../controllers/quizController.js';

const router = express.Router();

router.get('/start', startQuizController);
router.post('/answer', saveAnswerController);
router.post('/finish', finishQuizController);

export default router;
