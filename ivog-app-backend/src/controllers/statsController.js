import db from '../database/database.js';
import { promisify } from 'util';

const dbGet = promisify(db.get.bind(db));
const dbAll = promisify(db.all.bind(db));

export const getMyStatsController = async (req, res) => {
    // ...lógica completa...
};
export const getMyChallengeDetailsController = async (req, res) => {
    // ...lógica completa...
};
export const getChallengeDetailsController = async (req, res) => {
    // ...lógica completa...
};
