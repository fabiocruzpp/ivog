const BI_API_KEY = 'NorteCampeao2025';

export const requireApiKey = (req, res, next) => {
  const userApiKey = req.headers['x-api-key'];
  if (userApiKey && userApiKey === BI_API_KEY) {
    next();
  } else {
    res.status(401).json({ error: "Acesso não autorizado. Chave de API inválida ou ausente." });
  }
};
