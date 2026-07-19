const supabase = require('../config/supabase');

const UserModel = {

  /**
   * Find user by email
   */
  findByEmail: async (email) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  /**
   * Find user by ID
   */
  findById: async (id) => {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, mobile, profile_photo, role, is_verified, is_mobile_verified, mobile_notifications, email_notifications, browser_notifications, created_at')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  /**
   * Create new user
   * profile_photo and role are set to defaults at creation
   */
  create: async ({ name, email, password, mobile }) => {
    const { data, error } = await supabase
      .from('users')
      .insert({
        name: name.trim(),
        email: email.toLowerCase(),
        password,
        mobile,
        profile_photo: null,
        role: 'customer',
        is_verified: false,
        is_mobile_verified: false,
        // Notification prefs — mobile off until mobile is verified,
        // email + browser default on
        mobile_notifications: false,
        email_notifications: true,
        browser_notifications: true,
      })
      .select('id, name, email, mobile, profile_photo, role, is_mobile_verified, mobile_notifications, email_notifications, browser_notifications')
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Mark user email as verified
   */
  markAsVerified: async (email) => {
    const { data, error } = await supabase
      .from('users')
      .update({ is_verified: true })
      .eq('email', email.toLowerCase())
      .select('id, name, email, mobile, profile_photo, role, is_mobile_verified, mobile_notifications, email_notifications, browser_notifications')
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Mark mobile as verified
   */
  markMobileAsVerified: async (id) => {
    const { data, error } = await supabase
      .from('users')
      .update({ is_mobile_verified: true })
      .eq('id', id)
      .select('id, name, email, mobile, profile_photo, role, is_mobile_verified, mobile_notifications, email_notifications, browser_notifications')
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update profile (name, mobile, profile_photo, is_mobile_verified)
   * Automatically resets mobile_notifications to false when is_mobile_verified
   * is set to false (i.e. the mobile number changed and needs re-verification).
   */
  updateProfile: async (id, { name, mobile, profile_photo, is_mobile_verified }) => {
    const updateData = {};
    if (name) updateData.name = name.trim();
    if (mobile) updateData.mobile = mobile;
    if (profile_photo !== undefined) updateData.profile_photo = profile_photo;
    if (is_mobile_verified !== undefined) {
      updateData.is_mobile_verified = is_mobile_verified;
      // Mobile notifications require a verified number — turn them off
      // whenever verification is being reset (i.e. the mobile changed)
      if (is_mobile_verified === false) updateData.mobile_notifications = false;
    }

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select('id, name, email, mobile, profile_photo, role, is_mobile_verified, mobile_notifications, email_notifications, browser_notifications')
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update notification preferences (mobile/email/browser toggles).
   * The controller enforces that mobile_notifications can only be true
   * if is_mobile_verified — this method trusts that check has been done.
   */
  updatePreferences: async (id, { mobile_notifications, email_notifications, browser_notifications }) => {
    const updateData = {};
    if (mobile_notifications !== undefined) updateData.mobile_notifications = mobile_notifications;
    if (email_notifications !== undefined) updateData.email_notifications = email_notifications;
    if (browser_notifications !== undefined) updateData.browser_notifications = browser_notifications;

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select('id, name, email, mobile, profile_photo, role, is_mobile_verified, mobile_notifications, email_notifications, browser_notifications')
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Delete user by email (re-registration cleanup)
   */
  deleteByEmail: async (email) => {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('email', email.toLowerCase());

    if (error) throw error;
  },

  /**
   * Update user password
   */
  updatePassword: async (email, hashedPassword) => {
    const { error } = await supabase
      .from('users')
      .update({ password: hashedPassword })
      .eq('email', email.toLowerCase());

    if (error) throw error;
  },

  /**
   * Get all customers (excludes admins)
   */
  getAllCustomers: async () => {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, mobile, profile_photo, role, is_verified, is_mobile_verified, created_at')
      .eq('role', 'customer')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Delete user by ID (used by deleteAccount — cleans up the user row
   * after all related data has already been removed by the controller)
   */
  deleteById: async (id) => {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

};

module.exports = UserModel;