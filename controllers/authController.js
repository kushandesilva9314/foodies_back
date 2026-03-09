const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const UserModel = require('../models/userModel');
const OTPModel = require('../models/otpModel');
const { sendOTPEmail } = require('../services/otpEmailService');
const { generateOTP, getOTPExpiry } = require('../utils/otpUtils');
const { sendPasswordResetEmail } = require('../services/passwordResetEmailService')
const PasswordResetModel = require('../models/passwordResetModel');

// ─── Validation Rules ─────────────────────────────────────────────────────────

const registerValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Full name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Name must be 2–50 characters')
    .matches(/^[a-zA-Z\s]+$/).withMessage('Name can only contain letters and spaces'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email address')
    .normalizeEmail(),

  body('mobile')
  .trim()
  .notEmpty().withMessage('Mobile number is required')
  .matches(/^[0-9]{10}$/).withMessage('Mobile must be exactly 10 digits')
  .matches(/^[0789]/).withMessage('Mobile must start with 0, 7, 8, or 9'),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8, max: 128 }).withMessage('Password must be 8–128 characters')
    .matches(/(?=.*[a-z])/).withMessage('Password must contain a lowercase letter')
    .matches(/(?=.*[A-Z])/).withMessage('Password must contain an uppercase letter')
    .matches(/(?=.*\d)/).withMessage('Password must contain a number')
    .matches(/(?=.*[@$!%*?&])/).withMessage('Password must contain a special character (@$!%*?&)'),
];

const verifyOtpValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email address')
    .normalizeEmail(),

  body('otp')
    .trim()
    .notEmpty().withMessage('OTP is required')
    .matches(/^\d{6}$/).withMessage('OTP must be a 6-digit number'),
];

const resendOtpValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email address')
    .normalizeEmail(),
];

const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
];

const forgotPasswordValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email address')
    .normalizeEmail(),
];

const verifyResetOtpValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email address')
    .normalizeEmail(),

  body('otp')
    .trim()
    .notEmpty().withMessage('OTP is required')
    .matches(/^\d{6}$/).withMessage('OTP must be a 6-digit number'),
];

const resetPasswordValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email address')
    .normalizeEmail(),

  body('otp')
    .trim()
    .notEmpty().withMessage('OTP is required')
    .matches(/^\d{6}$/).withMessage('OTP must be a 6-digit number'),

  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 8, max: 128 }).withMessage('Password must be 8–128 characters')
    .matches(/(?=.*[a-z])/).withMessage('Password must contain a lowercase letter')
    .matches(/(?=.*[A-Z])/).withMessage('Password must contain an uppercase letter')
    .matches(/(?=.*\d)/).withMessage('Password must contain a number')
    .matches(/(?=.*[@$!%*?&])/).withMessage('Password must contain a special character (@$!%*?&)'),
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, mobile } = req.body;

    // 1. Check if email already registered
    const existingUser = await UserModel.findByEmail(email);

    if (existingUser) {
      if (existingUser.is_verified) {
        return res.status(409).json({
          success: false,
          message: 'An account with this email already exists',
        });
      }
      // Unverified — delete to allow re-registration
      await UserModel.deleteByEmail(email);
    }

    // 2. Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // 3. Create unverified user with all fields
    const newUser = await UserModel.create({
      name: name.trim(),
      email,
      password: hashedPassword,
      mobile: mobile.replace(/\s/g, ''),
    });

    // 4. Clean up old OTPs
    await OTPModel.deleteByEmail(email);

    // 5. Generate and store OTP
    const otp = generateOTP();
    const expires_at = getOTPExpiry();

    await OTPModel.create({ email, otp, expires_at });

    // 6. Send OTP email
    await sendOTPEmail(email, name.trim(), otp);

    return res.status(201).json({
      success: true,
      message: `Verification code sent to ${email}`,
      data: {
        email: newUser.email,
        name: newUser.name,
      },
    });

  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/verify-otp
 */
const verifyOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    // 1. Find latest unused OTP
    const otpRecord = await OTPModel.findLatestByEmail(email);

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'No active OTP found. Please request a new one.',
      });
    }

    // 2. Check max attempts
    if (otpRecord.attempts >= 5) {
      await OTPModel.deleteByEmail(email);
      return res.status(429).json({
        success: false,
        message: 'Too many incorrect attempts. Please request a new OTP.',
      });
    }

    // 3. Check expiry
    if (new Date() > new Date(otpRecord.expires_at)) {
      await OTPModel.deleteByEmail(email);
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new one.',
      });
    }

    // 4. Verify OTP value
    if (otpRecord.otp !== otp) {
      await OTPModel.incrementAttempts(otpRecord.id, otpRecord.attempts);
      const remainingAttempts = 4 - otpRecord.attempts;
      return res.status(400).json({
        success: false,
        message: `Invalid OTP. ${remainingAttempts} attempt(s) remaining.`,
      });
    }

    // 5. Mark OTP as used
    await OTPModel.markAsUsed(otpRecord.id);

    // 6. Mark user as verified
    const verifiedUser = await UserModel.markAsVerified(email);

    // 7. Clean up all OTPs
    await OTPModel.deleteByEmail(email);

    // 8. Generate JWT
    const token = generateToken(verifiedUser.id);

    return res.status(200).json({
      success: true,
      message: 'Account verified successfully! Welcome to Foodies.',
      data: {
        token,
        user: {
          id: verifiedUser.id,
          name: verifiedUser.name,
          email: verifiedUser.email,
          mobile: verifiedUser.mobile,
          profile_photo: verifiedUser.profile_photo,  // null at registration
          role: verifiedUser.role,                     // 'customer' by default
        },
      },
    });

  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/resend-otp
 */
const resendOTP = async (req, res, next) => {
  try {
    const { email } = req.body;

    // 1. Confirm unverified user exists
    const user = await UserModel.findByEmail(email);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No registration found for this email.',
      });
    }

    if (user.is_verified) {
      return res.status(400).json({
        success: false,
        message: 'This account is already verified.',
      });
    }

    // 2. Rate limit check
    const recentOtp = await OTPModel.findLatestByEmail(email);

    if (recentOtp) {
      const secondsSinceSent = (Date.now() - new Date(recentOtp.created_at).getTime()) / 1000;
      if (secondsSinceSent < 60) {
        const waitSeconds = Math.ceil(60 - secondsSinceSent);
        return res.status(429).json({
          success: false,
          message: `Please wait ${waitSeconds} seconds before requesting a new OTP.`,
        });
      }
    }

    // 3. Clean up old OTPs
    await OTPModel.deleteByEmail(email);

    // 4. Generate and store new OTP
    const otp = generateOTP();
    const expires_at = getOTPExpiry();

    await OTPModel.create({ email, otp, expires_at });

    // 5. Send email
    await sendOTPEmail(email, user.name, otp);

    return res.status(200).json({
      success: true,
      message: `A new verification code has been sent to ${email}`,
    });

  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // 1. Find user by email
    const user = await UserModel.findByEmail(email);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // 2. Check if account is verified
    if (!user.is_verified) {
      return res.status(403).json({
        success: false,
        message: 'Account not verified. Please verify your email first.',
      });
    }

    // 3. Compare password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    // 4. Generate JWT
    const token = generateToken(user.id);

    // 5. Return token + user + redirect based on role
    return res.status(200).json({
      success: true,
      message: 'Login successful! Welcome back.',
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          mobile: user.mobile,
          profile_photo: user.profile_photo,
          role: user.role,
        },
        redirectTo: user.role === 'admin' ? '/admin' : '/',
      },
    });

  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/forgot-password
 * Step 1: Send OTP to email
 */
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    // 1. Check user exists and is verified
    const user = await UserModel.findByEmail(email);

    // Always return same message to prevent email enumeration
    if (!user || !user.is_verified) {
      return res.status(200).json({
        success: true,
        message: 'If this email is registered, you will receive a reset code shortly.',
      });
    }

    // 2. Rate limit — check if OTP sent less than 60 seconds ago
    const recentOtp = await PasswordResetModel.findLatestByEmail(email);

    if (recentOtp) {
      const secondsSinceSent = (Date.now() - new Date(recentOtp.created_at).getTime()) / 1000;
      if (secondsSinceSent < 60) {
        const waitSeconds = Math.ceil(60 - secondsSinceSent);
        return res.status(429).json({
          success: false,
          message: `Please wait ${waitSeconds} seconds before requesting a new code.`,
        });
      }
    }

    // 3. Clean up old OTPs
    await PasswordResetModel.deleteByEmail(email);

    // 4. Generate and store OTP
    const otp = generateOTP();
    const expires_at = getOTPExpiry();

    await PasswordResetModel.create({ email, otp, expires_at });

    // 5. Send email
    await sendPasswordResetEmail(email, user.name, otp);

    return res.status(200).json({
      success: true,
      message: 'If this email is registered, you will receive a reset code shortly.',
    });

  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/verify-reset-otp
 * Step 2: Verify OTP before allowing password reset
 */
const verifyResetOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    // 1. Find latest unused OTP
    const otpRecord = await PasswordResetModel.findLatestByEmail(email);

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'No active reset code found. Please request a new one.',
      });
    }

    // 2. Check max attempts
    if (otpRecord.attempts >= 5) {
      await PasswordResetModel.deleteByEmail(email);
      return res.status(429).json({
        success: false,
        message: 'Too many incorrect attempts. Please request a new code.',
      });
    }

    // 3. Check expiry
    if (new Date() > new Date(otpRecord.expires_at)) {
      await PasswordResetModel.deleteByEmail(email);
      return res.status(400).json({
        success: false,
        message: 'Reset code has expired. Please request a new one.',
      });
    }

    // 4. Verify OTP
    if (otpRecord.otp !== otp) {
      await PasswordResetModel.incrementAttempts(otpRecord.id, otpRecord.attempts);
      const remainingAttempts = 4 - otpRecord.attempts;
      return res.status(400).json({
        success: false,
        message: `Invalid code. ${remainingAttempts} attempt(s) remaining.`,
      });
    }

    // 5. Mark OTP as used
    await PasswordResetModel.markAsUsed(otpRecord.id);

    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully. You can now reset your password.',
    });

  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/reset-password
 * Step 3: Reset password after OTP verified
 */
const resetPassword = async (req, res, next) => {
  try {
    const { email, newPassword } = req.body;

    // 1. Check user exists
    const user = await UserModel.findByEmail(email);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    // 2. Make sure OTP was verified (no active unused OTPs should exist)
    const activeOtp = await PasswordResetModel.findLatestByEmail(email);

    if (activeOtp && !activeOtp.is_used) {
      return res.status(400).json({
        success: false,
        message: 'Please verify your OTP before resetting password.',
      });
    }

    // 3. Check new password is not same as old
    const isSamePassword = await bcrypt.compare(newPassword, user.password);

    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: 'New password cannot be the same as your current password.',
      });
    }

    // 4. Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // 5. Update password in DB
    const { error } = await supabase
      .from('users')
      .update({ password: hashedPassword })
      .eq('email', email.toLowerCase());

    if (error) throw error;

    // 6. Clean up all reset OTPs
    await PasswordResetModel.deleteByEmail(email);

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully! You can now login with your new password.',
    });

  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/resend-reset-otp
 * Resend password reset OTP
 */
const resendResetOTP = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await UserModel.findByEmail(email);

    if (!user || !user.is_verified) {
      return res.status(200).json({
        success: true,
        message: 'If this email is registered, you will receive a reset code shortly.',
      });
    }

    // Rate limit check
    const recentOtp = await PasswordResetModel.findLatestByEmail(email);

    if (recentOtp) {
      const secondsSinceSent = (Date.now() - new Date(recentOtp.created_at).getTime()) / 1000;
      if (secondsSinceSent < 60) {
        const waitSeconds = Math.ceil(60 - secondsSinceSent);
        return res.status(429).json({
          success: false,
          message: `Please wait ${waitSeconds} seconds before requesting a new code.`,
        });
      }
    }

    // Clean up and generate new OTP
    await PasswordResetModel.deleteByEmail(email);

    const otp = generateOTP();
    const expires_at = getOTPExpiry();

    await PasswordResetModel.create({ email, otp, expires_at });
    await sendPasswordResetEmail(email, user.name, otp);

    return res.status(200).json({
      success: true,
      message: 'A new reset code has been sent to your email.',
    });

  } catch (error) {
    next(error);
  }
};

module.exports = {
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
  resendOtpValidation,
};