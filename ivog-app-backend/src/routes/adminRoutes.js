import express from 'express';
import { requireAdmin } from '../middleware/adminMiddleware.js';
import {
  getAdminConfigsController,
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
  getAllChallengesForDebug, // NOVA IMPORTAÇÃO
} from '../controllers/adminController.js';

const router = express.Router();

// Rotas de Configuração Geral
router.get('/admin/configs', requireAdmin, getAdminConfigsController);
router.post('/admin/toggle_config/:key', requireAdmin, toggleAdminConfigController);
router.post('/admin/set_config/:key', requireAdmin, setAdminConfigController);

// Rotas do Sistema de Desafio "Legado" (Global)
router.get('/admin/challenge_options', requireAdmin, getChallengeOptionsController);
router.post('/admin/challenge/activate', requireAdmin, activateChallengeController);
router.post('/admin/challenge/deactivate', requireAdmin, deactivateChallengeController);
router.get('/admin/all_distinct_challenges', requireAdmin, getAllDistinctChallengesController);
router.get('/admin/challenge_stats', requireAdmin, getChallengeStatsController);

// Rotas para Gerenciamento de Desafios (CRUD)
router.post('/admin/challenges', requireAdmin, createChallengeController);
router.get('/admin/challenges', requireAdmin, listChallengesController);
router.put('/admin/challenges/:id', requireAdmin, updateChallengeController);
router.delete('/admin/challenges/:id', requireAdmin, deleteChallengeController);

// --- NOVA ROTA DE DEPURAÇÃO ---
router.get('/admin/debug/all_challenges', requireAdmin, getAllChallengesForDebug);


export default router;