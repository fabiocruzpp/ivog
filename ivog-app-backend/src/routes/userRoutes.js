import express from 'express';
import { 
  getUserProfileController, 
  getUserProfile, 
  registerOrUpdateUser 
} from '../controllers/userController.js';

const router = express.Router();

// Nova rota para o frontend (sem parâmetros, perfil genérico)
router.get('/profile', getUserProfileController);

// Rota para buscar usuário por telegram_id (para a página de estatísticas)
router.get('/:telegram_id', getUserProfile);

// Rotas existentes (mantidas para compatibilidade)
router.get('/user/:telegram_id', getUserProfile);
router.post('/register', registerOrUpdateUser);

export default router;
