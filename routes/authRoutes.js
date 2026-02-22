const express = require('express');
const router = express.Router();
const validate = require('../middlewares/validate');

const {
  register,
  registerValidation,
  verifyOTP,
  verifyOtpValidation,
  resendOTP,
  resendOtpValidation,
} = require('../controllers/authController');

// POST /api/auth/register
router.post('/register', validate(registerValidation), register);

// POST /api/auth/verify-otp
router.post('/verify-otp', validate(verifyOtpValidation), verifyOTP);

// POST /api/auth/resend-otp
router.post('/resend-otp', validate(resendOtpValidation), resendOTP);

module.exports = router;