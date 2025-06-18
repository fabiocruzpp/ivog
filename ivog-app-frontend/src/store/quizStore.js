import { create } from 'zustand';
import api from '../services/api';
import { useFeedbackStore } from './feedbackStore';

const initialState = {
  quizData: null,
  currentQuestionIndex: 0,
  score: 0,
  selectedAnswer: null,
  loading: true, 
  error: '',
  simuladoId: null, // O ID do simulado começa como nulo
  isTraining: false,
  desafioContext: null,
};

export const useQuizStore = create((set, get) => ({
  ...initialState,

  startQuiz: async (params, navigate) => {
    useFeedbackStore.getState().showLoading();
    set({ 
        ...initialState, 
        loading: true, 
        isTraining: params.is_training === 'true', 
        desafioContext: params.desafio_id ? `desafio_id:${params.desafio_id}` : null
    }); 
    
    try {
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
      // Pega o ID do simulado e o contexto do estado atual
      const { simuladoId, isTraining, desafioContext } = get();

      const payload = {
        simulado_id: simuladoId, // Será nulo na primeira chamada
        telegram_id: window.Telegram.WebApp.initDataUnsafe.user.id,
        pergunta: currentQuestion.pergunta_formatada_display,
        resposta_usuario: selectedOption,
        resposta_correta: currentQuestion.correta,
        acertou: correct,
        tema: currentQuestion.tema,
        subtema: currentQuestion.subtema,
        // Envia o contexto para o backend criar o simulado, se necessário
        is_training: isTraining,
        contexto_desafio: desafioContext,
      };
      
      const response = await api.post('/quiz/answer', payload);
      
      // Se o backend criou um novo ID de simulado, o armazena no estado
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
      // Pega o ID do simulado do estado da store
      const { simuladoId, score, quizData } = get();

      // Verifica se um simuladoId foi criado (se pelo menos uma resposta foi dada)
      if (!simuladoId && !get().isTraining) {
          console.warn("Nenhuma resposta dada, não há o que finalizar.");
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
        telegram_id: window.Telegram.WebApp.initDataUnsafe.user.id,
        simulado_id: simuladoId,
        num_acertos: score,
        total_perguntas: quizData.questions.length
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