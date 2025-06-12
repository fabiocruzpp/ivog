import express from 'express';
import {
    getDddsController,
    getCanaisController,
    getTiposParceiroController,
    getRedesController,
    getLojasController,
    getCargosController
} from '../controllers/optionsController.js';

const router = express.Router();

router.get('/options/ddds', getDddsController);
router.get('/options/canais', getCanaisController);
router.get('/options/tipos-parceiro', getTiposParceiroController);
router.get('/options/redes', getRedesController);
router.get('/options/lojas', getLojasController);
router.get('/options/cargos', getCargosController);

export default router;