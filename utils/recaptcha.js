/**
 * Verifies a Google reCAPTCHA v2 ("I'm not a robot") response token
 * server-side against Google's siteverify endpoint.
 *
 * Requires RECAPTCHA_SECRET_KEY in .env — get it from
 * https://www.google.com/recaptcha/admin (create a v2 "Checkbox" key).
 *
 * NOTE: this uses the global `fetch` available in Node 18+. If you're
 * on an older Node version, install `node-fetch` and import it here instead.
 */
const verifyRecaptcha = async (token) => {
  if (!token) return false;

  const secretKey = process.env.RECAPTCHA_SECRET_KEY;
  if (!secretKey) {
    console.error('RECAPTCHA_SECRET_KEY is not set in environment variables.');
    return false;
  }

  try {
    const params = new URLSearchParams({
      secret: secretKey,
      response: token,
    });

    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });

    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
    return false;
  }
};

module.exports = { verifyRecaptcha };