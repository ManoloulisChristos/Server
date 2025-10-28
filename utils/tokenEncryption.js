const crypto = require('crypto');

const generateToken = () => {
  const token = crypto.randomBytes(64).toString('hex');
  return token;
};

const hashToken = (token) => {
  const hash = crypto.createHash('sha256').update(token, 'hex').digest('hex');
  return hash;
};

const encryptToken = (token) => {
  const iv = crypto.randomBytes(16);
  const secret = Buffer.from(process.env.DB_TOKEN_SECRET, 'hex');

  const cipher = crypto.createCipheriv('aes-256-gcm', secret, iv);

  let encrypted = cipher.update(token, 'hex', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return {
    encryptedToken: encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
  };
};

const decryptToken = (dataObj) => {
  const iv = Buffer.from(dataObj.iv, 'hex');
  const secret = Buffer.from(process.env.DB_TOKEN_SECRET, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', secret, iv);

  decipher.setAuthTag(Buffer.from(dataObj.authTag, 'hex'));

  let deciphered = decipher.update(dataObj.encryptedToken, 'hex', 'hex');
  deciphered += decipher.final('hex');

  return deciphered;
};

module.exports = {
  generateToken,
  hashToken,
  encryptToken,
  decryptToken,
};
