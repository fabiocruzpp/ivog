import axios from 'axios';

// Cria uma instância do axios com a URL base da nossa API em produção
const api = axios.create({
  baseURL: 'https://ivog.ivogapi.xyz/api'
});

export default api;