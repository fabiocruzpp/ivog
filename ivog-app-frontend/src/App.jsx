import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Dashboard from './pages/Dashboard';
import QuizPage from './pages/QuizPage';
import RankingPage from './pages/RankingPage';
import StatsPage from './pages/StatsPage';
import ProfilePage from './pages/ProfilePage';
import ResultsPage from './pages/ResultsPage';
import AdminPage from './pages/AdminPage';
import ChallengesPage from './pages/ChallengesPage.jsx'; // CORREÇÃO: Adicionada a extensão .jsx

function App() {
  React.useEffect(() => {
    window.Telegram.WebApp.ready();
  }, []);

  return (
    <BrowserRouter>
      {/* O div com padding foi removido daqui para não interferir no layout das páginas */}
      <Routes>
        <Route path="/" element={<Dashboard />} />
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