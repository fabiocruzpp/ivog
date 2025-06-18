import React, { useState, useEffect } from 'react';
import api from '../services/api';
import styles from './StatsPage.module.css';

const TemaIcon = () => (
    <svg viewBox="0 0 24 24" fill="var(--primary-dark-purple)"><path d="M12 3L2 9l10 6 10-6-10-6zm0 13.66L5.5 12 12 8.34 18.5 12 12 16.66zM2 15l10 6 10-6v-2.03l-10 6-10-6V15z"></path></svg>
);

const DesafioIcon = () => (
    <svg viewBox="0 0 24 24" fill="var(--primary-dark-purple)"><path d="M20.78 6.07C19.95 4.82 18.58 4 17 4c-2.76 0-5 2.24-5 5s2.24 5 5 5c1.58 0 2.95-.82 3.78-2.07L22.2 13.35c.13.28.2.61.2.95 0 1.1-.9 2-2 2h-1c-.55 0-1 .45-1 1s.45 1 1 1h1c2.21 0 4-1.79 4-4 0-.34-.07-.67-.2-.95l-1.42-1.42zM17 12c-1.65 0-3-1.35-3-3s1.35-3 3-3 3 1.35 3 3-1.35 3-3 3zM9.5 17.5c1.03 0 1.94-.53 2.46-1.35L9.83 12.5H7.5v2H9c.28 0 .5.22.5.5s-.22.5-.5.5H7.5v2H9c.28 0 .5.22.5.5s-.22.5-.5.5H5.75c-.55 0-1-.45-1-1V9.25c0-.55.45-1 1-1h2.87L12.5 4.65C11.96 3.91 11.06 3.5 10 3.5c-2.21 0-4 1.79-4 4s1.79 4 4 4c.73 0 1.4-.21 2-.56v1.61c-1.28.93-2.13 2.37-2.35 4H4.25c-.55 0-1 .45-1 1s.45 1 1 1h5.25z"></path></svg>
);

function PerformanceItem({ icon, title, value, total, percentage }) {
  return (
    <div className={styles.listStatCard}>
      <div className={styles.itemIcon}>{icon}</div>
      <div className={styles.itemInfo}>
        <h5 className={styles.itemTitle}>{title}</h5>
        <p className={styles.itemDetail}>Acertos: <strong>{percentage}%</strong> ({value}/{total})</p>
        <div className={styles.progressBarContainer}>
          <div className={styles.progressBarFill} style={{ width: `${percentage}%` }}></div>
        </div>
      </div>
    </div>
  );
}

function StatsPage() {
  const [statsData, setStatsData] = useState(null);
  const [challengeDetails, setChallengeDetails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tgUser, setTgUser] = useState(null);
  const [activeTab, setActiveTab] = useState('subtemas');

  useEffect(() => {
    const fetchAllData = async (telegramId) => {
      try {
        setLoading(true);
        const [statsResponse, userProfileResponse, challengeDetailsResponse] = await Promise.all([
          api.get('/stats/my_stats', { params: { telegram_id: telegramId } }),
          api.get(`/user/${telegramId}`),
          api.get('/stats/my_challenges_participated_details', { params: { telegram_id: telegramId } })
        ]);
        setStatsData(statsResponse.data);
        setTgUser(userProfileResponse.data);
        setChallengeDetails(challengeDetailsResponse.data);
      } catch (err) {
        console.error("Falha ao buscar dados para a página de estatísticas:", err);
        if (err.response) {
            console.error("Detalhes do erro:", err.response.data);
            setError(`Erro ao carregar: ${err.response.data.error || 'Serviço indisponível'}`);
        } else {
            setError('Não foi possível carregar os dados. Verifique sua conexão.');
        }
      } finally {
        setLoading(false);
      }
    };
    const telegram = window.Telegram.WebApp;
    const user = telegram.initDataUnsafe?.user;
    if (user && user.id) {
      fetchAllData(user.id);
    } else {
      setError('ID do Telegram não encontrado.');
      setLoading(false);
    }
  }, []);

  const renderContent = () => {
    if (loading) return <p className={styles.noDataMessage}>Carregando estatísticas...</p>;
    if (error) return <p className={styles.noDataMessage} style={{ color: 'red' }}>{error}</p>;
    if (!statsData || !tgUser) return <p className={styles.noDataMessage}>Não há dados para exibir.</p>;

    return (
      <>
        <div className={styles.userSummarySection}>
          <img src={tgUser.photo_url || `https://placehold.co/60x60/E0E0E0/757575?text=${(tgUser.first_name || 'U').charAt(0)}`} alt="Avatar" className={styles.avatar} />
          <div className={styles.userDetails}>
            <h2 className={styles.userName}>{tgUser.first_name}</h2>
            <div className={styles.highlightStatsGrid}>
              <div className={styles.statItem}>
                <span className={styles.statValue}>{statsData.total_simulados_realizados}</span>
                <span className={styles.statLabel}>Quizzes</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statValue}>{statsData.percentual_acerto_geral_formatado}%</span>
                <span className={styles.statLabel}>Acerto</span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.tabsNavigation}>
          <button onClick={() => setActiveTab('subtemas')} className={`${styles.tabButton} ${activeTab === 'subtemas' ? styles.active : ''}`}>Por Subtema</button>
          <button onClick={() => setActiveTab('desafios')} className={`${styles.tabButton} ${activeTab === 'desafios' ? styles.active : ''}`}>Desafios</button>
        </div>

        <div className={styles.contentArea}>
            <div className={`${styles.tabContent} ${activeTab === 'subtemas' ? styles.active : ''}`}>
                {statsData.desempenho_subtemas && statsData.desempenho_subtemas.length > 0
                    ? statsData.desempenho_subtemas.map(s => <PerformanceItem key={s.subtema} icon={<TemaIcon />} title={s.subtema} value={s.acertos_brutos} total={s.total_respostas} percentage={s.percentual_acerto_bruto} />)
                    : <p className={styles.noDataMessage}>Sem dados de desempenho por subtema.</p>
                }
            </div>
            <div className={`${styles.tabContent} ${activeTab === 'desafios' ? styles.active : ''}`}>
                 {challengeDetails.length > 0
                    ? challengeDetails.map(d => (
                        <PerformanceItem 
                            key={d.contexto_desafio} 
                            icon={<DesafioIcon />} 
                            title={d.titulo_desafio} 
                            value={d.total_acertos_brutos_no_desafio} 
                            total={d.total_perguntas_no_desafio} 
                            percentage={parseFloat(d.percentual_acerto_bruto_formatado).toFixed(0)} 
                        />
                      ))
                    : <p className={styles.noDataMessage}>Você ainda não participou de desafios.</p>
                 }
            </div>
        </div>
      </>
    );
  };

  return (
    <div className={styles.screenContainer}>
        {renderContent()}
    </div>
  );
}

export default StatsPage;