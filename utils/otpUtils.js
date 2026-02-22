const crypto = require('crypto');

/**
 * Generate a 6-digit numeric OTP
 */
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

/**
 * Get OTP expiry time (10 minutes from now)
 */
const getOTPExpiry = () => {
  return new Date(Date.now() + 10 * 60 * 1000);
};

module.exports = { generateOTP, getOTPExpiry };