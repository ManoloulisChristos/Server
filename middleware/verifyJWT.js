const jwt = require('jsonwebtoken');
const { UnauthorizedError } = require('../errors');

const verifyJWT = async (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    throw new UnauthorizedError(undefined, 'Token is missing');
  }

  const accessToken = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(accessToken, process.env.PUB_ACCESS_KEY, {
      algorithms: ['ES256'],
    });
    req.userId = payload.sub;
    next();
  } catch (err) {
    throw new UnauthorizedError(err.name, err.message);
  }
};

module.exports = verifyJWT;
