import express from 'express';
import { requireAdminAccess } from '../middleware/requireAdminAccess.js';
import {
    getKpisController,
    getActivityOverTimeController,
    getTopThemesController,
    getThemePerformanceController,
    getUserDistributionController,
    getQuestionPerformanceController,
    getTopUsersByActivityController,
    getFilterOptionsController
} from '../controllers/adminDashboardController.js';

const router = express.Router();

router.use(requireAdminAccess);

// Rota para popular os dropdowns de filtro
router.get('/dashboard/filter-options', getFilterOptionsController);

// Rotas de dados para os widgets do dashboard
router.get('/dashboard/kpis', getKpisController);
router.get('/dashboard/activity-over-time', getActivityOverTimeController);
router.get('/dashboard/top-themes', getTopThemesController);
router.get('/dashboard/theme-performance', getThemePerformanceController);
router.get('/dashboard/user-distribution-by-channel', getUserDistributionController);
router.get('/dashboard/question-performance', getQuestionPerformanceController);
router.get('/dashboard/top-users-by-activity', getTopUsersByActivityController);

export default router;