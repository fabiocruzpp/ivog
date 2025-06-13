import db from '../database/database.js';
import { promisify } from 'util';

const dbAll = promisify(db.all.bind(db));
let cachedQuestions = [];

export const loadAllQuestions = () => {
  return new Promise(async (resolve, reject) => {
    if (cachedQuestions.length > 0) {
      return resolve(cachedQuestions);
    }
    
    try {
      const rows = await dbAll('SELECT * FROM perguntas');
      
      const questions = rows.map(row => {
        try {
          // Desserializa os campos JSON
          const alternativas = JSON.parse(row.alternativas);
          const publico = JSON.parse(row.publico);
          const canal = JSON.parse(row.canal);
          
          return {
            ...row,
            alternativas,
            publico,
            canal,
          };
        } catch(e) {
          console.error(`Erro ao parsear JSON da pergunta ID ${row.id}:`, e);
          return null; // Retorna nulo para ser filtrado
        }
      }).filter(Boolean); // Remove qualquer pergunta que falhou no parse

      console.log(`${questions.length} perguntas carregadas do banco de dados e cacheadas com sucesso.`);
      cachedQuestions = questions;
      resolve(cachedQuestions);

    } catch (error) {
        console.error('Erro ao carregar perguntas do banco de dados:', error);
        reject(error);
    }
  });
};

// NOVA FUNÇÃO: Limpa o cache para forçar a releitura do banco de dados.
export const clearQuestionsCache = () => {
    console.log("Limpando cache de perguntas.");
    cachedQuestions = [];
};