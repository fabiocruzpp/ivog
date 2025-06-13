import express from 'express';
import multer from 'multer';
import { requireAdmin } from '../middleware/adminMiddleware.js';
import {
    listQuestionsController,
    createQuestionController,
    updateQuestionController,
    deleteQuestionController,
    importQuestionsFromCsvController
} from '../controllers/adminQuestionController.js';

const router = express.Router();

// Configuração do Multer para upload de arquivo em memória
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Aplica o middleware de admin para todas as rotas de perguntas
router.use(requireAdmin);

// Define as rotas do CRUD
router.get('/', listQuestionsController);
router.post('/', createQuestionController);
router.put('/:id', updateQuestionController);
router.delete('/:id', deleteQuestionController);

// Rota para importação de CSV
router.post('/import', upload.single('csvfile'), importQuestionsFromCsvController);

export default router;