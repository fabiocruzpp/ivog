import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import styles from './ResultsPage.module.css';
import { useUserStore } from '../store/userStore';
import api from '../services/api';

const StatsIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"></path></svg>;
const HomeIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8h5z"></path></svg>;

function ResultsPage() {
  const location = useLocation();
  const { results } = location.state || {};
  const { user } = useUserStore();

  const [topTodayScores, setTopTodayScores] = useState([]);

  useEffect(() => {
    if (user?.id && !results?.is_training) {
      api.get('/user_stats/top_scores_today', { params: { telegram_id: user.id } })
        .then(response => {
          setTopTodayScores(response.data);
        })
        .catch(err => {
          console.error("Falha ao buscar pontuações do dia:", err);
        });
    }
  }, [user, results]);

  if (!results) {
    return (
      <div className={styles.container}>
        <p>Nenhum resultado para exibir.</p>
        <Link to="/">Voltar ao Menu</Link>
      </div>
    );
  }

  const percentualAcerto = results.total_perguntas > 0 ? (results.num_acertos / results.total_perguntas * 100).toFixed(2) : "0.00";
  const pontosBonus = results.pontuacao_final_com_bonus - results.pontuacao_base;
  const isTraining = results.is_training;

  return (
    <div className={styles.screenContainer}>
        <div className={styles.header}>
            <h2>{isTraining ? 'Treino Concluído!' : `Parabéns, ${user?.first_name || ''}!`}</h2>
            <p>{isTraining ? 'Continue praticando!' : 'Você concluiu o simulado!'}</p>
        </div>
        <div className={styles.content}>
            <div className={styles.scoreSummary}>
                <p>Você acertou</p>
                <p className={styles.highlightScore}><strong>{results.num_acertos} de {results.total_perguntas} ({percentualAcerto}%)</strong></p>
                
                {!isTraining && (
                  <>
                    <hr className={styles.divider} />
                    <p>Sua pontuação: <strong>{results.pontuacao_base} Pts</strong></p>
                    {pontosBonus > 0 && <p>Bônus por Desempenho: <strong>+{pontosBonus} Pts</strong></p>}
                    <p>Total: <strong className={styles.finalScore}>{results.pontuacao_final_com_bonus} Pts</strong></p>
                  </>
                )}
            </div>
            
            {!isTraining && (
              <div className={styles.topScoresSection}>
                  <p>Suas 3 melhores pontuações do dia (Simulados Normais):</p>
                  <div className={styles.scoresList}>
                      {topTodayScores.length > 0 
                          ? topTodayScores.map((score, index) => <span key={index} className={styles.scoreItem}>{score} Pts</span>)
                          : <span>-</span>
                      }
                  </div>
              </div>
            )}

            <Link to="/stats" className={`${styles.actionButton} ${styles.statsButton}`}>
                <StatsIcon />
                Ver Minhas Estatísticas
            </Link>
            <Link to="/" className={`${styles.actionButton} ${styles.homeButton}`}>
                <HomeIcon />
                Voltar ao Menu Principal
            </Link>
        </div>
    </div>
  );
}

export default ResultsPage;