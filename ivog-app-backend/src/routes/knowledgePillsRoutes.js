import express from 'express';
import multer from 'multer';
import knowledgePillsController from '../controllers/knowledgePillsController.js';

const router = express.Router();

// Configuração do multer para upload de arquivos CSV
const upload = multer({ storage: multer.memoryStorage() });

// ROTAS ESPECÍFICAS PRIMEIRO (sem parâmetros dinâmicos)
router.get('/', knowledgePillsController.listPillsController);
router.post('/', knowledgePillsController.createPillController);

// Rotas de import e funcionalidades específicas
router.post('/import-csv', knowledgePillsController.importPillsCsvController);
router.post('/import-csv-content', knowledgePillsController.importPillsCsvContentController);
router.post('/debug-upload', upload.single('csvFile'), knowledgePillsController.debugCsvUploadController);
router.post('/manual-send', knowledgePillsController.manualSendPillsController);
router.post('/sync-media', knowledgePillsController.syncMediaController);

// ROTAS COM PARÂMETROS DINÂMICOS POR ÚLTIMO
router.get('/:id', knowledgePillsController.getPillByIdController);
router.put('/:id', knowledgePillsController.updatePillController);
router.delete('/:id', knowledgePillsController.deletePillController);
router.post('/:id/send-telegram', knowledgePillsController.sendPillToTelegramController);

export default router;
