// ivog-app-frontend/src/App.jsx

import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useUserStore } from './store/userStore';
import { useConfigStore } from './store/configStore';

// Componentes de Página
import Dashboard from './pages/Dashboard';
import QuizPage from './pages/QuizPage';
import RankingPage from './pages/RankingPage';
import StatsPage from './pages/StatsPage';
import ProfilePage from './pages/ProfilePage';
import ResultsPage from './pages/ResultsPage';
import AdminPage from './pages/AdminPage';
import ChallengesPage from './pages/ChallengesPage.jsx';
import RegisterPage from './pages/RegisterPage';
import QuestionManagerPage from './pages/QuestionManagerPage';
import LoginPage from './pages/LoginPage';
import TrainingLobbyPage from './pages/TrainingLobbyPage';

// Componentes Globais
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
      <main className={showHeader ? "main-container-with-header" : ""}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Dashboard />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/quiz" element={<QuizPage />} />
          <Route path="/ranking" element={<RankingPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/quiz/results" element={<ResultsPage />} />
          <Route path="/challenges" element={<ChallengesPage />} />
          <Route path="/training" element={<TrainingLobbyPage />} />

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
  const { fetchConfigs } = useConfigStore();

  useEffect(() => {
    fetchUser(navigate);
    fetchConfigs();
  }, [fetchUser, navigate, fetchConfigs]);
  
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
      <PageLayout />
    </BrowserRouter>
  );
}

export default App;