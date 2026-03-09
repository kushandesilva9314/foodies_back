const supabase = require('../config/supabase');

const PasswordResetModel = {

  /**
   * Create new password reset OTP
   */
  create: async ({ email, otp, expires_at }) => {
    const { data, error } = await supabase
      .from('password_resets')
      .insert({
        email: email.toLowerCase(),
        otp,
        expires_at,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Find latest unused OTP for email
   */
  findLatestByEmail: async (email) => {
    const { data, error } = await supabase
      .from('password_resets')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('is_used', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  /**
   * Increment attempt count
   */
  incrementAttempts: async (id, currentAttempts) => {
    const { error } = await supabase
      .from('password_resets')
      .update({ attempts: currentAttempts + 1 })
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Mark OTP as used
   */
  markAsUsed: async (id) => {
    const { error } = await supabase
      .from('password_resets')
      .update({ is_used: true })
      .eq('id', id);

    if (error) throw error;
  },

  /**
   * Delete all reset OTPs for email
   */
  deleteByEmail: async (email) => {
    const { error } = await supabase
      .from('password_resets')
      .delete()
      .eq('email', email.toLowerCase());

    if (error) throw error;
  },

};

module.exports = PasswordResetModel;