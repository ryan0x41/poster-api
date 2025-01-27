const jwt = require('jsonwebtoken');

function authenticateCookie(req, res, next) {
    // extract token from cookie
    const token = req.cookies.authToken;

    // i should do oneliners more often
    if (!token) { 
        const error = new Error('no authentication token provided')
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

module.exports = authenticateCookie;