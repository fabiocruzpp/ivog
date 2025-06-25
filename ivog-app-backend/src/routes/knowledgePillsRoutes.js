import express from 'express';
import multer from 'multer';
import knowledgePillsController from '../controllers/knowledgePillsController.js';

const router = express.Router();

// Configuração do multer para upload de arquivos
const upload = multer({ storage: multer.memoryStorage() });

// ROTAS ESPECÍFICAS PRIMEIRO (sem parâmetros dinâmicos)
router.get('/', knowledgePillsController.listPillsController);
router.post('/', knowledgePillsController.createPillController);

// Rotas de import e funcionalidades específicas
router.post('/import-csv', knowledgePillsController.importPillsCsvController);
router.post('/manual-send', knowledgePillsController.manualSendPillsController);
router.post('/sync-media', knowledgePillsController.syncMediaController);

// NOVA ROTA para upload de múltiplos arquivos de mídia
// O segundo argumento 'upload.array(...)' processa os arquivos antes de chamar o controller
router.post('/upload-media', upload.array('mediafiles', 20), knowledgePillsController.uploadMediaController);

// ROTAS COM PARÂMETROS DINÂMICOS POR ÚLTIMO
router.get('/:id', knowledgePillsController.getPillByIdController);
router.put('/:id', knowledgePillsController.updatePillController);
router.delete('/:id', knowledgePillsController.deletePillController);

export default router;