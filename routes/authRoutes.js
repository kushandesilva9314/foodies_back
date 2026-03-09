const express = require('express');
const router = express.Router();
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const validate = require('../middlewares/validate');

const upload = multer();

const {
  register,
  registerValidation,
  verifyOTP,
  verifyOtpValidation,
  resendOTP,
  resendOtpValidation,
  login,
  loginValidation,
  forgotPassword,
  forgotPasswordValidation,
  verifyResetOTP,
  verifyResetOtpValidation,
  resetPassword,
  resetPasswordValidation,
  resendResetOTP,
} = require('../controllers/authController');

// ─── Rate Limiters ────────────────────────────────────────────────────────────

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                   // max 10 login attempts per 15 min
  message: {
    success: false,
    message: 'Too many login attempts. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,                    // max 5 forgot password requests per hour
  message: {
    success: false,
    message: 'Too many password reset requests. Please try again after 1 hour.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Auth Routes ──────────────────────────────────────────────────────────────

// Registration
router.post('/register', upload.none(), validate(registerValidation), register);
router.post('/verify-otp', validate(verifyOtpValidation), verifyOTP);
router.post('/resend-otp', validate(resendOtpValidation), resendOTP);

// Login
router.post('/login', loginLimiter, validate(loginValidation), login);

// Forgot Password
router.post('/forgot-password', forgotPasswordLimiter, validate(forgotPasswordValidation), forgotPassword);
router.post('/verify-reset-otp', validate(verifyResetOtpValidation), verifyResetOTP);
router.post('/reset-password', validate(resetPasswordValidation), resetPassword);
router.post('/resend-reset-otp', validate(resendOtpValidation), resendResetOTP);

module.exports = router;