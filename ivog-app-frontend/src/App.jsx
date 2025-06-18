import React, { useEffect, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useUserStore } from './store/userStore';
import { useConfigStore } from './store/configStore';

// Componentes Globais
import ProtectedRoute from './components/ProtectedRoute';
import GlobalFeedback from './components/GlobalFeedback';
import Header from './components/Header';

// --- ALTERAÇÃO 1: Importações de página agora são dinâmicas ---
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const QuizPage = React.lazy(() => import('./pages/QuizPage'));
const RankingPage = React.lazy(() => import('./pages/RankingPage'));
const StatsPage = React.lazy(() => import('./pages/StatsPage'));
const ProfilePage = React.lazy(() => import('./pages/ProfilePage'));
const ResultsPage = React.lazy(() => import('./pages/ResultsPage'));
const AdminPage = React.lazy(() => import('./pages/AdminPage'));
const ChallengesPage = React.lazy(() => import('./pages/ChallengesPage.jsx'));
const RegisterPage = React.lazy(() => import('./pages/RegisterPage'));
const QuestionManagerPage = React.lazy(() => import('./pages/QuestionManagerPage'));
const LoginPage = React.lazy(() => import('./pages/LoginPage'));
const TrainingLobbyPage = React.lazy(() => import('./pages/TrainingLobbyPage'));
const AdminDashboardPage = React.lazy(() => import('./pages/AdminDashboardPage'));

const PageLayout = () => {
  const location = useLocation();
  const showHeader = location.pathname !== '/';

  return (
    <>
      {showHeader && <Header />}
      <main className={showHeader ? "main-container-with-header" : ""}>
        {/* --- ALTERAÇÃO 2: Adição do Suspense com um fallback */}
        <Suspense fallback={<div style={{ textAlign: 'center', padding: '40px' }}>Carregando página...</div>}>
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
              <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
              <Route path="/admin/questions" element={<QuestionManagerPage />} />
            </Route>
          </Routes>
        </Suspense>
      </main>
    </>
  );
};

function AppLogic() {
  const navigate = useNavigate();
  const { fetchUser, isNewUser, loading } = useUserStore();
  const { fetchConfigs } = useConfigStore();

  useEffect(() => {
    fetchUser();
    fetchConfigs();
  }, [fetchUser, fetchConfigs]);

  useEffect(() => {
    // Após a conclusão do carregamento, verifica se é um novo usuário
    if (!loading && isNewUser) {
      // Redireciona para a página de registro
      navigate('/register', { replace: true });
    }
  }, [loading, isNewUser, navigate]);
  
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