const bcrypt = require('bcryptjs');

const hashValue = async (value) => {
  const salt = await bcrypt.genSalt(12);
  const hashed = await bcrypt.hash(value, salt);
  return hashed;
};

const validateHashedValue = async (value, hashed) => {
  const isValid = await bcrypt.compare(value, hashed);
  return isValid;
};

module.exports = { hashValue, validateHashedValue };
