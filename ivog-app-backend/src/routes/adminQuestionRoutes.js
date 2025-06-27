import express from 'express';
import { requireAdminAccess } from '../middleware/requireAdminAccess.js';
import {
    listQuestionsController,
    createQuestionController,
    updateQuestionController,
    deleteQuestionController,
    bulkDeleteQuestionsController,
    toggleQuestionStatusController // 1. Importar o novo controller
} from '../controllers/adminQuestionController.js';

const router = express.Router();

router.use(requireAdminAccess);

// Define as rotas do CRUD
router.get('/', listQuestionsController);
router.post('/', createQuestionController);
router.put('/:id', updateQuestionController);
router.delete('/:id', deleteQuestionController);
router.post('/bulk-delete', bulkDeleteQuestionsController);

// 2. Adicionar a nova rota para ativar/desativar
router.patch('/toggle-status/:id', toggleQuestionStatusController);


export default router;