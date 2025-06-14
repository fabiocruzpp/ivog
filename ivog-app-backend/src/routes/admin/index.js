import express from 'express';
import adminRoutes from '../adminRoutes.js';
import adminDashboardRoutes from '../adminDashboardRoutes.js';
import adminQuestionRoutes from '../adminQuestionRoutes.js';
import adminManagementRoutes from '../adminManagementRoutes.js';
import knowledgePillsRoutes from '../knowledgePillsRoutes.js';

const router = express.Router();

// O roteador mestre delega para os roteadores específicos com seus sub-prefixos
router.use('/dashboard', adminDashboardRoutes);
router.use('/questions', adminQuestionRoutes);
router.use('/management', adminManagementRoutes);
router.use('/pills', knowledgePillsRoutes);

// As rotas gerais (como /toggle_config) ficam na raiz do admin
router.use('/', adminRoutes);

export default router;