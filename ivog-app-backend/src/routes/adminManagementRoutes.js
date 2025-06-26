import express from 'express';
import { requireAdminAccess } from '../middleware/requireAdminAccess.js';
import { 
    listAdminsController, 
    addAdminController, 
    removeAdminController 
} from '../controllers/adminManagementController.js';

const router = express.Router();

router.use(requireAdminAccess);

// CORREÇÃO: As rotas agora usam o prefixo /admins
router.get('/admins', requireAdminAccess, listAdminsController);
router.post('/admins', requireAdminAccess, addAdminController);
router.delete('/admins/:telegram_id_to_remove', requireAdminAccess, removeAdminController);

export default router;