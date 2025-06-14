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

router.get('/filter-options', getFilterOptionsController);
router.get('/kpis', getKpisController);
router.get('/activity-over-time', getActivityOverTimeController);
router.get('/top-themes', getTopThemesController);
router.get('/theme-performance', getThemePerformanceController);
router.get('/user-distribution-by-channel', getUserDistributionController);
router.get('/question-performance', getQuestionPerformanceController);
router.get('/top-users-by-activity', getTopUsersByActivityController);

export default router;