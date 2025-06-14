import { create } from 'zustand';
import api from '../services/api';
import { useFeedbackStore } from './feedbackStore';
import { useUserStore } from './userStore';

const initialState = {
  quizData: null,
  currentQuestionIndex: 0,
  score: 0,
  selectedAnswer: null,
  loading: true, 
  error: '',
};

export const useQuizStore = create((set, get) => ({
  ...initialState,

  startQuiz: async (searchParams, navigate) => {
    useFeedbackStore.getState().showLoading();
    set({ ...initialState, loading: true }); 
    
    try {
      const { userProfile } = useUserStore.getState();
      if (!userProfile || !userProfile.telegram_id) {
        throw new Error('Perfil do usuário não carregado. Tente novamente.');
      }
      
      const params = { 
        telegram_id: userProfile.telegram_id,
        cargo: userProfile.cargo,
        canal_principal: userProfile.canal_principal,
        desafio_id: searchParams.get('desafio_id'),
        is_training: searchParams.get('is_training'),
        temas: searchParams.get('temas'),
      };

      const response = await api.get('/quiz/start', { params });
      
      if (!response.data || response.data.questions.length === 0) {
        throw new Error('Nenhuma pergunta disponível para este quiz.');
      }

      set({ quizData: response.data, loading: false });

    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Não foi possível iniciar o quiz.';
      set({ error: errorMessage, loading: false });
    } finally {
      useFeedbackStore.getState().hideLoading();
    }
  },

  handleAnswer: async (selectedOption, navigate) => {
    if (get().selectedAnswer) return;

    set({ selectedAnswer: selectedOption });
    const currentQuestion = get().quizData.questions[get().currentQuestionIndex];
    const correct = selectedOption === currentQuestion.correta;

    if (correct) {
      set(state => ({ score: state.score + 1 }));
    }

    try {
      await api.post('/quiz/answer', {
        simulado_id: get().quizData.simulado_id,
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

    setTimeout(() => {
      get().goToNextQuestion(navigate);
    }, 1500);
  },

  goToNextQuestion: (navigate) => {
    const nextIndex = get().currentQuestionIndex + 1;
    if (nextIndex < get().quizData.questions.length) {
      set({ currentQuestionIndex: nextIndex, selectedAnswer: null });
    } else {
      get().finishQuiz(navigate);
    }
  },

  finishQuiz: async (navigate) => {
    useFeedbackStore.getState().showLoading();
    set({ loading: true });
    try {
      const response = await api.post('/quiz/finish', {
        telegram_id: window.Telegram.WebApp.initDataUnsafe.user.id,
        simulado_id: get().quizData.simulado_id,
        num_acertos: get().score,
        total_perguntas: get().quizData.questions.length
      });
      navigate('/quiz/results', { state: { results: response.data } });
    } catch (err) {
      set({ error: "Erro ao finalizar o quiz.", loading: false });
      useFeedbackStore.getState().addToast('Erro ao finalizar o quiz.', 'error');
    } finally {
      useFeedbackStore.getState().hideLoading();
    }
  },

  resetQuiz: () => {
    set(initialState);
  },
}));