const supabase = require('../config/supabase');
const Menu = require('../models/menuModel');
const { uploadImage, deleteImage } = require('../utils/imageUpload');

// Get all menus
const getAllMenus = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('menus')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    res.status(200).json({
      success: true,
      count: data.length,
      data: data
    });
  } catch (error) {
    console.error('Get all menus error:', error);
    next(error);
  }
};

// Get single menu by ID
const getMenuById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('menus')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'Menu not found'
        });
      }
      throw error;
    }

    res.status(200).json({
      success: true,
      data: data
    });
  } catch (error) {
    console.error('Get menu by ID error:', error);
    next(error);
  }
};

// Create new menu
const createMenu = async (req, res, next) => {
  try {
    const { name } = req.body;
    const file = req.file;

    // Validate input
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Menu name is required'
      });
    }

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'Menu image is required'
      });
    }

    // Check for duplicate name
    const { data: existingMenu } = await supabase
      .from('menus')
      .select('id')
      .ilike('name', name.trim())
      .single();

    if (existingMenu) {
      return res.status(409).json({
        success: false,
        message: `A menu with the name "${name.trim()}" already exists`
      });
    }

    // Upload image to Supabase Storage
    const imageUrl = await uploadImage(file.buffer, file.originalname, file.mimetype);

    // Insert menu with image URL
    const { data, error } = await supabase
      .from('menus')
      .insert([{
        name: name.trim(),
        image: imageUrl
      }])
      .select()
      .single();

    if (error) {
      // If database insert fails, delete the uploaded image
      await deleteImage(imageUrl);
      throw error;
    }

    res.status(201).json({
      success: true,
      message: 'Menu created successfully',
      data: data
    });
  } catch (error) {
    console.error('Create menu error:', error);
    
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'A menu with this name already exists'
      });
    }
    
    next(error);
  }
};

// Update menu
const updateMenu = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const file = req.file;

    // Validate input
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Menu name is required'
      });
    }

    // Check if menu exists
    const { data: existingMenu, error: checkError } = await supabase
      .from('menus')
      .select('*')
      .eq('id', id)
      .single();

    if (checkError || !existingMenu) {
      return res.status(404).json({
        success: false,
        message: 'Menu not found'
      });
    }

    // Check for duplicate name (excluding current menu)
    const { data: duplicateMenu } = await supabase
      .from('menus')
      .select('id')
      .ilike('name', name.trim())
      .neq('id', id)
      .single();

    if (duplicateMenu) {
      return res.status(409).json({
        success: false,
        message: `A menu with the name "${name.trim()}" already exists`
      });
    }

    // Prepare update data
    const updateData = {
      name: name.trim()
    };

    // If new image is uploaded, upload it and update URL
    if (file) {
      const imageUrl = await uploadImage(file.buffer, file.originalname, file.mimetype);
      updateData.image = imageUrl;

      // Delete old image from storage
      if (existingMenu.image) {
        await deleteImage(existingMenu.image);
      }
    }

    // Update menu
    const { data, error } = await supabase
      .from('menus')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      // If update fails and new image was uploaded, delete it
      if (updateData.image) {
        await deleteImage(updateData.image);
      }
      throw error;
    }

    res.status(200).json({
      success: true,
      message: 'Menu updated successfully',
      data: data
    });
  } catch (error) {
    console.error('Update menu error:', error);
    
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'A menu with this name already exists'
      });
    }
    
    next(error);
  }
};

// Delete menu
const deleteMenu = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if menu exists
    const { data: existingMenu, error: checkError } = await supabase
      .from('menus')
      .select('*')
      .eq('id', id)
      .single();

    if (checkError || !existingMenu) {
      return res.status(404).json({
        success: false,
        message: 'Menu not found'
      });
    }

    // Delete menu from database
    const { error } = await supabase
      .from('menus')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    // Delete image from storage
    if (existingMenu.image) {
      await deleteImage(existingMenu.image);
    }

    res.status(200).json({
      success: true,
      message: 'Menu deleted successfully'
    });
  } catch (error) {
    console.error('Delete menu error:', error);
    next(error);
  }
};

module.exports = {
  getAllMenus,
  getMenuById,
  createMenu,
  updateMenu,
  deleteMenu
};