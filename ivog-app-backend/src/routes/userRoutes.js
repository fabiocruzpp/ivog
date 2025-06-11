import express from 'express';
import { getUserProfile, registerOrUpdateUser } from '../controllers/userController.js';

const router = express.Router();

router.get('/user/:telegram_id', getUserProfile);
router.post('/register', registerOrUpdateUser);

export default router;
