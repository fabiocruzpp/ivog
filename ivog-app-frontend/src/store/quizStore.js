import { create } from 'zustand';
import api from '../services/api';
import { useFeedbackStore } from './feedbackStore';
import { useUserStore } from './userStore'; // 1. Importa o store do usuário

const initialState = {
  quizData: null,
  currentQuestionIndex: 0,
  score: 0,
  selectedAnswer: null,
  loading: true, 
  error: '',
  simuladoId: null,
  isTraining: false,
  desafioContext: null,
  isChallengeActive: false,
  challengeTitle: null,
};

export const useQuizStore = create((set, get) => ({
  ...initialState,

  startQuiz: async (params, navigate) => {
    useFeedbackStore.getState().showLoading();
    const isChallenge = !!params.desafio_id;
    
    set({ 
        ...initialState, 
        loading: true, 
        isTraining: params.is_training === 'true', 
        desafioContext: params.desafio_id ? `desafio_id:${params.desafio_id}` : null,
        isChallengeActive: isChallenge,
        challengeTitle: params.desafio_titulo || null,
    }); 
    
    try {
      // 2. Pega os dados do usuário logado
      const { user } = useUserStore.getState();
      if (!user) {
        throw new Error('Usuário não encontrado. Não é possível iniciar o quiz.');
      }

      // 3. Combina os parâmetros da chamada com os dados do usuário
      const requestParams = {
        ...params,
        telegram_id: user.telegram_id,
        cargo: user.cargo,
        canal_principal: user.canal_principal,
      };
      
      const response = await api.get('/quiz/start', { params: requestParams });
      
      if (!response.data || response.data.questions.length === 0) {
        throw new Error('Nenhuma pergunta disponível para este quiz.');
      }

      set({ quizData: response.data, loading: false });

    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Não foi possível iniciar o quiz.';
      set({ error: errorMessage, loading: false, isChallengeActive: false, challengeTitle: null });
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
      const { simuladoId, isTraining, desafioContext } = get();
      const { user } = useUserStore.getState();

      const payload = {
        simulado_id: simuladoId,
        telegram_id: user.telegram_id,
        pergunta: currentQuestion.pergunta_formatada_display,
        resposta_usuario: selectedOption,
        resposta_correta: currentQuestion.correta,
        acertou: correct,
        tema: currentQuestion.tema,
        subtema: currentQuestion.subtema,
        is_training: isTraining,
        contexto_desafio: desafioContext,
      };
      
      const response = await api.post('/quiz/answer', payload);
      
      if (response.data.newSimuladoId) {
        set({ simuladoId: response.data.newSimuladoId });
      }
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
      const { simuladoId, score, quizData } = get();
      const { user } = useUserStore.getState();

      if (!simuladoId && !get().isTraining) {
          console.warn("Nenhuma resposta dada, não há o que finalizar.");
          set({ isChallengeActive: false, challengeTitle: null });
          navigate('/quiz/results', { state: { results: {
              is_training: false,
              pontuacao_base: 0, 
              pontuacao_final_com_bonus: 0, 
              num_acertos: 0, 
              total_perguntas: quizData.questions.length
          }}});
          return;
      }

      const response = await api.post('/quiz/finish', {
        telegram_id: user.telegram_id,
        simulado_id: simuladoId,
        num_acertos: score,
        total_perguntas: quizData.questions.length
      });
      navigate('/quiz/results', { state: { results: response.data } });
    } catch (err) {
      set({ error: "Erro ao finalizar o quiz.", loading: false });
      useFeedbackStore.getState().addToast('Erro ao finalizar o quiz.', 'error');
    } finally {
      set({ loading: false, isChallengeActive: false, challengeTitle: null });
      useFeedbackStore.getState().hideLoading();
    }
  },

  resetQuiz: () => {
    set(initialState);
  },
}));