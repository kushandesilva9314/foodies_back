const supabase = require('../config/supabase');
const Category = require('../models/categoryModel');
const { uploadImage, deleteImage } = require('../utils/imageUpload');

// Get all categories
const getAllCategories = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('categories')
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
    console.error('Get all categories error:', error);
    next(error);
  }
};

// Get single category by ID
const getCategoryById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'Category not found'
        });
      }
      throw error;
    }

    res.status(200).json({
      success: true,
      data: data
    });
  } catch (error) {
    console.error('Get category by ID error:', error);
    next(error);
  }
};

// Create new category
const createCategory = async (req, res, next) => {
  try {
    const { name } = req.body;
    const file = req.file;

    // Validate input
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Category name is required'
      });
    }

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'Category image is required'
      });
    }

    // Check for duplicate name
    const { data: existingCategory } = await supabase
      .from('categories')
      .select('id')
      .ilike('name', name.trim())
      .single();

    if (existingCategory) {
      return res.status(409).json({
        success: false,
        message: `A category with the name "${name.trim()}" already exists`
      });
    }

    // Upload image to Supabase Storage
    const imageUrl = await uploadImage(file.buffer, file.originalname, file.mimetype);

    // Insert category with image URL
    const { data, error } = await supabase
      .from('categories')
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
      message: 'Category created successfully',
      data: data
    });
  } catch (error) {
    console.error('Create category error:', error);
    
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'A category with this name already exists'
      });
    }
    
    next(error);
  }
};

// Update category
const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const file = req.file;

    // Validate input
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Category name is required'
      });
    }

    // Check if category exists
    const { data: existingCategory, error: checkError } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .single();

    if (checkError || !existingCategory) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check for duplicate name (excluding current category)
    const { data: duplicateCategory } = await supabase
      .from('categories')
      .select('id')
      .ilike('name', name.trim())
      .neq('id', id)
      .single();

    if (duplicateCategory) {
      return res.status(409).json({
        success: false,
        message: `A category with the name "${name.trim()}" already exists`
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
      if (existingCategory.image) {
        await deleteImage(existingCategory.image);
      }
    }

    // Update category
    const { data, error } = await supabase
      .from('categories')
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
      message: 'Category updated successfully',
      data: data
    });
  } catch (error) {
    console.error('Update category error:', error);
    
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'A category with this name already exists'
      });
    }
    
    next(error);
  }
};

// Delete category
const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if category exists
    const { data: existingCategory, error: checkError } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .single();

    if (checkError || !existingCategory) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Delete category from database
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    // Delete image from storage
    if (existingCategory.image) {
      await deleteImage(existingCategory.image);
    }

    res.status(200).json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Delete category error:', error);
    next(error);
  }
};

module.exports = {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
};