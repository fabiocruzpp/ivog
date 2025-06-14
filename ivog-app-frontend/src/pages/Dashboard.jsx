// ivog-app-frontend/src/pages/Dashboard.jsx

import React from 'react';
import { Link } from 'react-router-dom';
import styles from './Dashboard.module.css';
import { useUserStore } from '../store/userStore';
import { useConfigStore } from '../store/configStore';

function Dashboard() {
  const { user, isAdmin, error } = useUserStore();
  const { configs } = useConfigStore();

  if (error) {
    return <p style={{textAlign: 'center', padding: '20px', color: 'red'}}>{error}</p>;
  }

  if (!user) {
    return null; 
  }

  return (
    <div className={styles.screenContainer}>
      <div className={styles.header}>
      </div>
      <div className={styles.mainContent}>
        <div className={styles.welcomeText}>
          <h2>Bem-vindo(a), {user.first_name}!</h2>
          <p>Teste os seus conhecimentos.</p>
        </div>
        
        <Link to="/quiz" className={`${styles.actionButton} ${styles.primaryButton}`}>🚀 Iniciar Simulado</Link>
        
        {configs.modo_treino_ativado && (
          <Link to="/training" className={`${styles.actionButton} ${styles.secondaryButton}`}>🎓 Modo Treino</Link>
        )}

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