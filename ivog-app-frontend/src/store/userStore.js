import { create } from 'zustand';
import api from '../services/api';

export const useUserStore = create((set) => ({
    user: null,
    isAdmin: false,
    isAuthenticated: false,
    isNewUser: false,
    loading: true,

    // Ação para buscar o usuário ao iniciar o app (versão corrigida)
    fetchUser: async () => {
        set({ loading: true });
        try {
            const response = await api.get('/user/profile');
            const userData = response.data;

            // Se o usuário existir mas o perfil estiver incompleto, também direciona para o registro
            if (!userData.cargo || !userData.canal_principal) {
                set({
                    user: userData,
                    isAuthenticated: true,
                    isAdmin: !!userData.is_admin,
                    isNewUser: true,
                    loading: false,
                });
            } else {
                // Usuário encontrado e com perfil completo
                set({
                    user: userData,
                    isAuthenticated: true,
                    isAdmin: !!userData.is_admin,
                    isNewUser: false,
                    loading: false,
                });
            }
        } catch (error) {
            // Se o erro for 404, sabemos que é um novo usuário
            if (error.response && error.response.status === 404) {
                set({
                    user: null,
                    isAuthenticated: false,
                    isNewUser: true,
                    loading: false,
                });
            } else {
                // Para qualquer outro erro de API
                set({
                    user: null,
                    isAuthenticated: false,
                    isNewUser: false,
                    loading: false,
                });
            }
        }
    },

    // Ação para login de admin (via web)
    login: async (username, password) => {
        try {
            const response = await api.post('/auth/login', { username, password });
            const { token, user } = response.data;
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            localStorage.setItem('authToken', token);
            set({ user, isAdmin: true, isAuthenticated: true });
            return true;
        } catch (error) {
            console.error("Falha no login:", error);
            return false;
        }
    },

    // Ação de logout
    logout: () => {
        localStorage.removeItem('authToken');
        delete api.defaults.headers.common['Authorization'];
        set({ user: null, isAdmin: false, isAuthenticated: false });
    },

    // Ação para definir o usuário após uma atualização ou registro
    setUser: (userData) => {
        set({
            user: userData,
            isAuthenticated: true,
            isAdmin: !!userData.is_admin,
            isNewUser: false, 
        });
    },
}));