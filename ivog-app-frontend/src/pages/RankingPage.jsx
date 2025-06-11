import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Link } from 'react-router-dom';
import styles from './RankingPage.module.css'; // Importa nosso novo CSS Módulo

// Ícone de voltar como um componente React para reutilização
const BackArrowIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"></path>
  </svg>
);

function RankingPage() {
  const [periodo, setPeriodo] = useState('semanal'); // Inicia com 'semanal' por padrão
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchRanking = async () => {
      try {
        setLoading(true);
        setError('');
        const params = periodo === 'geral' ? {} : { periodo };
        const response = await api.get('/top10', { params });
        setRanking(response.data);
      } catch (err) {
        setError('Não foi possível carregar o ranking.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchRanking();
  }, [periodo]);

  const getRankClassName = (index) => {
    if (index === 0) return `${styles.rankBadge} ${styles.rank1}`;
    if (index === 1) return `${styles.rankBadge} ${styles.rank2}`;
    if (index === 2) return `${styles.rankBadge} ${styles.rank3}`;
    return styles.rankBadge;
  };
  
  const renderContent = () => {
    if (loading) return <p style={{ textAlign: 'center' }}>Carregando ranking...</p>;
    if (error) return <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>;
    if (ranking.length === 0) return <p style={{ textAlign: 'center' }}>Ainda não há dados no ranking para este período.</p>;

    return (
      ranking.map((user, index) => (
        <div key={index} className={styles.leaderboardItem}>
          <div className={getRankClassName(index)}>{index + 1}</div>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{user.nome}</span>
            <span className={styles.userPoints}>{user.pontos} Pts</span>
          </div>
        </div>
      ))
    );
  };
  
  return (
    <div className={styles.screenContainer}>
      <div className={styles.headerBar}>
        <Link to="/" className={styles.headerIconBtn}>
          <BackArrowIcon />
        </Link>
        <h1 className={styles.screenTitle}>Leaderboard</h1>
      </div>

      <div className={styles.contentArea}>
        <div className={styles.periodTabs}>
          <button 
            onClick={() => setPeriodo('semanal')} 
            className={`${styles.periodTabButton} ${periodo === 'semanal' ? styles.active : ''}`}
          >
            Semanal
          </button>
          <button 
            onClick={() => setPeriodo('mensal')} 
            className={`${styles.periodTabButton} ${periodo === 'mensal' ? styles.active : ''}`}
          >
            Mensal
          </button>
          <button 
            onClick={() => setPeriodo('geral')} 
            className={`${styles.periodTabButton} ${periodo === 'geral' ? styles.active : ''}`}
          >
            Geral
          </button>
        </div>
        
        {renderContent()}
      </div>
    </div>
  );
}

export default RankingPage;