// middleware/checkAuth.js
const jwt = require('jsonwebtoken');

const checkAuth = (req, res, next) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        req.userData = { 
            userId: decodedToken.userId, 
            username: decodedToken.username,
            name: decodedToken.name,
            role: decodedToken.role 
        };
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Autenticação falhou!' });
    }
};

const checkAdmin = (req, res, next) => {
    if (req.userData && req.userData.role === 'admin') {
        next();
    } else {
        return res.status(403).json({ message: 'Acesso negado! Permissão de administrador necessária.' });
    }
};

module.exports = { checkAuth, checkAdmin };