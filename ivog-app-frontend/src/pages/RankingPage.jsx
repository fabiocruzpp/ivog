// ivog-app-frontend/src/pages/RankingPage.jsx

import React, { useState, useEffect } from 'react';
import api from '/src/services/api.js';
import styles from '/src/pages/RankingPage.module.css';

// O BackArrowIcon e o Link do react-router-dom foram removidos

function RankingPage() {
  const [periodo, setPeriodo] = useState('semanal');
  const [canal, setCanal] = useState('Geral');
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUserCanal = async () => {
        try {
            const telegram = window.Telegram.WebApp;
            const user = telegram.initDataUnsafe?.user;
            if (user && user.id) {
                const response = await api.get(`/user/${user.id}`);
                if (response.data && response.data.canal_principal) {
                    setCanal(response.data.canal_principal);
                }
            }
        } catch (err) {
            console.error("Não foi possível buscar o canal do utilizador.", err);
        }
    };
    fetchUserCanal();
  }, []);

  useEffect(() => {
    const fetchRanking = async () => {
      try {
        setLoading(true);
        setError('');
        
        const params = { periodo };
        if (canal !== 'Geral') {
            params.canal_filter = canal;
        }

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
  }, [periodo, canal]);

  const getRankClassName = (index) => {
    if (index === 0) return `${styles.rankBadge} ${styles.rank1}`;
    if (index === 1) return `${styles.rankBadge} ${styles.rank2}`;
    if (index === 2) return `${styles.rankBadge} ${styles.rank3}`;
    return styles.rankBadge;
  };
  
  const renderContent = () => {
    if (loading) return <p style={{ textAlign: 'center', padding: '20px' }}>A carregar ranking...</p>;
    if (error) return <p style={{ color: 'red', textAlign: 'center', padding: '20px' }}>{error}</p>;
    if (ranking.length === 0) return <p style={{ textAlign: 'center', padding: '20px' }}>Ainda não há dados no ranking para esta seleção.</p>;

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
      {/* O headerBar antigo foi removido daqui */}
      <div className={styles.contentArea}>
        <div className={styles.tabsContainer}>
            <button onClick={() => setCanal('Geral')} className={`${styles.tabButton} ${canal === 'Geral' ? styles.active : ''}`}>Geral</button>
            <button onClick={() => setCanal('Loja Própria')} className={`${styles.tabButton} ${canal === 'Loja Própria' ? styles.active : ''}`}>Loja Própria</button>
            <button onClick={() => setCanal('Parceiros')} className={`${styles.tabButton} ${canal === 'Parceiros' ? styles.active : ''}`}>Parceiros</button>
            <button onClick={() => setCanal('Distribuição')} className={`${styles.tabButton} ${canal === 'Distribuição' ? styles.active : ''}`}>Distribuição</button>
        </div>
        
        <div className={styles.tabsContainer}>
          <button onClick={() => setPeriodo('semanal')} className={`${styles.tabButton} ${periodo === 'semanal' ? styles.active : ''}`}>Semanal</button>
          <button onClick={() => setPeriodo('mensal')} className={`${styles.tabButton} ${periodo === 'mensal' ? styles.active : ''}`}>Mensal</button>
          <button onClick={() => setPeriodo('geral')} className={`${styles.tabButton} ${periodo === 'geral' ? styles.active : ''}`}>Geral</button>
        </div>
        
        {renderContent()}
      </div>
    </div>
  );
}

export default RankingPage;