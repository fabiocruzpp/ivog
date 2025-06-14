import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useUserStore } from '../store/userStore';
import { useFeedbackStore } from '../store/feedbackStore';
import styles from './TrainingLobbyPage.module.css';

function TrainingLobbyPage() {
    const [availableThemes, setAvailableThemes] = useState([]);
    const [selectedThemes, setSelectedThemes] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user } = useUserStore();
    const navigate = useNavigate();
    const { addToast } = useFeedbackStore();

    useEffect(() => {
        if (user?.id) {
            api.get('/quiz/available-themes', { params: { telegram_id: user.id } })
                .then(response => {
                    setAvailableThemes(response.data);
                })
                .catch(err => {
                    console.error("Falha ao buscar temas de treino:", err);
                    addToast('Não foi possível carregar os temas.', 'error');
                })
                .finally(() => {
                    setLoading(false);
                });
        }
    }, [user, addToast]);

    const handleThemeToggle = (theme) => {
        setSelectedThemes(prev => 
            prev.includes(theme)
                ? prev.filter(t => t !== theme)
                : [...prev, theme]
        );
    };

    const handleStartTraining = () => {
        if (selectedThemes.length === 0) {
            addToast('Selecione pelo menos um tema para começar.', 'error');
            return;
        }
        const themesParam = selectedThemes.join(',');
        navigate(`/quiz?is_training=true&temas=${themesParam}`);
    };
    
    if (loading) {
        return <p className={styles.loadingMessage}>Carregando temas disponíveis...</p>;
    }

    return (
        <div className={styles.lobbyContainer}>
            <div className={styles.instructions}>
                <h3>Selecione os Temas</h3>
                <p>Escolha um ou mais temas sobre os quais você quer treinar.</p>
            </div>

            <div className={styles.themeGrid}>
                {availableThemes.length > 0 ? (
                    availableThemes.map(theme => (
                        <button 
                            key={theme} 
                            className={`${styles.themeButton} ${selectedThemes.includes(theme) ? styles.selected : ''}`}
                            onClick={() => handleThemeToggle(theme)}
                        >
                            {theme}
                        </button>
                    ))
                ) : (
                    <p>Nenhum tema disponível para o seu perfil no momento.</p>
                )}
            </div>

            <button 
                className={styles.startButton} 
                onClick={handleStartTraining}
                disabled={selectedThemes.length === 0}
            >
                Iniciar Treino ({selectedThemes.length} {selectedThemes.length === 1 ? 'tema' : 'temas'})
            </button>
        </div>
    );
}

export default TrainingLobbyPage;