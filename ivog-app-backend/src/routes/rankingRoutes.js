import express from 'express';
import { getTop10Controller } from '../controllers/rankingController.js';

const router = express.Router();

router.get('/top10', getTop10Controller);

export default router;
