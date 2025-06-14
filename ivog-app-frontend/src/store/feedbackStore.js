import { create } from 'zustand';

// O store de feedback é agnóstico à lógica de negócio.
// Ele apenas controla o que é exibido na tela.
export const useFeedbackStore = create((set, get) => ({
  isLoading: false,
  toasts: [], // Array de objetos { id, message, type }

  // Ações para controlar o spinner global
  showLoading: () => set({ isLoading: true }),
  hideLoading: () => set({ isLoading: false }),

  // Ações para controlar as notificações (toasts)
  addToast: (message, type = 'success') => {
    const id = Date.now() + Math.random();
    set(state => ({
      toasts: [...state.toasts, { id, message, type }]
    }));

    // Remove a notificação após 5 segundos
    setTimeout(() => {
      get().removeToast(id);
    }, 5000);
  },

  removeToast: (id) => {
    set(state => ({
      toasts: state.toasts.filter(toast => toast.id !== id)
    }));
  },
}));