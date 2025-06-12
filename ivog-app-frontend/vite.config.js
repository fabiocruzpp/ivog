import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Continua aqui para ouvir na rede
    // --- ADICIONE ESTA NOVA PROPRIEDADE ---
    allowedHosts: [
      // Adicione aqui o domínio que você usa para o desenvolvimento
      'frontivog.ivogapi.xyz'
    ]
  }
})