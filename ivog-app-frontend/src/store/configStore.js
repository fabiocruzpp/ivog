import { create } from 'zustand';
import api from '../services/api';

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
        const response = await api.post(`/admin/toggle_config/${key}`);
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
  },

  setConfigValue: async (key, value) => {
    try {
        const response = await api.post(`/admin/set_config/${key}`, { value });
        if (response.data.status === 'success') {
            set(state => ({
                configs: {
                    ...state.configs,
                    [key]: value,
                }
            }));
        }
    } catch (error) {
        console.error(`Falha ao definir o valor da configuração ${key}:`, error);
        throw error;
    }
  }
}));