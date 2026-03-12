const jwt = require('jsonwebtoken');
const crypto = require('crypto');

/**
 * Generate access token (short lived)
 */
const generateAccessToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN || '15m' }
  );
};

/**
 * Generate refresh token (long lived random string)
 */
const generateRefreshToken = () => {
  return crypto.randomBytes(64).toString('hex');
};

/**
 * Get refresh token expiry
 * rememberMe = 30 days, else = 24 hours
 */
const getRefreshTokenExpiry = (rememberMe) => {
  const days = rememberMe ? 30 : 1;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  getRefreshTokenExpiry,
};