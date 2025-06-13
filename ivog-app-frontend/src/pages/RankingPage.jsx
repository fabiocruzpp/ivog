// ivog-app-frontend/src/pages/RankingPage.jsx

import React, { useState, useEffect } from 'react';
// CORREÇÃO: Caminhos de importação ajustados para serem absolutos a partir da raiz do projeto,
// o que resolve o erro de compilação "Could not resolve".
import api from '/src/services/api.js';
import { Link } from 'react-router-dom';
import styles from '/src/pages/RankingPage.module.css';

const BackArrowIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"></path>
  </svg>
);

function RankingPage() {
  const [periodo, setPeriodo] = useState('semanal');
  const [canal, setCanal] = useState('Geral'); // Estado para a aba de canal, 'Geral' é o padrão
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Busca o canal do utilizador para definir a aba ativa
  useEffect(() => {
    const fetchUserCanal = async () => {
        try {
            const telegram = window.Telegram.WebApp;
            const user = telegram.initDataUnsafe?.user;
            if (user && user.id) {
                const response = await api.get(`/user/${user.id}`);
                if (response.data && response.data.canal_principal) {
                    setCanal(response.data.canal_principal); // Define a aba ativa com o canal do utilizador
                }
            }
        } catch (err) {
            console.error("Não foi possível buscar o canal do utilizador.", err);
            // Mantém 'Geral' como padrão em caso de erro
        }
    };
    fetchUserCanal();
  }, []);

  // Busca o ranking sempre que o período ou o canal mudar
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
  }, [periodo, canal]); // Depende de periodo e canal

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
      <div className={styles.headerBar}>
        <Link to="/" className={styles.headerIconBtn}>
          <BackArrowIcon />
        </Link>
        <h1 className={styles.screenTitle}>Leaderboard</h1>
      </div>

      <div className={styles.contentArea}>
        {/* Abas para os Canais */}
        <div className={styles.tabsContainer}>
            <button onClick={() => setCanal('Geral')} className={`${styles.tabButton} ${canal === 'Geral' ? styles.active : ''}`}>Geral</button>
            <button onClick={() => setCanal('Loja Própria')} className={`${styles.tabButton} ${canal === 'Loja Própria' ? styles.active : ''}`}>Loja Própria</button>
            <button onClick={() => setCanal('Parceiros')} className={`${styles.tabButton} ${canal === 'Parceiros' ? styles.active : ''}`}>Parceiros</button>
            <button onClick={() => setCanal('Distribuição')} className={`${styles.tabButton} ${canal === 'Distribuição' ? styles.active : ''}`}>Distribuição</button>
        </div>
        
        {/* Abas para o Período */}
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
