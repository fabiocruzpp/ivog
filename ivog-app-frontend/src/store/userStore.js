import { create } from 'zustand';
import api from '../services/api';
import { useFeedbackStore } from './feedbackStore';

const ADMIN_TELEGRAM_ID = '1318210843';

export const useUserStore = create((set, get) => ({
  user: null, // Dados básicos do Telegram
  userProfile: null, // Dados completos do nosso banco (com cargo, canal, etc.)
  isAdmin: false,
  error: '',

  /**
   * Busca os dados do usuário do Telegram e da nossa API,
   * atualizando o estado global e tratando os redirecionamentos.
   * @param {function} navigate - A função de navegação do React Router.
   */
  fetchUser: async (navigate) => {
    useFeedbackStore.getState().showLoading();
    set({ error: '' });

    try {
      const telegramUser = window.Telegram.WebApp.initDataUnsafe?.user;

      if (!telegramUser || !telegramUser.id) {
        throw new Error('Não foi possível identificar seu usuário no Telegram.');
      }

      set({ 
        user: telegramUser,
        isAdmin: telegramUser.id.toString() === ADMIN_TELEGRAM_ID 
      });

      try {
        const response = await api.get(`/user/${telegramUser.id}`);
        
        // Armazena o perfil completo do nosso banco no estado global
        set({ userProfile: response.data });

        if (!response.data || !response.data.cargo) {
          navigate('/register');
        }
      } catch (apiError) {
        if (apiError.response && apiError.response.status === 404) {
          navigate('/register');
        } else {
          throw new Error('Não foi possível verificar seu cadastro. Tente novamente mais tarde.');
        }
      }
    } catch (err) {
      set({ error: err.message });
      useFeedbackStore.getState().addToast(err.message, 'error');
    } finally {
      useFeedbackStore.getState().hideLoading();
    }
  }
}));