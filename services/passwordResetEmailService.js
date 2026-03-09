const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Send password reset OTP email
 */
const sendPasswordResetEmail = async (email, name, otp) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Reset Your Foodies Password',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin:0; padding:0; background-color:#f9fafb; font-family: Arial, sans-serif;">
          <div style="max-width:600px; margin:40px auto; background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 6px rgba(0,0,0,0.07);">

            <!-- Header -->
            <div style="background: linear-gradient(135deg, #f97316, #dc2626); padding:40px 30px; text-align:center;">
              <h1 style="color:#ffffff; margin:0; font-size:32px; font-weight:800; letter-spacing:-1px;">🍽️ Foodies</h1>
              <p style="color:rgba(255,255,255,0.85); margin:8px 0 0; font-size:15px;">Your food, delivered fast</p>
            </div>

            <!-- Body -->
            <div style="padding:40px 30px;">
              <h2 style="color:#1f2937; margin:0 0 8px; font-size:22px;">Hi ${name}! 👋</h2>
              <p style="color:#6b7280; font-size:15px; line-height:1.6; margin:0 0 30px;">
                We received a request to reset your password. Use the code below to proceed.
                This code expires in <strong>10 minutes</strong>.
              </p>

              <!-- OTP Box -->
              <div style="background:#fff7ed; border:2px dashed #f97316; border-radius:12px; padding:30px; text-align:center; margin-bottom:30px;">
                <p style="color:#9a3412; font-size:13px; font-weight:600; margin:0 0 10px; text-transform:uppercase; letter-spacing:1px;">Password Reset Code</p>
                <div style="font-size:48px; font-weight:800; color:#ea580c; letter-spacing:12px;">${otp}</div>
              </div>

              <p style="color:#9ca3af; font-size:13px; line-height:1.6; margin:0;">
                If you did not request a password reset, please ignore this email.
                Never share this code with anyone.
              </p>
            </div>

            <!-- Footer -->
            <div style="background:#f9fafb; padding:20px 30px; text-align:center; border-top:1px solid #f3f4f6;">
              <p style="color:#9ca3af; font-size:12px; margin:0;">© ${new Date().getFullYear()} Foodies. All rights reserved.</p>
            </div>

          </div>
        </body>
      </html>
    `,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = { sendPasswordResetEmail };