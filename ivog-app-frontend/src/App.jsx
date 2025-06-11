import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Dashboard from './pages/Dashboard';
import QuizPage from './pages/QuizPage';
import RankingPage from './pages/RankingPage';
import StatsPage from './pages/StatsPage';
import ProfilePage from './pages/ProfilePage';
import ResultsPage from './pages/ResultsPage';
import AdminPage from './pages/AdminPage'; // NOVA LINHA

function App() {
  React.useEffect(() => {
    window.Telegram.WebApp.ready();
  }, []);

  return (
    <BrowserRouter>
      <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/quiz" element={<QuizPage />} />
          <Route path="/ranking" element={<RankingPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/quiz/results" element={<ResultsPage />} />
          <Route path="/admin" element={<AdminPage />} /> {/* NOVA ROTA */}
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;