const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const validate = require('../middlewares/validate');
const { protect } = require('../middlewares/authMiddleware');

const upload = require('../middlewares/upload');

const {
  register,
  registerValidation,
  verifyOTP,
  verifyOtpValidation,
  resendOTP,
  resendOtpValidation,
  login,
  loginValidation,
  refreshAccessToken,
  logout,
  logoutAllDevices,
  forgotPassword,
  forgotPasswordValidation,
  verifyResetOTP,
  verifyResetOtpValidation,
  resetPassword,
  resetPasswordValidation,
  resendResetOTP,
  getMe,
 updateProfile,
  updateProfileValidation,
  changePassword,
  changePasswordValidation,
  verifyMobileOtp,
} = require('../controllers/authController');

// Rate Limiters
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: 'Too many password reset requests. Please try again after 1 hour.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: 'Too many registration attempts. Please try again after 1 hour.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: 'Too many OTP requests. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30, // generous — auto-refresh fires roughly every 15 min per active tab
  message: {
    success: false,
    message: 'Too many refresh attempts. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Registration
router.post('/register', registerLimiter, upload.none(), validate(registerValidation), register);
router.post('/verify-otp', otpLimiter, validate(verifyOtpValidation), verifyOTP);
router.post('/resend-otp', otpLimiter, validate(resendOtpValidation), resendOTP);

// Login
router.post('/login', loginLimiter, validate(loginValidation), login);

// Token management
router.post('/refresh', refreshLimiter, refreshAccessToken);
router.post('/logout', logout);

// Protected
router.get('/me', protect, getMe);

// Mobile verification (Firebase phone auth)
router.post('/verify-mobile-otp', protect, verifyMobileOtp);

// Profile (Account Settings)
router.put('/profile', protect, upload.single('profile_photo'), validate(updateProfileValidation), updateProfile);

// Change password (logged-in user, requires current password)
router.put('/change-password', protect, validate(changePasswordValidation), changePassword);

// Sign out from ALL devices (current device included — deletes every refresh token)
router.post('/logout-all', protect, logoutAllDevices);

// Forgot Password
router.post('/forgot-password', forgotPasswordLimiter, validate(forgotPasswordValidation), forgotPassword);
router.post('/verify-reset-otp', otpLimiter, validate(verifyResetOtpValidation), verifyResetOTP);
router.post('/reset-password', otpLimiter, validate(resetPasswordValidation), resetPassword);
router.post('/resend-reset-otp', otpLimiter, validate(resendOtpValidation), resendResetOTP);

module.exports = router;