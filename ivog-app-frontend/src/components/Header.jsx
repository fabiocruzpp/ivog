import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUserStore } from '../store/userStore';
import { useQuizStore } from '../store/quizStore';
import styles from './Header.module.css';

const BackArrowIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"></path>
  </svg>
);

const UserIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"></path>
  </svg>
);

const pageTitles = {
  '/quiz': 'Simulado',
  '/stats': 'Minhas Estatísticas',
  '/ranking': 'Leaderboard',
  '/profile': 'Atualizar Dados',
  '/challenges': 'Meus Desafios',
  '/quiz/results': 'Resultado',
  '/admin': 'Painel de Admin',
  '/admin/questions': 'Gerenciar Perguntas',
  '/register': 'Finalize seu Cadastro',
};

function Header() {
  const { user } = useUserStore();
  const { isChallengeActive, challengeTitle } = useQuizStore();
  const location = useLocation();
  const navigate = useNavigate();

  const isHomePage = location.pathname === '/';
  
  const pageTitle = isChallengeActive 
    ? '🔥 MODO DESAFIO 🔥' 
    : (pageTitles[location.pathname] || 'IvoG');
  
  const headerClass = `${styles.header} ${isChallengeActive ? styles.challengeHeader : ''}`;

  return (
    <header className={headerClass}>
      <div className={styles.leftSection}>
        {!isHomePage && (
          <button onClick={() => navigate(-1)} className={styles.backButton}>
            <BackArrowIcon />
          </button>
        )}
      </div>
      <div className={styles.centerSection}>
        <h1 className={styles.pageTitle}>{pageTitle}</h1>
        {isChallengeActive && challengeTitle && (
            <small className={styles.challengeSubtitle}>{challengeTitle}</small>
        )}
      </div>
      <div className={styles.rightSection}>
        {user && (
          <>
            <UserIcon />
            <span>{user.first_name}</span>
          </>
        )}
      </div>
    </header>
  );
}

export default Header;