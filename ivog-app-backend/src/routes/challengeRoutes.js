import express from 'express';
import { getAvailableChallengesController } from '../controllers/challengeController.js';

const router = express.Router();

router.get('/challenges/available', getAvailableChallengesController);

export default router;
