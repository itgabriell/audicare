
const authMiddleware = (req, res, next) => {
    const apiKey = req.headers['x-api-key'] || req.query.api_key;
    const internalKey = process.env.INTERNAL_API_KEY;

    if (!internalKey) {
        console.error('❌ INTERNAL_API_KEY não configurada no ambiente.');
        return res.status(500).json({ error: 'Erro de configuração do servidor' });
    }

    if (!apiKey || apiKey !== internalKey) {
        console.warn(`🔒 Tentativa de acesso não autorizado: ${req.ip}`);
        return res.status(401).json({ error: 'Acesso não autorizado' });
    }

    next();
};

module.exports = authMiddleware;
