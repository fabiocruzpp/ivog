// ivog-app-frontend/src/App.jsx

import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Dashboard from './pages/Dashboard';
import QuizPage from './pages/QuizPage';
import RankingPage from './pages/RankingPage';
import StatsPage from './pages/StatsPage';
import ProfilePage from './pages/ProfilePage';
import ResultsPage from './pages/ResultsPage';
import AdminPage from './pages/AdminPage';
import ChallengesPage from './pages/ChallengesPage.jsx';
import RegisterPage from './pages/RegisterPage'; // Importa a nova página

function App() {
  React.useEffect(() => {
    // Inicializa a Web App do Telegram
    if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.ready();
        // Expande a tela para ocupar o espaço todo
        window.Telegram.WebApp.expand();
    }
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* A rota principal agora tem a lógica de verificação */}
        <Route path="/" element={<Dashboard />} />
        
        {/* Nova rota para a página de cadastro */}
        <Route path="/register" element={<RegisterPage />} />

        {/* Rotas existentes */}
        <Route path="/quiz" element={<QuizPage />} />
        <Route path="/ranking" element={<RankingPage />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/quiz/results" element={<ResultsPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/challenges" element={<ChallengesPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;