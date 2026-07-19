const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { body } = require("express-validator");
const UserModel = require("../models/userModel");
const OTPModel = require("../models/otpModel");
const { sendOTPEmail } = require("../services/otpEmailService");
const { generateOTP, getOTPExpiry } = require("../utils/otpUtils");
const {
  sendPasswordResetEmail,
} = require("../services/passwordResetEmailService");
const PasswordResetModel = require("../models/passwordResetModel");
const { uploadImage, deleteImage } = require("../utils/imageUpload");
const { getAuth } = require("../config/firebase");
const RefreshTokenModel = require("../models/refreshTokenModel");
const { verifyRecaptcha } = require("../utils/recaptcha");
const {
  generateAccessToken,
  generateRefreshToken,
  getRefreshTokenExpiry,
  generateResetToken,
  verifyResetToken,
} = require("../utils/tokenUtils");

// ─── Validation Rules ─────────────────────────────────────────────────────────

const registerValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Full name is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be 2–50 characters")
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage("Name can only contain letters and spaces"),

  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please enter a valid email address")
    .normalizeEmail(),

  body("mobile")
    .trim()
    .notEmpty()
    .withMessage("Mobile number is required")
    .matches(/^[0-9]{10}$/)
    .withMessage("Mobile must be exactly 10 digits")
    .matches(/^[0789]/)
    .withMessage("Mobile must start with 0, 7, 8, or 9"),

  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 8, max: 128 })
    .withMessage("Password must be 8–128 characters")
    .matches(/(?=.*[a-z])/)
    .withMessage("Password must contain a lowercase letter")
    .matches(/(?=.*[A-Z])/)
    .withMessage("Password must contain an uppercase letter")
    .matches(/(?=.*\d)/)
    .withMessage("Password must contain a number")
    .matches(/(?=.*[@$!%*?&])/)
    .withMessage("Password must contain a special character (@$!%*?&)"),
];

const verifyOtpValidation = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email address")
    .normalizeEmail(),

  body("otp")
    .trim()
    .notEmpty()
    .withMessage("OTP is required")
    .matches(/^\d{6}$/)
    .withMessage("OTP must be a 6-digit number"),
];

const resendOtpValidation = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email address")
    .normalizeEmail(),
];

const loginValidation = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please enter a valid email address")
    .normalizeEmail(),

  body("password")
    .notEmpty()
    .withMessage("Password is required")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters"),

  body("rememberMe")
    .optional()
    .isBoolean()
    .withMessage("rememberMe must be a boolean"),
];

const forgotPasswordValidation = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please enter a valid email address")
    .normalizeEmail(),
];

const verifyResetOtpValidation = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email address")
    .normalizeEmail(),

  body("otp")
    .trim()
    .notEmpty()
    .withMessage("OTP is required")
    .matches(/^\d{6}$/)
    .withMessage("OTP must be a 6-digit number"),
];

const resetPasswordValidation = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Invalid email address")
    .normalizeEmail(),

  body("resetToken")
    .notEmpty()
    .withMessage("Reset token is required. Please verify your OTP again."),

  body("newPassword")
    .notEmpty()
    .withMessage("New password is required")
    .isLength({ min: 8, max: 128 })
    .withMessage("Password must be 8–128 characters")
    .matches(/(?=.*[a-z])/)
    .withMessage("Password must contain a lowercase letter")
    .matches(/(?=.*[A-Z])/)
    .withMessage("Password must contain an uppercase letter")
    .matches(/(?=.*\d)/)
    .withMessage("Password must contain a number")
    .matches(/(?=.*[@$!%*?&])/)
    .withMessage("Password must contain a special character (@$!%*?&)"),
];

const updateProfileValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Full name is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be 2–50 characters")
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage("Name can only contain letters and spaces"),

  body("mobile")
    .trim()
    .notEmpty()
    .withMessage("Mobile number is required")
    .matches(/^[0-9]{10}$/)
    .withMessage("Mobile must be exactly 10 digits")
    .matches(/^[0789]/)
    .withMessage("Mobile must start with 0, 7, 8, or 9"),
];

const changePasswordValidation = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),

  body("newPassword")
    .notEmpty()
    .withMessage("New password is required")
    .isLength({ min: 8, max: 128 })
    .withMessage("Password must be 8–128 characters")
    .matches(/(?=.*[a-z])/)
    .withMessage("Password must contain a lowercase letter")
    .matches(/(?=.*[A-Z])/)
    .withMessage("Password must contain an uppercase letter")
    .matches(/(?=.*\d)/)
    .withMessage("Password must contain a number")
    .matches(/(?=.*[@$!%*?&])/)
    .withMessage("Password must contain a special character (@$!%*?&)"),
];

const updatePreferencesValidation = [
  body("mobile_notifications")
    .optional()
    .isBoolean()
    .withMessage("mobile_notifications must be a boolean"),
  body("email_notifications")
    .optional()
    .isBoolean()
    .withMessage("email_notifications must be a boolean"),
  body("browser_notifications")
    .optional()
    .isBoolean()
    .withMessage("browser_notifications must be a boolean"),
];

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
          message: "An account with this email already exists",
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
      mobile: mobile.replace(/\s/g, ""),
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
        message: "No active OTP found. Please request a new one.",
      });
    }

    // 2. Check max attempts
    if (otpRecord.attempts >= 5) {
      await OTPModel.deleteByEmail(email);
      return res.status(429).json({
        success: false,
        message: "Too many incorrect attempts. Please request a new OTP.",
      });
    }

    // 3. Check expiry
    if (new Date() > new Date(otpRecord.expires_at)) {
      await OTPModel.deleteByEmail(email);
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one.",
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
    const accessToken = generateAccessToken(verifiedUser.id);
    const newRefreshToken = generateRefreshToken();
    const refreshTokenExpiry = getRefreshTokenExpiry(false);

    await RefreshTokenModel.create({
      userId: verifiedUser.id,
      token: newRefreshToken,
      rememberMe: false,
      expiresAt: refreshTokenExpiry,
    });

    // Set refresh token as httpOnly cookie
    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      // no `expires` — registration always starts as a session-only cookie
    });
    return res.status(200).json({
      success: true,
      message: "Account verified successfully! Welcome to Foodies.",
      data: {
        accessToken,
        rememberMe: false,
        user: {
          id: verifiedUser.id,
          name: verifiedUser.name,
          email: verifiedUser.email,
          mobile: verifiedUser.mobile,
          profile_photo: verifiedUser.profile_photo,
          role: verifiedUser.role,
          is_mobile_verified: verifiedUser.is_mobile_verified,
          mobile_notifications: verifiedUser.mobile_notifications,
          email_notifications: verifiedUser.email_notifications,
          browser_notifications: verifiedUser.browser_notifications,
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
        message: "No registration found for this email.",
      });
    }

    if (user.is_verified) {
      return res.status(400).json({
        success: false,
        message: "This account is already verified.",
      });
    }

    // 2. Rate limit check
    const recentOtp = await OTPModel.findLatestByEmail(email);

    if (recentOtp) {
      const secondsSinceSent =
        (Date.now() - new Date(recentOtp.created_at).getTime()) / 1000;
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
    const { email, password, rememberMe } = req.body;

    const user = await UserModel.findByEmail(email);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (!user.is_verified) {
      return res.status(403).json({
        success: false,
        message: "Account not verified. Please verify your email first.",
      });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const accessToken = generateAccessToken(user.id);
    const newRefreshToken = generateRefreshToken();
    const refreshTokenExpiry = getRefreshTokenExpiry(rememberMe);

    await RefreshTokenModel.create({
      userId: user.id,
      token: newRefreshToken,
      rememberMe: rememberMe || false,
      expiresAt: refreshTokenExpiry,
    });

    // Set refresh token as httpOnly cookie
    // Set refresh token as httpOnly cookie
    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      ...(rememberMe ? { expires: refreshTokenExpiry } : {}), // omit expires = browser-session cookie
    });

    return res.status(200).json({
      success: true,
      message: "Login successful! Welcome back.",
      data: {
        accessToken,
        rememberMe: rememberMe || false,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          mobile: user.mobile,
          profile_photo: user.profile_photo,
          role: user.role,
          is_mobile_verified: user.is_mobile_verified,
          mobile_notifications: user.mobile_notifications,
          email_notifications: user.email_notifications,
          browser_notifications: user.browser_notifications,
        },
        redirectTo: user.role === "admin" ? "/admin" : "/",
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
        message:
          "If this email is registered, you will receive a reset code shortly.",
      });
    }

    // 2. Rate limit — check if OTP sent less than 60 seconds ago
    const recentOtp = await PasswordResetModel.findLatestByEmail(email);

    if (recentOtp) {
      const secondsSinceSent =
        (Date.now() - new Date(recentOtp.created_at).getTime()) / 1000;
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
      message:
        "If this email is registered, you will receive a reset code shortly.",
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

    const otpRecord = await PasswordResetModel.findLatestByEmail(email);

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: "No active reset code found. Please request a new one.",
      });
    }

    if (otpRecord.attempts >= 5) {
      await PasswordResetModel.deleteByEmail(email);
      return res.status(429).json({
        success: false,
        message: "Too many incorrect attempts. Please request a new code.",
      });
    }

    if (new Date() > new Date(otpRecord.expires_at)) {
      await PasswordResetModel.deleteByEmail(email);
      return res.status(400).json({
        success: false,
        message: "Reset code has expired. Please request a new one.",
      });
    }

    if (otpRecord.otp !== otp) {
      await PasswordResetModel.incrementAttempts(
        otpRecord.id,
        otpRecord.attempts,
      );
      const remainingAttempts = 4 - otpRecord.attempts;
      return res.status(400).json({
        success: false,
        message: `Invalid code. ${remainingAttempts} attempt(s) remaining.`,
      });
    }

    await PasswordResetModel.markAsUsed(otpRecord.id);

    // ── Issue short-lived signed token proving OTP verification ──
    const resetToken = generateResetToken(email);

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully. You can now reset your password.",
      data: { resetToken },
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
    const { email, resetToken, newPassword } = req.body;

    // 1. Verify the reset token itself — signature, expiry, and purpose
    let decoded;
    try {
      decoded = verifyResetToken(resetToken);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid or expired reset session. Please verify your OTP again.",
      });
    }

    // 2. Token must belong to the same email being reset
    if (decoded.email !== email.toLowerCase()) {
      return res.status(401).json({
        success: false,
        message:
          "Invalid or expired reset session. Please verify your OTP again.",
      });
    }

    // 3. Check user exists
    const user = await UserModel.findByEmail(email);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // 4. Check new password is not same as old
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: "New password cannot be the same as your current password.",
      });
    }

    // 5. Hash & update
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await UserModel.updatePassword(email, hashedPassword);

    // 6. Clean up any leftover reset OTPs
    await PasswordResetModel.deleteByEmail(email);

    return res.status(200).json({
      success: true,
      message:
        "Password reset successfully! You can now login with your new password.",
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
        message:
          "If this email is registered, you will receive a reset code shortly.",
      });
    }

    // Rate limit check
    const recentOtp = await PasswordResetModel.findLatestByEmail(email);

    if (recentOtp) {
      const secondsSinceSent =
        (Date.now() - new Date(recentOtp.created_at).getTime()) / 1000;
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
      message: "A new reset code has been sent to your email.",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/refresh
 * Get new access token using refresh token
 */
const refreshAccessToken = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res
        .status(401)
        .json({ success: false, message: "Refresh token is required." });
    }

    const storedToken = await RefreshTokenModel.findByToken(refreshToken);

    if (!storedToken) {
      return res.status(401).json({
        success: false,
        message: "Invalid refresh token. Please login again.",
      });
    }

    // ── Reuse detection ──────────────────────────────────────────────
    // This exact token was already rotated away once before. Someone is
    // replaying an old refresh token — treat it as a compromised session.
    if (storedToken.revoked_at) {
      await RefreshTokenModel.deleteAllByUserId(storedToken.user_id);
      res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
      });
      return res.status(401).json({
        success: false,
        code: "TOKEN_REUSE_DETECTED",
        message:
          "Security alert: this session was reused. All devices have been signed out — please log in again.",
      });
    }

    if (new Date() > new Date(storedToken.expires_at)) {
      await RefreshTokenModel.deleteByToken(refreshToken);
      res.clearCookie("refreshToken");
      return res.status(401).json({
        success: false,
        message: "Refresh token expired. Please login again.",
      });
    }

    const user = await UserModel.findById(storedToken.user_id);
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "User no longer exists." });
    }

    // Rotation — mark old token as used (not deleted) so reuse is detectable
    await RefreshTokenModel.revokeToken(refreshToken);

    const accessToken = generateAccessToken(user.id);
    const newRefreshToken = generateRefreshToken();
    const refreshTokenExpiry = getRefreshTokenExpiry(storedToken.remember_me);

    await RefreshTokenModel.create({
      userId: user.id,
      token: newRefreshToken,
      rememberMe: storedToken.remember_me,
      expiresAt: refreshTokenExpiry,
    });

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      ...(storedToken.remember_me ? { expires: refreshTokenExpiry } : {}), // see Fix 3
    });

    return res.status(200).json({
      success: true,
      data: {
        accessToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          mobile: user.mobile,
          profile_photo: user.profile_photo,
          role: user.role,
          is_mobile_verified: user.is_mobile_verified,
          mobile_notifications: user.mobile_notifications,
          email_notifications: user.email_notifications,
          browser_notifications: user.browser_notifications,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/logout
 * Invalidate refresh token
 */
const logout = async (req, res, next) => {
  try {
    // Read from cookie
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      await RefreshTokenModel.deleteByToken(refreshToken);
    }

    // Clear the cookie
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    return res.status(200).json({
      success: true,
      message: "Logged out successfully.",
    });
  } catch (error) {
    next(error);
  }
};
/**
 * GET /api/auth/me
 * Get current logged in user
 */
const getMe = async (req, res, next) => {
  try {
    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: req.user.id,
          name: req.user.name,
          email: req.user.email,
          mobile: req.user.mobile,
          profile_photo: req.user.profile_photo,
          role: req.user.role,
          is_mobile_verified: req.user.is_mobile_verified,
          mobile_notifications: req.user.mobile_notifications,
          email_notifications: req.user.email_notifications,
          browser_notifications: req.user.browser_notifications,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/auth/profile
 * Update logged-in user's profile (name, mobile, profile photo)
 * If the mobile number is changed, is_mobile_verified is reset to false
 */
const updateProfile = async (req, res, next) => {
  let uploadedImageUrl = null;

  try {
    const { name, mobile, removePhoto } = req.body;
    const file = req.file;
    const currentUser = req.user; // from protect middleware

    const sanitizedMobile = mobile.replace(/\s/g, "");

    const updateData = {
      name: name.trim(),
      mobile: sanitizedMobile,
    };

    // ── If mobile number is being changed, mobile must be re-verified ──
    const mobileChanged = sanitizedMobile !== currentUser.mobile;
    if (mobileChanged) {
      updateData.is_mobile_verified = false;
    }

    // ── Handle profile photo (new upload takes priority over removal) ──
    const wantsRemovePhoto = removePhoto === "true" || removePhoto === true;

    if (file) {
      uploadedImageUrl = await uploadImage(
        file.buffer,
        file.originalname,
        file.mimetype,
      );
      updateData.profile_photo = uploadedImageUrl;
    } else if (wantsRemovePhoto) {
      updateData.profile_photo = null;
    }

    // ── Persist changes ──
    const updatedUser = await UserModel.updateProfile(
      currentUser.id,
      updateData,
    );

    // ── Clean up old photo from storage if it was replaced or removed ──
    if ((file || wantsRemovePhoto) && currentUser.profile_photo) {
      await deleteImage(currentUser.profile_photo);
    }

    return res.status(200).json({
      success: true,
      message: mobileChanged
        ? "Profile updated successfully. Your mobile number is no longer verified."
        : "Profile updated successfully.",
      data: {
        user: updatedUser,
      },
    });
  } catch (error) {
    // If a new image was uploaded but the DB update failed, clean it up
    if (uploadedImageUrl) {
      await deleteImage(uploadedImageUrl);
    }
    next(error);
  }
};

/**
 * POST /api/auth/logout-all
 * Sign out from ALL devices/sessions (deletes every refresh token for the user)
 * This also ends the current session, since its refresh token is removed too.
 */
const logoutAllDevices = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Remove every refresh token belonging to this user — invalidates all sessions
    await RefreshTokenModel.deleteAllByUserId(userId);

    // The current device's refresh cookie is now invalid as well, so clear it
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    return res.status(200).json({
      success: true,
      message: "You have been signed out from all devices.",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/auth/change-password
 * Change password for the logged-in user (requires current password)
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // req.user (from protect) doesn't include the password hash — fetch full record
    const user = await UserModel.findByEmail(req.user.email);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    // 1. Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );

    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect.",
      });
    }

    // 2. New password must differ from current
    const isSamePassword = await bcrypt.compare(newPassword, user.password);

    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: "New password cannot be the same as your current password.",
      });
    }

    // 3. Hash & update
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await UserModel.updatePassword(user.email, hashedPassword);

    return res.status(200).json({
      success: true,
      message: "Password changed successfully.",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/verify-mobile-otp
 * Verifies the Firebase ID token, then marks is_mobile_verified = true
 */
const verifyMobileOtp = async (req, res, next) => {
  try {
    const { firebaseToken } = req.body;

    if (!firebaseToken) {
      return res.status(400).json({
        success: false,
        message: "Firebase token is required.",
      });
    }

    // 1. Verify the token Firebase sent to the client
    let decodedToken;
    try {
      decodedToken = await getAuth().verifyIdToken(firebaseToken);
    } catch (err) {
      console.error(
        "Firebase token verification error:",
        err.code,
        err.message,
      );
      return res.status(401).json({
        success: false,
        message: "Invalid or expired verification token. Please try again.",
      });
    }
    // 2. Make sure the phone number in the token matches what's on the user's account
    //    Firebase stores the number in E.164 format e.g. +94771234567
    const verifiedPhone = decodedToken.phone_number;
    const userMobile = req.user.mobile; // stored as 10-digit e.g. 0771234567

    // Strip leading zero and prepend +94 (Sri Lanka) for comparison
    // Adjust the country code prefix to match YOUR users' numbers
    const normalizedUserMobile = "+94" + userMobile.replace(/^0/, "");

    if (verifiedPhone !== normalizedUserMobile) {
      return res.status(400).json({
        success: false,
        message:
          "Phone number mismatch. Please verify the number on your account.",
      });
    }

    // 3. Mark mobile as verified in DB
    const updatedUser = await UserModel.markMobileAsVerified(req.user.id);

    // 4. Update localStorage-friendly user object in response
    return res.status(200).json({
      success: true,
      message: "Mobile number verified successfully!",
      data: {
        user: updatedUser,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/auth/preferences
 */
const updatePreferences = async (req, res, next) => {
  try {
    const { mobile_notifications, email_notifications, browser_notifications } =
      req.body;

    // Defense in depth — never trust the client
    if (mobile_notifications === true && !req.user.is_mobile_verified) {
      return res.status(400).json({
        success: false,
        message:
          "Please verify your mobile number before enabling mobile notifications.",
      });
    }

    const updatedUser = await UserModel.updatePreferences(req.user.id, {
      mobile_notifications,
      email_notifications,
      browser_notifications,
    });

    return res.status(200).json({
      success: true,
      message: "Preferences updated successfully.",
      data: { user: updatedUser },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/auth/account
 */
const deleteAccount = async (req, res, next) => {
  try {
    const { recaptchaToken } = req.body;

    if (!recaptchaToken) {
      return res.status(400).json({
        success: false,
        message: "Please complete the captcha before deleting your account.",
      });
    }

    const isHuman = await verifyRecaptcha(recaptchaToken);
    if (!isHuman) {
      return res.status(400).json({
        success: false,
        message: "Captcha verification failed. Please try again.",
      });
    }

    const userId = req.user.id;
    const userEmail = req.user.email;

    await RefreshTokenModel.deleteAllByUserId(userId);
    await OTPModel.deleteByEmail(userEmail);
    await PasswordResetModel.deleteByEmail(userEmail);

    if (req.user.profile_photo) {
      await deleteImage(req.user.profile_photo);
    }

    await UserModel.deleteById(userId);

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    return res.status(200).json({
      success: true,
      message: "Your account has been permanently deleted.",
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
  updatePreferences,
  updatePreferencesValidation,
  deleteAccount,
};
