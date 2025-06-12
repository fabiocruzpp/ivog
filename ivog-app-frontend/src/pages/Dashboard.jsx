import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
// Importa nosso CSS Módulo. O 'styles' se torna um objeto com nossas classes.
import styles from './Dashboard.module.css';

const ADMIN_TELEGRAM_ID = '1318210843'; // Para mostrar/ocultar o botão de admin

function Dashboard() {
  const [user, setUser] = useState({ first_name: 'Usuário' });
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const telegram = window.Telegram.WebApp;
    if (telegram.initDataUnsafe?.user) {
      const tgUser = telegram.initDataUnsafe.user;
      setUser(tgUser);
      if (tgUser.id.toString() === ADMIN_TELEGRAM_ID) {
        setIsAdmin(true);
      }
    }
  }, []);

  return (
    <div className={styles.screenContainer}>
      <div className={styles.header}>
        {/* O conteúdo do cabeçalho está no background-image */}
      </div>
      <div className={styles.mainContent}>
        <div className={styles.welcomeText}>
          <h2>Bem-vindo(a), {user.first_name}!</h2>
          <p>Teste seus conhecimentos.</p>
        </div>
        
        {/* Note como usamos className e o objeto styles */}
        <Link to="/quiz" className={`${styles.actionButton} ${styles.primaryButton}`}>🚀 Iniciar Simulado</Link>
        <Link to="/challenges" className={`${styles.actionButton} ${styles.challengeButton}`}>🔥 Meus Desafios</Link>
        <Link to="/stats" className={`${styles.actionButton} ${styles.secondaryButton}`}>📊 Minhas Estatísticas</Link>
        <Link to="/profile" className={`${styles.actionButton} ${styles.secondaryButton}`}>👤 Atualizar Dados</Link>
        <Link to="/ranking" className={`${styles.actionButton} ${styles.secondaryButton}`}>🏆 TOP10</Link>
        
        {/* Botão de Admin só aparece se o usuário for admin */}
        {isAdmin && (
          <Link to="/admin" className={`${styles.actionButton} ${styles.adminButton}`}>⚙️ Painel Admin</Link>
        )}
      </div>
    </div>
  );
}

export default Dashboard;