// ivog-app-frontend/src/App.jsx

import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useUserStore } from './store/userStore';

// Componentes
import Dashboard from './pages/Dashboard';
import QuizPage from './pages/QuizPage';
import RankingPage from './pages/RankingPage';
import StatsPage from './pages/StatsPage';
import ProfilePage from './pages/ProfilePage'; // LINHA CORRIGIDA/ADICIONADA
import ResultsPage from './pages/ResultsPage';
import AdminPage from './pages/AdminPage';
import ChallengesPage from './pages/ChallengesPage.jsx';
import RegisterPage from './pages/RegisterPage';
import QuestionManagerPage from './pages/QuestionManagerPage';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import GlobalFeedback from './components/GlobalFeedback';
import Header from './components/Header';

// Componente que gerencia o layout da página (Header + Conteúdo)
const PageLayout = () => {
  const location = useLocation();
  const showHeader = location.pathname !== '/'; // Não mostra o header na home

  return (
    <>
      {showHeader && <Header />}
      {/* Aplica a classe de padding condicionalmente */}
      <main className={showHeader ? "main-container-with-header" : ""}>
        <Routes>
          {/* Rota de Login para a versão Web */}
          <Route path="/login" element={<LoginPage />} />
          
          {/* Rotas Públicas/do App Telegram */}
          <Route path="/" element={<Dashboard />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/quiz" element={<QuizPage />} />
          <Route path="/ranking" element={<RankingPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/quiz/results" element={<ResultsPage />} />
          <Route path="/challenges" element={<ChallengesPage />} />

          {/* Rotas de Admin Protegidas */}
          <Route element={<ProtectedRoute />}>
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/admin/questions" element={<QuestionManagerPage />} />
          </Route>
        </Routes>
      </main>
    </>
  );
};


// Componente auxiliar para lógica de inicialização
function AppLogic() {
  const navigate = useNavigate();
  const { fetchUser } = useUserStore();

  useEffect(() => {
    fetchUser(navigate);
  }, [fetchUser, navigate]);
  
  return null;
}

function App() {
  const isTelegram = !!window.Telegram?.WebApp?.initData;

  useEffect(() => {
    if (isTelegram) {
        window.Telegram.WebApp.ready();
        window.Telegram.WebApp.expand();
    }
  }, [isTelegram]);

  return (
    <BrowserRouter>
      <GlobalFeedback />
      <AppLogic />
      <PageLayout /> {/* Usa o novo componente de Layout */}
    </BrowserRouter>
  );
}

export default App;