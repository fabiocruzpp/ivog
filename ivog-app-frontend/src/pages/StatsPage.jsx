import React, { useEffect, useState } from 'react';
import api from '../services/api';
import styles from './StatsPage.module.css';
import Modal from 'react-modal'; // Importe o react-modal

// Configura o elemento raiz para o modal
Modal.setAppElement('#root'); // Use o ID do seu elemento raiz, geralmente #root

// --- Ícones (Exemplo - substitua por seus próprios componentes de ícone se tiver) ---
const TemaIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2L2 12h3v8h14v-8h3L12 2zm0 2.83l6.17 6.17H15v8h-6v-8H5.83L12 4.83z"/></svg>
);

const DesafioIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 2.17L19 6.3V11c0 4.52-2.87 8.79-7 10.43C5.87 19.79 3 15.52 3 11V6.3L12 3.17z"/></svg>
);

const TesteIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
);

// --- Componente para exibir um item de desempenho (usado para Subtemas e Desafios) ---
function PerformanceItem({ icon, title, value, total, percentage }) {
    const percent = parseFloat(percentage);
    const progressBarWidth = isNaN(percent) ? 0 : percent;

    return (
        <div className={styles.listStatCard}>
            <div className={styles.itemIcon}>
                {icon}
            </div>
            <div className={styles.itemInfo}>
                <h3 className={styles.itemTitle}>{title}</h3>
                <p className={styles.itemDetail}>Acertos: {value}/{total}</p>
                <p className={styles.itemDetail}>Percentual: <strong>{percentage}%</strong></p>
                <div className={styles.progressBarContainer}>
                    <div
                        className={styles.progressBarFill}
                        style={{ width: `${progressBarWidth}%` }}
                    ></div>
                </div>
            </div>
        </div>
    );
}

// --- Novo Componente para exibir um item na lista de testes ---
function TestListItem({ test, onClick }) {
    let iconClass = styles.testTypeSimulado; // Classe padrão
    if (test.tipo === 'Treino') {
        iconClass = styles.testTypeTreino;
    } else if (test.tipo.startsWith('Desafio')) { // Verifica se começa com 'Desafio'
        iconClass = styles.testTypeDesafio;
    }

    return (
        <div className={`${styles.listStatCard} ${styles.testListItem}`} onClick={() => onClick(test.id_simulado)}>
            <div className={`${styles.itemIconTeste} ${iconClass}`}>
                <TesteIcon />
            </div>
            <div className={styles.itemInfo}>
                <h3 className={styles.itemTitle}>{test.tipo}</h3>
                <p className={styles.itemDetail}>Data: {new Date(test.data_inicio).toLocaleDateString()}</p> {/* Formata a data */}
                <p className={styles.itemDetail}>Acertos: {test.acertos_display}</p>
                 <p className={styles.itemDetail}>Percentual: <strong>{test.percentual_acerto}%</strong></p>
                <div className={styles.progressBarContainer}>
                    <div
                        className={styles.progressBarFill}
                        style={{ width: `${parseFloat(test.percentual_acerto)}%` }}
                    ></div>
                </div>
            </div>
        </div>
    );
}

// --- Novo Componente para o Modal de Detalhes do Teste ---
function TestDetailsModal({ isOpen, onClose, testDetails }) {
    if (!isOpen) return null; // Não renderiza se não estiver aberto

    const { simuladoInfo, respostas } = testDetails || {};

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <div className={styles.modalHeader}>
                    <h2 className={styles.modalTitle}>Detalhes do Teste ({simuladoInfo?.tipo})</h2>
                    <button onClick={onClose} className={styles.modalCloseButton}>&times;</button>
                </div>
                <div className={styles.modalBody}>
                    {respostas && respostas.length > 0 ? (
                        respostas.map((resposta, index) => (
                            <div key={index} className={styles.questionDetailItem}>
                                <div className={styles.questionHeader}>
                                     {/* Ícone de acerto/erro */}
                                    <span style={{ color: resposta.acertou ? 'green' : 'red', fontSize: '20px' }}>
                                        {resposta.acertou ? '✅' : '❌'}
                                    </span>
                                    <p className={styles.questionText}>{resposta.pergunta}</p>
                                </div>
                                <p className={`${styles.answerText} ${resposta.acertou ? styles.answerCorrect : styles.answerIncorrect}`}>Sua resposta: <strong className={resposta.acertou ? styles.answerCorrect : styles.answerIncorrect}>{resposta.resposta_usuario}</strong></p>
                                {!resposta.acertou && (
                                    <p className={styles.answerText}>Correta: <strong>{resposta.resposta_correta}</strong></p>
                                )}
                                {(resposta.tema || resposta.subtema) && (
                                     <p className={styles.questionTopic}>
                                        {resposta.tema && `Tema: ${resposta.tema}`}
                                        {resposta.tema && resposta.subtema && ' - '}
                                        {resposta.subtema && `Subtema: ${resposta.subtema}`}
                                    </p>
                                )}
                            </div>
                        ))
                    ) : (
                        <p className={styles.noDataMessage}>Detalhes do teste não disponíveis.</p>
                    )}
                </div>
            </div>
        </div>
    );
}

// --- Componente principal StatsPage ---

function StatsPage() {
  const [statsData, setStatsData] = useState(null);
  const [challengeDetails, setChallengeDetails] = useState([]);
  const [testsList, setTestsList] = useState([]);
  const [selectedTestDetails, setSelectedTestDetails] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tgUser, setTgUser] = useState(null);
  const [activeTab, setActiveTab] = useState('subtemas');

  const telegramId = window.Telegram.WebApp.initDataUnsafe?.user?.id;

  useEffect(() => {
    const fetchInitialData = async (telegramId) => {
      if (!telegramId) {
        setError('ID do Telegram não encontrado.');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const [statsResponse, userProfileResponse, challengeDetailsResponse] = await Promise.all([
          api.get('/stats/my_stats', { params: { telegram_id: telegramId } }),
          api.get(`/user/${telegramId}`),
          api.get('/stats/my_challenges_participated_details', { params: { telegram_id: telegramId } })
        ]);

        console.log("Resposta da API /stats/my_stats:", statsResponse.data); // <-- LOG DE DEPURACAO
        setStatsData(statsResponse.data);

        console.log("Resposta da API /user/:id:", userProfileResponse.data); // <-- LOG DE DEPURACAO
        setTgUser(userProfileResponse.data);

        console.log("Resposta da API /stats/my_challenges_participated_details:", challengeDetailsResponse.data); // <-- LOG DE DEPURACAO
        setChallengeDetails(challengeDetailsResponse.data);

      } catch (err) {
        console.error("Falha ao buscar dados iniciais para a página de estatísticas:", err);
        if (err.response) {
            console.error("Detalhes do erro:", err.response.data);
            setError(`Erro ao carregar dados iniciais: ${err.response.data.error || 'Serviço indisponível'}`);
        } else {
            setError('Não foi possível carregar os dados iniciais. Verifique sua conexão.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData(telegramId);

  }, [telegramId]);

  useEffect(() => {
      const fetchTestsList = async (telegramId) => {
           if (!telegramId) return;
           if (testsList.length > 0) return;
           if (activeTab !== 'testes') return;

           try {
               const testsResponse = await api.get('/stats/my_tests_list', { params: { telegram_id: telegramId } });
               console.log("Resposta da API /stats/my_tests_list:", testsResponse.data); // <-- LOG DE DEPURACAO
               setTestsList(testsResponse.data);
           } catch (err) {
               console.error("Falha ao buscar lista de testes:", err);
           }
      };

      fetchTestsList(telegramId);

  }, [activeTab, telegramId, testsList.length]);


  const handleTestClick = async (simuladoId) => {
      if (!telegramId) {
          console.error("Telegram ID não disponível para buscar detalhes do teste.");
          return;
      }
      try {
          const detailsResponse = await api.get('/stats/test_details', { params: { id_simulado: simuladoId, telegram_id: telegramId } });
          console.log("Resposta da API /stats/test_details:", detailsResponse.data); // <-- LOG DE DEPURACAO
          setSelectedTestDetails(detailsResponse.data);
          setIsModalOpen(true);
      } catch (err) {
           console.error("Falha ao buscar detalhes do teste:", err);
      }
  };

  const handleCloseModal = () => {
      setIsModalOpen(false);
      setSelectedTestDetails(null);
  };


  const renderContent = () => {
    if (loading) return <p className={styles.noDataMessage}>Carregando estatísticas...</p>;
    if (error) return <p className={styles.noDataMessage} style={{ color: 'red' }}>{error}</p>;
    if (!statsData || !tgUser) return <p className={styles.noDataMessage}>Não há dados para exibir.</p>;

    console.log("Dados de statsData (para subtemas):", statsData); // <-- LOG DE DEPURACAO
    console.log("Dados de challengeDetails (para desafios):", challengeDetails); // <-- LOG DE DEPURACAO
    console.log("Dados de testsList (para meus testes):", testsList); // <-- LOG DE DEPURACAO
    console.log("Aba ativa:", activeTab); // <-- LOG DE DEPURACAO


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
          <button onClick={() => setActiveTab('testes')} className={`${styles.tabButton} ${activeTab === 'testes' ? styles.active : ''}`}>Meus Testes</button>
        </div>

        <div className={styles.contentArea}>
            <div className={`${styles.tabContent} ${activeTab === 'subtemas' ? styles.active : ''}`}>
                {/* Verifica se statsData e desempenho_subtemas existem e não estão vazios */}
                {statsData && statsData.desempenho_subtemas && statsData.desempenho_subtemas.length > 0
                    ? statsData.desempenho_subtemas.map(s => <PerformanceItem key={s.subtema} icon={<TesteIcon />} title={s.subtema} value={s.acertos_brutos} total={s.total_respostas} percentage={s.percentual_acerto_bruto} />)
                    : activeTab === 'subtemas' && <p className={styles.noDataMessage}>Sem dados de desempenho por subtema.</p>
                }
            </div>
            <div className={`${styles.tabContent} ${activeTab === 'desafios' ? styles.active : ''}`}>
                 {/* Verifica se challengeDetails existe e não está vazio */}
                 {challengeDetails && challengeDetails.length > 0
                    ? challengeDetails.map(d => (
                        <PerformanceItem
                            key={d.contexto_desafio}
                            icon={<TesteIcon />}
                            title={d.titulo_desafio}
                            value={d.total_acertos_brutos_no_desafio}
                            total={d.total_perguntas_no_desafio}
                            percentage={parseFloat(d.percentual_acerto_bruto_formatado).toFixed(0)}
                        />
                      ))
                    : activeTab === 'desafios' && <p className={styles.noDataMessage}>Você ainda não participou de desafios.</p>
                 }
            </div>
             <div className={`${styles.tabContent} ${activeTab === 'testes' ? styles.active : ''}`}>
                 {testsList && testsList.length > 0
                    ? testsList.map(test => (
                        <TestListItem
                            key={test.id_simulado}
                            test={test}
                            onClick={handleTestClick}
                        />
                      ))
                    : activeTab === 'testes' && <p className={styles.noDataMessage}>Você ainda não realizou nenhum teste.</p>
                 }
            </div>
        </div>

        <TestDetailsModal
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            testDetails={selectedTestDetails}
        />
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
