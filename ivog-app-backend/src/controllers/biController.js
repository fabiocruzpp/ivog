import db from '../database/database.js';
import { promisify } from 'util';

const dbAll = promisify(db.all.bind(db));

const getAllFromTable = (tableName) => async (req, res) => {
  try {
    const rows = await dbAll(`SELECT * FROM ${tableName}`);
    res.status(200).json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
};

export const getBiDataUsuarios = getAllFromTable('usuarios');
export const getBiDataResultados = getAllFromTable('resultados');
export const getBiDataRespostas = getAllFromTable('respostas_simulado');
export const getBiDataSimulados = getAllFromTable('simulados');
