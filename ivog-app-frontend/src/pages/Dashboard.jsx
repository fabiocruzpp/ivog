// ivog-app-frontend/src/pages/Dashboard.jsx

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import styles from './Dashboard.module.css';

const ADMIN_TELEGRAM_ID = '1318210843';

function Dashboard() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const checkUserRegistration = async () => {
      try {
        const telegramUser = window.Telegram.WebApp.initDataUnsafe?.user;

        if (!telegramUser || !telegramUser.id) {
          throw new Error('Não foi possível identificar seu usuário no Telegram.');
        }

        setUser(telegramUser);
        if (telegramUser.id.toString() === ADMIN_TELEGRAM_ID) {
          setIsAdmin(true);
        }

        // Verifica o perfil do usuário na nossa API
        try {
          const response = await api.get(`/user/${telegramUser.id}`);
          // Se o usuário existe mas não tem um cargo, ele não completou o cadastro
          if (!response.data || !response.data.cargo) {
            navigate('/register');
          }
        } catch (apiError) {
          // Se der 404, o usuário não existe no nosso banco
          if (apiError.response && apiError.response.status === 404) {
            navigate('/register');
          } else {
            // Outro erro de API
            throw new Error('Não foi possível verificar seu cadastro. Tente novamente mais tarde.');
          }
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    checkUserRegistration();
  }, [navigate]);

  if (loading) {
    return <p style={{textAlign: 'center', padding: '20px'}}>A verificar os seus dados...</p>;
  }

  if (error) {
    return <p style={{textAlign: 'center', padding: '20px', color: 'red'}}>{error}</p>;
  }

  if (!user) {
    return <p style={{textAlign: 'center', padding: '20px'}}>A carregar...</p>;
  }

  return (
    <div className={styles.screenContainer}>
      <div className={styles.header}>
        {/* O conteúdo do cabeçalho está no background-image */}
      </div>
      <div className={styles.mainContent}>
        <div className={styles.welcomeText}>
          <h2>Bem-vindo(a), {user.first_name}!</h2>
          <p>Teste os seus conhecimentos.</p>
        </div>
        
        <Link to="/quiz" className={`${styles.actionButton} ${styles.primaryButton}`}>🚀 Iniciar Simulado</Link>
        <Link to="/challenges" className={`${styles.actionButton} ${styles.challengeButton}`}>🔥 Meus Desafios</Link>
        <Link to="/stats" className={`${styles.actionButton} ${styles.secondaryButton}`}>📊 Minhas Estatísticas</Link>
        <Link to="/profile" className={`${styles.actionButton} ${styles.secondaryButton}`}>👤 Atualizar Dados</Link>
        <Link to="/ranking" className={`${styles.actionButton} ${styles.secondaryButton}`}>🏆 TOP10</Link>
        
        {isAdmin && (
          <Link to="/admin" className={`${styles.actionButton} ${styles.adminButton}`}>⚙️ Painel Admin</Link>
        )}
      </div>
    </div>
  );
}

export default Dashboard;