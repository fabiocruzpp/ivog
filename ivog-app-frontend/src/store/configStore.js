import { create } from 'zustand';
import api from '../services/api';
import { useUserStore } from './userStore'; // 1. Importa o userStore para pegar o ID

export const useConfigStore = create((set) => ({
  configs: {},
  loading: true,

  fetchConfigs: async () => {
    try {
      set({ loading: true });
      const response = await api.get('/configs'); 
      set({ configs: response.data, loading: false });
    } catch (error) {
      console.error("Falha ao buscar configurações do app:", error);
      set({ loading: false });
    }
  },
  
  toggleConfig: async (key) => {
    try {
        // 2. Obtém o ID do usuário logado diretamente do userStore
        const telegramId = useUserStore.getState().user?.id;

        // 3. Envia o telegram_id no corpo da requisição POST
        const response = await api.post(`/admin/toggle_config/${key}`, {
             telegram_id: telegramId 
        });

        if (response.data.status === 'success') {
            set(state => ({
                configs: {
                    ...state.configs,
                    [key]: response.data.new_value,
                }
            }));
        }
    } catch (error) {
        console.error(`Falha ao alternar a configuração ${key}:`, error);
    }
  }
}));