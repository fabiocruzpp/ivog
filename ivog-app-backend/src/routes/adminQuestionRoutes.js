import express from 'express';
import { requireAdminAccess } from '../middleware/requireAdminAccess.js';
import {
    listQuestionsController,
    createQuestionController,
    updateQuestionController,
    deleteQuestionController,
    bulkDeleteQuestionsController
} from '../controllers/adminQuestionController.js';

const router = express.Router();

// Aplica o middleware de autenticação para todas as rotas de perguntas
router.use(requireAdminAccess);

// Define as rotas do CRUD
router.get('/', listQuestionsController);
router.post('/', createQuestionController);
router.put('/:id', updateQuestionController);
router.delete('/:id', deleteQuestionController);
router.post('/bulk-delete', bulkDeleteQuestionsController);

export default router;