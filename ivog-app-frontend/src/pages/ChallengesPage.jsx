import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import styles from './ChallengesPage.module.css';
import { useQuizStore } from '../store/quizStore'; // 1. Importa o quizStore

const BackArrowIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"></path></svg>
);

function ChallengesPage() {
    const [challenges, setChallenges] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { startQuiz } = useQuizStore(); // 2. Pega a ação startQuiz do store

    useEffect(() => {
        const fetchChallenges = async (telegramId) => {
            try {
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
            alert('Você já concluiu este desafio.');
        } else if (challenge.isExpired) {
            alert('Este desafio expirou.');
        } else {
            // 3. CORREÇÃO: Chama o startQuiz passando o ID e o TÍTULO do desafio
            startQuiz({
                desafio_id: challenge.id,
                desafio_titulo: challenge.titulo
            });
            // Navega para a página do quiz
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
                    const isInteractable = !challenge.isCompleted && !challenge.isExpired;
                    const cardClassName = `${styles.challengeCard} ${isInteractable ? '' : styles.disabled} ${challenge.isCompleted ? styles.completed : ''} ${challenge.isExpired ? styles.expired : ''}`;
                    
                    let footerText = 'Participar';
                    if (challenge.isCompleted) {
                        footerText = 'Concluído';
                    } else if (challenge.isExpired) {
                        footerText = 'Expirado';
                    }

                    const expiryDateText = challenge.data_fim ? `Termina em: ${new Date(challenge.data_fim).toLocaleDateString()}` : '';

                    return (
                        <div 
                            key={challenge.id} 
                            className={cardClassName}
                            onClick={() => handleCardClick(challenge)}
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
            <div className={styles.contentArea}>
                {renderContent()}
            </div>
        </div>
    );
}

export default ChallengesPage;