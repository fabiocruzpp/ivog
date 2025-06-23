import express from 'express';
import {
    getMyStatsController,
    getMyChallengeDetailsController,
    getChallengeDetailsController,
    getMyTestsListController, // Importa o novo controller
    getTestDetailsController // Importa o novo controller
} from '../controllers/statsController.js';

const router = express.Router();

// Rota para obter estatísticas gerais do usuário
router.get('/my_stats', getMyStatsController);

// Rota para obter detalhes dos desafios que o usuário participou
router.get('/my_challenges_participated_details', getMyChallengeDetailsController);

// Rota para obter detalhes de um desafio específico (geral)
router.get('/challenge_details', getChallengeDetailsController);

// Nova rota para obter a lista de todos os testes de um usuário
router.get('/my_tests_list', getMyTestsListController);

// Nova rota para obter os detalhes de um teste específico
router.get('/test_details', getTestDetailsController);


export default router;
