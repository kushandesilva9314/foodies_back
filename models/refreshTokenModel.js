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

};

module.exports = RefreshTokenModel;