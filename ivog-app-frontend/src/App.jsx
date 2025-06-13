// ivog-app-frontend/src/App.jsx

import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

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

// Componente de Rota Protegida
import ProtectedRoute from './components/ProtectedRoute';


function App() {
  const isTelegram = !!window.Telegram?.WebApp?.initData;

  React.useEffect(() => {
    // Inicializa a Web App do Telegram
    if (isTelegram) {
        window.Telegram.WebApp.ready();
        window.Telegram.WebApp.expand();
    }
  }, [isTelegram]);

  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
}

export default App;