const cron = require('node-cron');
const RefreshTokenModel = require('../models/refreshTokenModel');

// Runs daily at 3 AM server time
const startTokenCleanupJob = () => {
  cron.schedule('0 3 * * *', async () => {
    try {
      const deleted = await RefreshTokenModel.deleteExpiredAndStaleRevoked();
      console.log(`[token cleanup] removed ${deleted} stale refresh token(s)`);
    } catch (err) {
      console.error('[token cleanup] failed:', err);
    }
  });
};

module.exports = { startTokenCleanupJob };