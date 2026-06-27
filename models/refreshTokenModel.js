const supabase = require('../config/supabase');

const RefreshTokenModel = {

  /**
   * Create refresh token
   */
  create: async ({ userId, token, rememberMe, expiresAt }) => {
    const { data, error } = await supabase
      .from('refresh_tokens')
      .insert({
        user_id: userId,
        token,
        remember_me: rememberMe,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Find refresh token
   */
  findByToken: async (token) => {
    const { data, error } = await supabase
      .from('refresh_tokens')
      .select('*')
      .eq('token', token)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  /**
   * Delete refresh token (logout)
   */
  deleteByToken: async (token) => {
    const { error } = await supabase
      .from('refresh_tokens')
      .delete()
      .eq('token', token);

    if (error) throw error;
  },

  /**
   * Delete all refresh tokens for user (logout all devices)
   */
  deleteAllByUserId: async (userId) => {
    const { error } = await supabase
      .from('refresh_tokens')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;
  },

  /**
 * Mark a token as rotated/used instead of hard-deleting it.
 * Keeping the row lets us detect reuse (theft) later.
 */
revokeToken: async (token) => {
  const { error } = await supabase
    .from('refresh_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('token', token);

  if (error) throw error;
},

/**
 * Delete tokens that are past their expiry, or were revoked
 * (rotated/reused) more than 7 days ago. The 7-day grace window
 * on revoked tokens keeps a short trail for reuse-detection/audit.
 */
deleteExpiredAndStaleRevoked: async () => {
  const now = new Date().toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('refresh_tokens')
    .delete()
    .or(`expires_at.lt.${now},revoked_at.lt.${sevenDaysAgo}`)
    .select('id');

  if (error) throw error;
  return data?.length || 0;
},

};

module.exports = RefreshTokenModel;