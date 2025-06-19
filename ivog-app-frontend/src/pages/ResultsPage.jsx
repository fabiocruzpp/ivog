import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import styles from './ResultsPage.module.css';
import { useUserStore } from '../store/userStore';
import api from '../services/api';

const StatsIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"></path></svg>;
const HomeIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8h5z"></path></svg>;
const TrophyIcon = () => <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor"><path d="M20.5 11H19V7c0-1.1-.9-2-2-2h-1V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v1H7c-1.1 0-2 .9-2 2v4h-1.5c-.83 0-1.5.67-1.5 1.5v0c0 .83.67 1.5 1.5 1.5H5v4c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2v-4h1.5c.83 0 1.5-.67 1.5-1.5v0c0-.83-.67-1.5-1.5-1.5zM12 4h4v1h-4V4zM7 7h10v4H7V7z"></path></svg>;

function ResultsPage() {
  const location = useLocation();
  const { results } = location.state || {};
  const { user } = useUserStore();

  const [topTodayScores, setTopTodayScores] = useState([]);

  useEffect(() => {
    // A busca pelas melhores pontuações só acontece se não for treino e não for desafio
    if (user?.id && !results?.is_training && !results?.is_challenge) {
      api.get('/api/user_stats/top_scores_today', { params: { telegram_id: user.id } })
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

  const percentualAcerto = results.total_perguntas > 0 ? (results.num_acertos / results.total_perguntas * 100).toFixed(0) : "0";
  const isTraining = results.is_training;
  const isChallenge = results.is_challenge;

  // Adiciona a classe de desafio ao container principal se for um desafio
  const containerClass = `${styles.screenContainer} ${isChallenge ? styles.challengeResults : ''}`;

  return (
    <div className={containerClass}>
        <div className={styles.header}>
            {isChallenge && <div className={styles.trophyIcon}>🔥</div>}
            <h2>
              {isTraining ? 'Treino Concluído!' : 
               isChallenge ? 'Desafio Finalizado!' :
               `Parabéns, ${user?.first_name || ''}!`}
            </h2>
            <p>{isTraining ? 'Continue praticando!' : isChallenge ? 'Belo desempenho!' : 'Você concluiu o simulado!'}</p>
        </div>
        <div className={styles.content}>
            <div className={styles.scoreSummary}>
                <p>Você acertou</p>
                <p className={styles.highlightScore}><strong>{results.num_acertos} de {results.total_perguntas} ({percentualAcerto}%)</strong></p>
                
                {/* Oculta a pontuação detalhada se for treino ou desafio */}
                {!isTraining && !isChallenge && (
                  <>
                    <hr className={styles.divider} />
                    <p>Sua pontuação: <strong>{results.pontuacao_base} Pts</strong></p>
                    {results.pontuacao_final_com_bonus - results.pontuacao_base > 0 && 
                        <p>Bônus por Desempenho: <strong>+{results.pontuacao_final_com_bonus - results.pontuacao_base} Pts</strong></p>
                    }
                    <p>Total: <strong className={styles.finalScore}>{results.pontuacao_final_com_bonus} Pts</strong></p>
                  </>
                )}
            </div>
            
            {/* Oculta as melhores do dia se for treino ou desafio */}
            {!isTraining && !isChallenge && (
              <div className={styles.topScoresSection}>
                  <p>Suas 3 melhores pontuações do dia:</p>
                  <div className={styles.scoresList}>
                      {topTodayScores.length > 0 
                          ? topTodayScores.map((score, index) => <span key={index} className={styles.scoreItem}>{score}Pts </span>)
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