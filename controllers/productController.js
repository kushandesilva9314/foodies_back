const supabase = require('../config/supabase');
const Product = require('../models/productModel');
const { uploadImage, deleteImage } = require('../utils/imageUpload');

// Get all products with menu and category details
const getAllProducts = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        menus:menu_id (id, name),
        categories:category_id (id, name)
      `)
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
    console.error('Get all products error:', error);
    next(error);
  }
};

// Get single product by ID
const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        menus:menu_id (id, name),
        categories:category_id (id, name)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }
      throw error;
    }

    res.status(200).json({
      success: true,
      data: data
    });
  } catch (error) {
    console.error('Get product by ID error:', error);
    next(error);
  }
};

// Create new product
const createProduct = async (req, res, next) => {
  try {
    const { 
      item_no, 
      name, 
      description, 
      price, 
      availability = 'yes',
      menu_id,
      category_id,
      portions
    } = req.body;
    
    const file = req.file;

    // Prepare data for validation
    const productData = {
      item_no,
      name,
      description,
      price,
      availability,
      menu_id,
      category_id,
      portions
    };

    // Validate input
    const validation = Product.validate(productData);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors
      });
    }

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'Product image is required'
      });
    }

    // Check for duplicate item_no
    const { data: existingProduct } = await supabase
      .from('products')
      .select('id')
      .ilike('item_no', item_no.trim())
      .single();

    if (existingProduct) {
      return res.status(409).json({
        success: false,
        message: `A product with Item No "${item_no.trim()}" already exists`
      });
    }

    // Upload image to Supabase Storage
    const imageUrl = await uploadImage(file.buffer, file.originalname, file.mimetype);

    // Sanitize data
    const sanitizedData = Product.sanitize(productData);
    sanitizedData.image = imageUrl;

    // If portions are enabled, keep the plain price column in sync
    // with the cheapest active portion — this is what every other part
    // of the app (sorting, discount math, cart, etc.) reads.
    if (sanitizedData.portions && sanitizedData.portions.enabled) {
      const activePrices = sanitizedData.portions.options
        .filter((o) => o.active && o.price != null)
        .map((o) => o.price);
      if (activePrices.length > 0) {
        sanitizedData.price = Math.min(...activePrices);
      }
    }
    
    // Set defaults for featured and discount
    sanitizedData.featured = 'no';
    sanitizedData.discount = 0;

    // Insert product
    const { data, error } = await supabase
      .from('products')
      .insert([sanitizedData])
      .select(`
        *,
        menus:menu_id (id, name),
        categories:category_id (id, name)
      `)
      .single();

    if (error) {
      // If database insert fails, delete the uploaded image
      await deleteImage(imageUrl);
      throw error;
    }

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: data
    });
  } catch (error) {
    console.error('Create product error:', error);
    
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'A product with this Item No already exists'
      });
    }
    
    next(error);
  }
};

// Update product
const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { 
      item_no, 
      name, 
      description, 
      price, 
      availability,
      menu_id,
      category_id,
      featured,
      discount,
      portions 
    } = req.body;
    
    const file = req.file;

    // Prepare data for validation
    const productData = {
      item_no,
      name,
      description,
      price,
      availability,
      menu_id,
      category_id,
      featured,
      discount,
      portions 
    };

    // Validate input
    const validation = Product.validate(productData, true);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validation.errors
      });
    }

    // Check if product exists
    const { data: existingProduct, error: checkError } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (checkError || !existingProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check for duplicate item_no (excluding current product)
    if (item_no) {
      const { data: duplicateProduct } = await supabase
        .from('products')
        .select('id')
        .ilike('item_no', item_no.trim())
        .neq('id', id)
        .single();

      if (duplicateProduct) {
        return res.status(409).json({
          success: false,
          message: `A product with Item No "${item_no.trim()}" already exists`
        });
      }
    }

    // Sanitize data
    const sanitizedData = Product.sanitize(productData);

    // If portions are enabled, keep the plain price column in sync
    // with the cheapest active portion — this is what every other part
    // of the app (sorting, discount math, cart, etc.) reads.
    if (sanitizedData.portions && sanitizedData.portions.enabled) {
      const activePrices = sanitizedData.portions.options
        .filter((o) => o.active && o.price != null)
        .map((o) => o.price);
      if (activePrices.length > 0) {
        sanitizedData.price = Math.min(...activePrices);
      }
    }

    // If featured is 'no', reset discount to 0
    if (sanitizedData.featured === 'no') {
      sanitizedData.discount = 0;
    }

    // If new image is uploaded, upload it and update URL
    if (file) {
      const imageUrl = await uploadImage(file.buffer, file.originalname, file.mimetype);
      sanitizedData.image = imageUrl;

      // Delete old image from storage
      if (existingProduct.image) {
        await deleteImage(existingProduct.image);
      }
    }

    // Update product
    const { data, error } = await supabase
      .from('products')
      .update(sanitizedData)
      .eq('id', id)
      .select(`
        *,
        menus:menu_id (id, name),
        categories:category_id (id, name)
      `)
      .single();

    if (error) {
      // If update fails and new image was uploaded, delete it
      if (sanitizedData.image) {
        await deleteImage(sanitizedData.image);
      }
      throw error;
    }

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: data
    });
  } catch (error) {
    console.error('Update product error:', error);
    
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'A product with this Item No already exists'
      });
    }
    
    next(error);
  }
};

// Delete product
const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if product exists
    const { data: existingProduct, error: checkError } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (checkError || !existingProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Delete product from database
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }

    // Delete image from storage
    if (existingProduct.image) {
      await deleteImage(existingProduct.image);
    }

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    next(error);
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
};