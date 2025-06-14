import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let locaisData = [];
let cargosData = {};

const loadData = async () => {
    if (locaisData.length > 0 && Object.keys(cargosData).length > 0) {
        return;
    }
    try {
        const locaisPath = path.join(__dirname, '..', 'database', 'locais.json');
        const cargosPath = path.join(__dirname, '..', 'database', 'cargos.json');

        const [locaisBuffer, cargosBuffer] = await Promise.all([
            fs.readFile(locaisPath),
            fs.readFile(cargosPath)
        ]);

        locaisData = JSON.parse(locaisBuffer.toString());
        cargosData = JSON.parse(cargosBuffer.toString());
        console.log('Dados de locais e cargos para o formulário carregados com sucesso.');
    } catch (error) {
        console.error('Falha ao carregar arquivos de dados (locais.json/cargos.json):', error);
        locaisData = [];
        cargosData = {};
    }
};

loadData();

export const getDdds = () => {
    const ddds = [...new Set(locaisData.map(item => item.ddd))];
    return ddds.sort();
};

export const getCanais = (ddd) => {
    const canais = [...new Set(locaisData
        .filter(item => item.ddd === ddd)
        .map(item => item.canal))];
    return canais.sort();
};

export const getTiposParceiro = (ddd, canal) => {
    const tipos = [...new Set(locaisData
        .filter(item => item.ddd === ddd && item.canal === canal && item.tipo_parceiro)
        .map(item => item.tipo_parceiro))];
    tipos.push('PAP', 'GA', 'GA Multicanal');
    return [...new Set(tipos)].sort();
};

export const getRedes = (ddd, canal, tipoParceiro) => {
    const filterFn = tipoParceiro
        ? item => item.ddd === ddd && item.canal === canal && item.tipo_parceiro === tipoParceiro && item.rede
        : item => item.ddd === ddd && item.canal === canal && item.rede;

    const redes = [...new Set(locaisData
        .filter(filterFn)
        .map(item => item.rede))];
    return redes.sort();
};

export const getRedesAndParceiros = (ddd, canal) => {
    if (canal !== 'Parceiros') {
        return getRedes(ddd, canal);
    }
    
    const combinedList = new Set();
    locaisData
        .filter(item => item.ddd === ddd && item.canal === canal && item.tipo_parceiro === 'Parceiro Lojas' && item.rede)
        .forEach(item => combinedList.add(item.rede));

    combinedList.add('PAP');
    combinedList.add('GA');
    combinedList.add('GA Multicanal');

    return Array.from(combinedList).sort();
};

export const getLojas = (ddd, canal, rede) => {
    const filterFn = canal === 'Loja Própria'
        ? item => item.ddd === ddd && item.canal === canal
        : item => item.ddd === ddd && item.canal === canal && item.rede === rede;
        
    const lojas = [...new Set(locaisData
        .filter(filterFn)
        .map(item => item.loja)
        .filter(Boolean))];
    return lojas.sort();
};

export const getCargos = (canal, tipoParceiro) => {
    if (!cargosData[canal]) {
        return [];
    }
    if (tipoParceiro && cargosData[canal][tipoParceiro]) {
        return cargosData[canal][tipoParceiro];
    }
    if (Array.isArray(cargosData[canal])) {
        return cargosData[canal];
    }
    return [];
};

export const getAllCanais = () => {
    return Object.keys(cargosData).sort();
};

export const getAllCargos = () => {
    const cargos = new Set();
    Object.values(cargosData).forEach(value => {
        if (Array.isArray(value)) {
            value.forEach(cargo => cargos.add(cargo));
        } else if (typeof value === 'object') {
            Object.values(value).forEach(subValue => {
                if (Array.isArray(subValue)) {
                    subValue.forEach(cargo => cargos.add(cargo));
                }
            });
        }
    });
    return Array.from(cargos).sort();
};