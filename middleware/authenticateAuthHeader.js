const jwt = require('jsonwebtoken');

function decodeToken(req, res, next) {
  let token = req.headers.authorization;
  if (token && token.startsWith("Bearer ")) {
    token = token.slice(7).trim();
  }
  if (!token) {
    req.token = null;
    return next();
  }

  req.token = token;
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return next(new Error('Invalid token'));
    }
    req.user = decoded;
    next();
  });
}

function authenticateAuthHeader(req, res, next) {
  if (!req.token || !req.user) {
    const error = new Error('No authentication header provided or token is invalid');
    error.status = 401;
    return next(error);
  }
  next();
}

function verifyToken(token) {
  return new Promise((resolve, reject) => {
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return reject(err);
      }
      resolve(decoded);
    });
  });
}

module.exports = { decodeToken, authenticateAuthHeader, verifyToken };