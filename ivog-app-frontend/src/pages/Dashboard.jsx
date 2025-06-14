// ivog-app-frontend/src/pages/Dashboard.jsx

import React from 'react'; // Não precisa mais de useEffect
import { Link } from 'react-router-dom'; // Não precisa mais de useNavigate
import styles from './Dashboard.module.css';
import { useUserStore } from '../store/userStore';

function Dashboard() {
  // Consome o estado do store, que já foi (ou está sendo) preenchido pelo App.jsx
  const { user, isAdmin, error } = useUserStore();

  // O useEffect que chamava `fetchUser` foi removido daqui.

  // A tela de carregamento global já está cuidando do estado inicial.
  // Se houver um erro na busca inicial do usuário, mostramos aqui.
  if (error) {
    return <p style={{textAlign: 'center', padding: '20px', color: 'red'}}>{error}</p>;
  }

  // Se o usuário ainda não foi carregado (e não houve erro),
  // o spinner global estará ativo, então podemos retornar null aqui para evitar o flash.
  if (!user) {
    return null; 
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