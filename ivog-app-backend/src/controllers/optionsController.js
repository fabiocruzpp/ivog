import * as optionsService from '../services/optionsService.js';

const getOptions = (req, res, serviceFn, ...params) => {
    try {
        const result = serviceFn(...params);
        res.status(200).json(result);
    } catch (error) {
        console.error(`Erro ao buscar opções: ${error.message}`);
        res.status(500).json({ error: 'Erro interno do servidor.' });
    }
};

export const getDddsController = (req, res) => {
    getOptions(req, res, optionsService.getDdds);
};

export const getCanaisController = (req, res) => {
    const { ddd } = req.query;
    if (!ddd) return res.status(400).json({ error: 'Parâmetro DDD é obrigatório.' });
    getOptions(req, res, optionsService.getCanais, ddd);
};

export const getTiposParceiroController = (req, res) => {
    const { ddd, canal } = req.query;
    if (!ddd || !canal) return res.status(400).json({ error: 'Parâmetros DDD e CANAL são obrigatórios.' });
    getOptions(req, res, optionsService.getTiposParceiro, ddd, canal);
};

export const getRedesController = (req, res) => {
    const { ddd, canal, tipoParceiro } = req.query;
    if (!ddd || !canal) {
        return res.status(400).json({ error: 'Os parâmetros DDD e CANAL são obrigatórios.' });
    }
    getOptions(req, res, optionsService.getRedes, ddd, canal, tipoParceiro);
};

export const getRedesAndParceirosController = (req, res) => {
    const { ddd, canal } = req.query;
    if (!ddd || !canal) return res.status(400).json({ error: 'Parâmetros DDD e CANAL são obrigatórios.' });
    getOptions(req, res, optionsService.getRedesAndParceiros, ddd, canal);
};

export const getLojasController = (req, res) => {
    const { ddd, canal, rede } = req.query;
    if (!ddd || !canal) return res.status(400).json({ error: 'Parâmetros DDD e CANAL são obrigatórios.' });
    getOptions(req, res, optionsService.getLojas, ddd, canal, rede);
};

export const getCargosController = (req, res) => {
    const { canal, tipoParceiro } = req.query;
    if (!canal) return res.status(400).json({ error: 'Parâmetro CANAL é obrigatório.' });
    getOptions(req, res, optionsService.getCargos, canal, tipoParceiro);
};