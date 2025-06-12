import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import styles from './ResultsPage.module.css';

function ResultsPage() {
  const location = useLocation();
  const { results } = location.state || {};

  if (!results) {
    return (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <p>Nenhum resultado para exibir.</p>
        <Link to="/">Voltar ao Menu</Link>
      </div>
    );
  }

  const percentualAcerto = results.total_perguntas > 0 ? (results.num_acertos / results.total_perguntas * 100).toFixed(2) : "0.00";
  const pontosBonus = results.pontuacao_final_com_bonus - results.pontuacao_base;

  return (
    <div className={styles.screenContainer}>
        <div className={styles.header}>
            <h2>Parabéns!</h2>
            <p>Você concluiu o simulado!</p>
        </div>
        <div className={styles.content}>
            <div className={styles.scoreSummary}>
                <p>Você acertou</p>
                <p><strong>{results.num_acertos} de {results.total_perguntas} ({percentualAcerto}%)</strong></p>
                <hr style={{ border: 0, borderTop: '1px solid #eee', margin: '15px 0' }} />
                <p>Sua pontuação: <strong>{results.pontuacao_base} Pts</strong></p>
                {pontosBonus > 0 && <p>Bônus por Desempenho: <strong>+{pontosBonus} Pts</strong></p>}
                <p className={styles.finalScore}>Total: <strong>{results.pontuacao_final_com_bonus} Pts</strong></p>
            </div>
            <Link to="/" className={styles.actionButton}>Voltar ao Menu</Link>
        </div>
    </div>
  );
}

export default ResultsPage;