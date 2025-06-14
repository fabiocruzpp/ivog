import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let locaisData = [];
let cargosData = {};

// Carrega os dados dos arquivos JSON para a memória uma única vez.
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
        // Em caso de erro, definimos como vazio para evitar que a aplicação quebre.
        locaisData = [];
        cargosData = {};
    }
};

// Inicializa o carregamento dos dados quando o serviço é importado.
loadData();

// Funções para obter as opções filtradas
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
    // Adiciona as opções que não dependem de loja/rede
    tipos.push('PAP', 'GA', 'GA Multicanal');
    return [...new Set(tipos)].sort();
};

export const getRedes = (ddd, canal, tipoParceiro) => {
    const filterFn = tipoParceiro
        ? item => item.ddd === ddd && item.canal === canal && item.tipo_parceiro === tipoParceiro && item.rede
        : item => item.ddd === ddd && item.canal === canal && item.rede; // Para Canal Distribuição

    const redes = [...new Set(locaisData
        .filter(filterFn)
        .map(item => item.rede))];
    return redes.sort();
};

export const getLojas = (ddd, canal, rede) => {
    const filterFn = canal === 'Loja Própria'
        ? item => item.ddd === ddd && item.canal === canal
        : item => item.ddd === ddd && item.canal === canal && item.rede === rede;
        
    const lojas = [...new Set(locaisData
        .filter(filterFn)
        .map(item => item.loja)
        .filter(Boolean))]; // .filter(Boolean) remove valores nulos/vazios
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

// --- NOVAS FUNÇÕES ---

/**
 * Retorna uma lista com todos os nomes de canais únicos do cargos.json.
 */
export const getAllCanais = () => {
    return Object.keys(cargosData).sort();
};

/**
 * Retorna uma lista com todos os nomes de cargos únicos do cargos.json.
 */
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