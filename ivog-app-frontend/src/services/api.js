import axios from 'axios';

// Cria uma instância do axios com a URL base da nossa API em produção
const api = axios.create({
  baseURL: 'https://ivog.ivogapi.xyz/api'
});

// Adiciona um interceptor para incluir o token de autenticação em todas as requisições
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;