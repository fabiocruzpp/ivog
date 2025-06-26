import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs'; // Importa o módulo fs
import path from 'path'; // Importa o módulo path
import { requireAdminAccess } from '../middleware/requireAdminAccess.js';
import {
  // Fun√ß√µes que voc√™ j√° tinha
  toggleAdminConfigController,
  setAdminConfigController,
  getChallengeOptionsController,
  activateChallengeController,
  deactivateChallengeController,
  getAllDistinctChallengesController,
  getChallengeStatsController,
  createChallengeController,
  listChallengesController,
  updateChallengeController,
  deleteChallengeController,
  getAllChallengesForDebug,
  importQuestionsController,
  importPillsCsvController,
  getQuestionFormOptionsController,

  // Novas fun√ß√µes para gerenciamento de usu√°rios
  getAllUsers,
  deleteUser,
} from '../controllers/adminController.js';

const router = express.Router();

// --- Configuração do Multer ---

// Define o diretório temporário para uploads no disco
const uploadDir = path.join(process.cwd(), 'uploads', 'temp'); // Cria o caminho completo

// Garante que o diretório de upload exista
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, { recursive: true }); // Cria o diretório e subdiretórios se não existirem
}

// Configuração do Multer para salvar no disco
const diskStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir); // Usa o diretório definido
  },
  filename: function (req, file, cb) {
    // Define o nome do arquivo temporário (timestamp + nome original)
    cb(null, Date.now() + '-' + file.originalname);
  }
});

// Cria uma instância do Multer usando a configuração de diskStorage
const uploadDisk = multer({ storage: diskStorage });

// Se você tiver outras rotas que precisam de memoryStorage, pode manter a instância original:
// const uploadMemory = multer({ storage: multer.memoryStorage() });
// E usá-la nas rotas apropriadas.
// Como a rota de importação é a única que usa upload.single() neste arquivo,
// podemos simplesmente usar a instância uploadDisk para ela.

// --- Fim Configuração Multer ---


// Aplica o middleware de segurança a TODAS as rotas deste arquivo
router.use(requireAdminAccess);

// Rotas que você já tinha

// Rota para importação de perguntas usando o Multer configurado para DISK STORAGE
// e com o nome do campo do arquivo ajustado para 'file'
router.post('/import-questions', cors(), uploadDisk.single('file'), importQuestionsController);

// Rota para importação de pílulas do conhecimento usando o Multer configurado para DISK STORAGE
// e com o nome do campo do arquivo 'file', no caminho esperado pelo frontend
router.post('/knowledge-pills/import-csv', cors(), uploadDisk.single('file'), importPillsCsvController);


router.post('/toggle_config/:key', requireAdminAccess, toggleAdminConfigController);
router.post('/set_config/:key', requireAdminAccess, setAdminConfigController);
router.get('/challenge_options', requireAdminAccess, getChallengeOptionsController);
router.post('/challenge/activate', requireAdminAccess, activateChallengeController);
router.post('/challenge/deactivate', requireAdminAccess, deactivateChallengeController);
router.get('/all_distinct_challenges', requireAdminAccess, getAllDistinctChallengesController);
router.get('/challenge_stats', requireAdminAccess, getChallengeStatsController);
router.post('/challenges', requireAdminAccess, createChallengeController);
router.get('/challenges', requireAdminAccess, listChallengesController);
router.put('/challenges/:id', requireAdminAccess, updateChallengeController);
router.delete('/challenges/:id', requireAdminAccess, deleteChallengeController);
router.get('/debug/all_challenges', requireAdminAccess, getAllChallengesForDebug);
router.get('/form-options', requireAdminAccess, getQuestionFormOptionsController);

// === NOVAS ROTAS PARA GERENCIAR USUÁRIOS ===
router.get('/users', requireAdminAccess, getAllUsers);
router.delete('/users/:telegram_id', requireAdminAccess, deleteUser);

export default router;
