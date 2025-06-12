// ivog-app-backend/ecosystem.config.cjs

module.exports = {
  apps : [{
    name   : "ivog-backend",
    script : "./src/index.js",
    // --- ADICIONE ESTA LINHA ---
    cwd    : "/home/fabiocruzpp/ivog/ivog-app-backend/", // Define o diretório de trabalho correto
    watch  : false,
    env    : {
      "NODE_ENV": "production",
    }
  }]
}