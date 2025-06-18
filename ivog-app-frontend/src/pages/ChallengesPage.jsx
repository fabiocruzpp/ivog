import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom'; // Import useNavigate
import api from '../services/api';
import styles from './ChallengesPage.module.css';

const BackArrowIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"></path></svg>
);

function ChallengesPage() {
    const [challenges, setChallenges] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate(); // Hook para navegação

    useEffect(() => {
        const fetchChallenges = async (telegramId) => {
            try {
                // O backend agora retorna desafios para os quais o usuário é público alvo,
                // incluindo expirados e concluídos, com flags de status.
                const response = await api.get('/challenges/available', { params: { telegram_id: telegramId } });
                setChallenges(response.data);
            } catch (err) {
                setError('Não foi possível carregar os desafios.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        const user = window.Telegram.WebApp.initDataUnsafe?.user;
        if (user && user.id) {
            fetchChallenges(user.id);
        } else {
            setError('ID do Telegram não encontrado.');
            setLoading(false);
        }
    }, []);

    const handleCardClick = (challenge) => {
        if (challenge.isCompleted) {
            // Exibe uma mensagem para desafio concluído
            alert('Você já concluiu este desafio.'); // Use um modal mais amigável em produção
        } else if (challenge.isExpired) {
            // Exibe uma mensagem para desafio expirado
            alert('Este desafio expirou.'); // Use um modal mais amigável em produção
        } else {
            // Navega para a página do quiz apenas se o desafio estiver ativo e não concluído
            navigate(`/quiz?desafio_id=${challenge.id}`);
        }
    };

    const renderContent = () => {
        if (loading) return <p className={styles.message}>Carregando desafios...</p>;
        if (error) return <p className={`${styles.message} ${styles.error}`}>{error}</p>;
        if (challenges.length === 0) return <p className={styles.message}>Não há desafios disponíveis para você no momento.</p>;

        return (
            <div className={styles.challengesGrid}>
                {challenges.map(challenge => {
                    // Determina se o card é interativo
                    const isInteractable = !challenge.isCompleted && !challenge.isExpired;
                    
                    // Adiciona classes CSS com base no status
                    const cardClassName = `${styles.challengeCard} ${isInteractable ? '' : styles.disabled} ${challenge.isCompleted ? styles.completed : ''} ${challenge.isExpired ? styles.expired : ''}`;
                    
                    // Determina o texto do rodapé
                    let footerText = 'Participar';
                    if (challenge.isCompleted) {
                        footerText = 'Concluído';
                    } else if (challenge.isExpired) {
                        footerText = 'Expirado';
                    }

                    // Texto da data de expiração
                    const expiryDateText = challenge.data_fim ? `Termina em: ${new Date(challenge.data_fim).toLocaleDateString()}` : '';

                    return (
                        // Usa uma div em vez de Link e trata o clique manualmente
                        <div 
                            key={challenge.id} 
                            className={cardClassName}
                            onClick={() => handleCardClick(challenge)} // Anexa o manipulador de clique
                        >
                            <div className={styles.cardHeader}>
                                <h3>{challenge.titulo}</h3>
                            </div>
                            <div className={styles.cardBody}>
                                <p>{challenge.descricao}</p>
                            </div>
                            <div className={styles.cardFooter}>
                                <span>{expiryDateText}</span>
                                <span className={styles.participateButton}>{footerText}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className={styles.screenContainer}>
            {/* Assumindo que há uma barra de cabeçalho, mantendo para contexto */}
            {/* <div className={styles.headerBar}>
                 <Link to="/" className={styles.headerIconBtn} aria-label="Voltar">
                    <BackArrowIcon />
                </Link>
                <h1 className={styles.screenTitle}>Desafios</h1>
            </div> */}
            
            <div className={styles.contentArea}>
                {renderContent()}
            </div>
        </div>
    );
}

export default ChallengesPage;
