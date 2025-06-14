import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { requireAdminAccess } from '../middleware/requireAdminAccess.js';
import { 
    listPillsController,
    importPillsCsvController,
    syncMediaController,
    createPillController,
    updatePillController,
    deletePillController,
    bulkDeletePillsController,
    sendPillNowController
} from '../controllers/knowledgePillsController.js';

const router = express.Router();

const mediaDir = 'uploads/pills_media/';
fs.mkdirSync(mediaDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, mediaDir);
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});

const mediaUpload = multer({ 
    storage: storage,
    limits: { fileSize: 100 * 1024 * 1024 }
});
const csvUpload = multer({ storage: multer.memoryStorage() });

router.use(requireAdminAccess);

router.get('/', listPillsController);
router.post('/', createPillController);
router.put('/:id', updatePillController);
router.delete('/:id', deletePillController);
router.post('/bulk-delete', bulkDeletePillsController);
router.post('/import-csv', csvUpload.single('csvfile'), importPillsCsvController);
router.post('/upload-media', mediaUpload.array('mediafiles'), (req, res) => {
    res.status(200).json({ message: `${req.files.length} arquivo(s) enviados com sucesso!` });
});
router.post('/sync-media', syncMediaController);
router.post('/send-now', sendPillNowController);

export default router;