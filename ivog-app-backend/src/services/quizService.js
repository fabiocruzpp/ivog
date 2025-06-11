import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const questionsCsvPath = path.resolve(__dirname, '..', '..', 'Base-Perguntas-IvoGiroV.csv');
let cachedQuestions = [];

export const loadAllQuestions = () => {
  return new Promise((resolve, reject) => {
    if (cachedQuestions.length > 0) {
      return resolve(cachedQuestions);
    }
    const questions = [];
    fs.createReadStream(questionsCsvPath)
      .pipe(csv({ separator: ';' }))
      .on('data', (row) => {
        try {
          const alternativas = row.ALTERNATIVAS ? row.ALTERNATIVAS.split('|').map(alt => alt.trim()).filter(Boolean) : [];
          if (!row.PERGUNTA || alternativas.length === 0 || !row.CORRETA || !row.PUBLICO) {
            return;
          }
          let respostaCorretaTexto = '';
          const respostaCorretaInput = row.CORRETA.trim().toLowerCase();
          if (respostaCorretaInput.length === 1 && 'abcdefghijklmnopqrstuvwxyz'.includes(respostaCorretaInput)) {
            const index = respostaCorretaInput.charCodeAt(0) - 'a'.charCodeAt(0);
            if (index >= 0 && index < alternativas.length) {
              respostaCorretaTexto = alternativas[index];
            }
          } else {
            const matchExato = alternativas.find(alt => alt.trim().toLowerCase() === respostaCorretaInput);
            if(matchExato) {
                respostaCorretaTexto = matchExato;
            }
          }
          if (!respostaCorretaTexto) {
            return;
          }
          questions.push({
            id: `csv_${questions.length + 1}`,
            pergunta_raw_csv: row.PERGUNTA.trim(),
            pergunta_formatada_display: row.PERGUNTA.trim(),
            alternativas: alternativas,
            correta: respostaCorretaTexto,
            publico: row.PUBLICO ? row.PUBLICO.split('|').map(p => p.trim()).filter(Boolean) : [],
            canal: row.CANAL ? row.CANAL.split('|').map(c => c.trim()).filter(Boolean) : [],
            tema: row.TEMA ? row.TEMA.trim() : 'Não especificado',
            subtema: row.SUBTEMA ? row.SUBTEMA.trim() : 'Não especificado',
            feedback: row.FEEDBACK ? row.FEEDBACK.trim() : '',
            fonte: row.FONTE ? row.FONTE.trim() : '',
          });
        } catch (error) {
            console.error('Erro processando linha do CSV:', row, error);
        }
      })
      .on('end', () => {
        console.log('Perguntas do CSV carregadas e cacheadas com sucesso.');
        cachedQuestions = questions;
        resolve(cachedQuestions);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
};