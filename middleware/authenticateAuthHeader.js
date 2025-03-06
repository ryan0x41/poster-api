const jwt = require('jsonwebtoken');

function authenticateAuthHeader(req, res, next) {
    let token = req.headers.authorization;
    if (token && token.startsWith("Bearer ")) {
        token = token.slice(7).trim();
    }
    // i should do oneliners more often
    if (!token) {
        const error = new Error('no authentication header provided')
        error.status = 401;
        return next(error);
    }

    // verify token
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            const error = new Error('invalid token');
            return next(error);
        }
        req.user = user;
        // valid token pass to next middleware
        next();
    });
}

module.exports = authenticateAuthHeader;