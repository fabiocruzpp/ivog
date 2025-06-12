import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import styles from './QuizPage.module.css';

const BackArrowIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"></path></svg>
);

const PointsIcon = () => (
    <svg width="16" height="16" viewBox="0 0 54 53" fill="var(--primary-dark-purple)"><path d="M49.488,23.382 C47.014,26.008 43.979,27.535 40.382,27.963 C39.646,30.573 38.248,32.740 36.188,34.465 C34.127,36.190 31.744,37.248 29.038,37.639 L29.038,48.324 L37.791,48.324 C38.454,48.324 39.009,48.548 39.457,48.996 C39.905,49.444 40.130,49.1000 40.130,50.663 C40.130,51.326 39.905,51.881 39.457,52.328 C39.009,52.776 38.454,52.1000 37.791,52.1000 L15.608,52.1000 C14.946,52.1000 14.390,52.776 13.942,52.327 C13.494,51.879 13.270,51.323 13.270,50.661 C13.270,49.998 13.494,49.443 13.942,48.995 C14.390,48.547 14.946,48.324 15.608,48.324 L24.362,48.324 L24.362,37.639 C21.656,37.248 19.272,36.190 17.212,34.465 C15.151,32.740 13.754,30.573 13.018,27.963 C9.421,27.535 6.385,26.008 3.911,23.382 C1.437,20.756 0.200,17.639 0.200,14.029 L0.200,11.871 C0.200,10.321 0.752,8.994 1.855,7.891 C2.959,6.787 4.286,6.235 5.836,6.235 L12.131,6.235 L12.131,5.636 C12.131,4.086 12.683,2.759 13.786,1.655 C14.890,0.552 16.217,-0.000 17.767,-0.000 L35.633,-0.000 C37.183,-0.000 38.510,0.552 39.613,1.655 C40.717,2.759 41.269,4.086 41.269,5.636 L41.269,6.235 L47.564,6.235 C49.114,6.235 50.441,6.787 51.544,7.891 C52.648,8.994 53.200,10.321 53.200,11.871 L53.200,14.029 C53.200,17.639 51.963,20.756 49.488,23.382 ZM12.131,10.912 L5.836,10.912 C5.556,10.912 5.326,11.002 5.146,11.181 C4.966,11.361 4.876,11.591 4.876,11.871 L4.876,14.029 C4.876,16.184 5.558,18.088 6.921,19.743 C8.284,21.398 10.020,22.463 12.131,22.939 L12.131,10.912 ZM36.532,5.636 C36.532,5.356 36.443,5.126 36.262,4.946 C36.083,4.766 35.853,4.676 35.573,4.676 L17.827,4.676 C17.546,4.676 17.317,4.766 17.137,4.946 C16.957,5.126 16.867,5.356 16.867,5.636 L16.867,23.322 C16.867,26.054 17.824,28.375 19.737,30.287 C21.650,32.199 23.974,33.155 26.707,33.155 C29.440,33.155 31.761,32.199 33.670,30.287 C35.578,28.375 36.532,26.054 36.532,23.322 L36.532,5.636 ZM48.523,11.871 C48.523,11.591 48.433,11.361 48.253,11.181 C48.074,11.002 47.844,10.912 47.564,10.912 L41.269,10.912 L41.269,22.939 C43.379,22.463 45.116,21.398 46.479,19.743 C47.842,18.088 48.523,16.184 48.523,14.029 L48.523,11.871 Z"></path></svg>
);

function QuizPage() {
  const [quizData, setQuizData] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // Lê o ID do desafio da URL
    const desafioId = searchParams.get('desafio_id');

    const startQuiz = async (telegramId) => {
      try {
        setLoading(true);
        setError(''); // Limpa erros anteriores
        
        const userProfileResponse = await api.get(`/user/${telegramId}`);
        const { cargo, canal_principal } = userProfileResponse.data;

        if (!cargo || !canal_principal) throw new Error("Perfil incompleto. Por favor, atualize seus dados.");

        const params = {
          telegram_id: telegramId,
          cargo,
          canal_principal,
        };
        // Se um ID de desafio existir, o envia para a API
        if (desafioId) {
          params.desafio_id = desafioId;
        }

        const quizResponse = await api.get('/quiz/start', { params });
        setQuizData(quizResponse.data);

      } catch (err) {
        setError(err.response?.data?.message || err.message || 'Não foi possível iniciar o quiz.');
      } finally {
        setLoading(false);
      }
    };

    const user = window.Telegram.WebApp.initDataUnsafe?.user;
    if (user && user.id) {
      startQuiz(user.id);
    } else {
      setError('ID do Telegram não encontrado.');
      setLoading(false);
    }
  }, [searchParams]); // Roda o efeito sempre que os parâmetros da URL mudam

  const handleAnswer = async (selectedOption) => {
    if (selectedAnswer) return;
    setSelectedAnswer(selectedOption);
    const currentQuestion = quizData.questions[currentQuestionIndex];
    const correct = selectedOption === currentQuestion.correta;
    if (correct) setScore(prevScore => prevScore + 1);
    try {
      await api.post('/quiz/answer', {
        simulado_id: quizData.simulado_id,
        telegram_id: window.Telegram.WebApp.initDataUnsafe.user.id,
        pergunta: currentQuestion.pergunta_formatada_display,
        resposta_usuario: selectedOption,
        resposta_correta: currentQuestion.correta,
        acertou: correct,
        tema: currentQuestion.tema,
        subtema: currentQuestion.subtema,
      });
    } catch (error) {
      console.error("Erro ao salvar resposta:", error);
    }
    setTimeout(goToNextQuestion, 1500);
  };

  const goToNextQuestion = () => {
    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex < quizData.questions.length) {
      setCurrentQuestionIndex(nextIndex);
      setSelectedAnswer(null);
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = async () => {
    setLoading(true);
    try {
      const response = await api.post('/quiz/finish', {
        telegram_id: window.Telegram.WebApp.initDataUnsafe.user.id,
        simulado_id: quizData.simulado_id,
        num_acertos: score,
        total_perguntas: quizData.questions.length
      });
      navigate('/quiz/results', { state: { results: response.data } });
    } catch (err) {
      setError("Erro ao finalizar o quiz.");
      setLoading(false);
    }
  };

  const getButtonClassName = (option) => {
    if (!selectedAnswer) return styles.answerOption;
    const isCorrectAnswer = option === quizData.questions[currentQuestionIndex].correta;
    if (isCorrectAnswer) return `${styles.answerOption} ${styles.correct}`;
    if (option === selectedAnswer) return `${styles.answerOption} ${styles.incorrect}`;
    return styles.answerOption;
  };

  if (loading) return <p style={{ textAlign: 'center' }}>Preparando seu quiz...</p>;
  if (error) return (
    <div style={{ textAlign: 'center' }}>
      <p style={{ color: 'red' }}>{error}</p>
      <Link to="/">Voltar</Link>
    </div>
  );
  if (!quizData || quizData.questions.length === 0) return (
    <div style={{ textAlign: 'center' }}>
      <p>Nenhuma pergunta disponível.</p>
      <Link to="/">Voltar</Link>
    </div>
  );

  const currentQuestion = quizData.questions[currentQuestionIndex];
  return (
    <div className={styles.screenContainer}>
        <div className={styles.headerBar}>
            <Link to="/" className={styles.headerIconBtn}><BackArrowIcon /></Link>
            <h1 className={styles.screenTitle}>Simulado</h1>
        </div>
        <div className={styles.infoBar}>
            <div className={styles.questionCounter}>Q {currentQuestionIndex + 1}/{quizData.total_perguntas_no_simulado}</div>
            <div className={styles.topicDisplay}>
                <span className={styles.topicTheme}>{currentQuestion.tema}</span>
                <span className={styles.topicSubtheme}>{currentQuestion.subtema}</span>
            </div>
            <div className={styles.pointsCounter}><PointsIcon /><span>{score * 10}</span> Pts</div>
        </div>
        <div className={styles.contentArea}>
            <p className={styles.questionText}>{currentQuestion.pergunta_formatada_display}</p>
            <div className={styles.optionsContainer}>
                {currentQuestion.alternativas.map((alternativa) => (
                    <button key={alternativa} className={getButtonClassName(alternativa)}
                        onClick={() => handleAnswer(alternativa)} disabled={!!selectedAnswer}>
                        {alternativa}
                    </button>
                ))}
            </div>
        </div>
    </div>
  );
}

export default QuizPage;