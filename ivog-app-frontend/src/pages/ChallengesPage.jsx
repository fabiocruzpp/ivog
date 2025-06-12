import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import styles from './ChallengesPage.module.css';

const BackArrowIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"></path></svg>
);

function ChallengesPage() {
    const [challenges, setChallenges] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

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

    const renderContent = () => {
        if (loading) return <p className={styles.message}>Carregando desafios...</p>;
        if (error) return <p className={`${styles.message} ${styles.error}`}>{error}</p>;
        if (challenges.length === 0) return <p className={styles.message}>Não há desafios disponíveis para você no momento.</p>;

        return (
            <div className={styles.challengesGrid}>
                {challenges.map(challenge => (
                    <Link key={challenge.id} to={`/quiz?desafio_id=${challenge.id}`} className={styles.challengeCard}>
                        <div className={styles.cardHeader}>
                           <h3>{challenge.titulo}</h3>
                        </div>
                        <div className={styles.cardBody}>
                            <p>{challenge.descricao}</p>
                        </div>
                        <div className={styles.cardFooter}>
                            <span>Termina em: {new Date(challenge.data_fim).toLocaleDateString()}</span>
                            <span className={styles.participateButton}>Participar</span>
                        </div>
                    </Link>
                ))}
            </div>
        );
    };

    return (
        <div className={styles.screenContainer}>
            <div className={styles.headerBar}>
                <Link to="/" className={styles.headerIconBtn}><BackArrowIcon /></Link>
                <h1 className={styles.screenTitle}>Meus Desafios</h1>
            </div>
            <div className={styles.contentArea}>
                {renderContent()}
            </div>
        </div>
    );
}

export default ChallengesPage;