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
      .select('id, name, email, mobile, profile_photo, role, is_verified, created_at')
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
        profile_photo: null,       // set when user updates profile later
        role: 'customer',          // default role
        is_verified: false,
      })
      .select('id, name, email, mobile, profile_photo, role')
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Mark user as verified
   */
  markAsVerified: async (email) => {
    const { data, error } = await supabase
      .from('users')
      .update({ is_verified: true })
      .eq('email', email.toLowerCase())
      .select('id, name, email, mobile, profile_photo, role')
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update profile (name, mobile, profile_photo)
   */
  updateProfile: async (id, { name, mobile, profile_photo }) => {
    const updateData = {};
    if (name) updateData.name = name.trim();
    if (mobile) updateData.mobile = mobile;
    if (profile_photo !== undefined) updateData.profile_photo = profile_photo;

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select('id, name, email, mobile, profile_photo, role')
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

};

module.exports = UserModel;