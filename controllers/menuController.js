const supabase = require('../config/supabase');
const { uploadImage, deleteImage } = require('../utils/imageUpload');

// Get all menus, each with its categories embedded (ordered by position)
const getAllMenus = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('menus')
      .select(`
        *,
        categories (*)
      `)
      .order('position', { ascending: true });

    if (error) throw error;

    // Sort each menu's embedded categories by position
    const sorted = data.map((menu) => ({
      ...menu,
      categories: (menu.categories || []).sort((a, b) => a.position - b.position)
    }));

    res.status(200).json({
      success: true,
      count: sorted.length,
      data: sorted
    });
  } catch (error) {
    console.error('Get all menus error:', error);
    next(error);
  }
};

// Get single menu by ID, with its categories embedded
const getMenuById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('menus')
      .select(`*, categories (*)`)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ success: false, message: 'Menu not found' });
      }
      throw error;
    }

    data.categories = (data.categories || []).sort((a, b) => a.position - b.position);

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Get menu by ID error:', error);
    next(error);
  }
};

// ---------- Menu CRUD (unchanged from before) ----------

const createMenu = async (req, res, next) => {
  try {
    const { name, position } = req.body;
    const file = req.file;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Menu name is required' });
    }
    if (!file) {
      return res.status(400).json({ success: false, message: 'Menu image is required' });
    }

    const { data: existingMenu } = await supabase
      .from('menus')
      .select('id')
      .ilike('name', name.trim())
      .maybeSingle();

    if (existingMenu) {
      return res.status(409).json({
        success: false,
        message: `A menu with the name "${name.trim()}" already exists`
      });
    }

    const { data: maxRow } = await supabase
      .from('menus')
      .select('position')
      .order('position', { ascending: false })
      .limit(1)
      .maybeSingle();

    const maxPos = maxRow?.position || 0;
    let finalPosition = maxPos + 1;

    if (position !== undefined && position !== null && position !== '') {
      const requestedPos = parseInt(position, 10);
      if (isNaN(requestedPos) || requestedPos < 1 || requestedPos > maxPos + 1) {
        return res.status(400).json({
          success: false,
          message: `Position must be between 1 and ${maxPos + 1}`
        });
      }
      finalPosition = requestedPos;
      if (finalPosition <= maxPos) {
        const { error: shiftError } = await supabase.rpc('shift_menu_positions_up', {
          from_position: finalPosition
        });
        if (shiftError) throw shiftError;
      }
    }

    const imageUrl = await uploadImage(file.buffer, file.originalname, file.mimetype);

    const { data, error } = await supabase
      .from('menus')
      .insert([{ name: name.trim(), image: imageUrl, position: finalPosition }])
      .select()
      .single();

    if (error) {
      await deleteImage(imageUrl);
      throw error;
    }

    res.status(201).json({ success: true, message: 'Menu created successfully', data });
  } catch (error) {
    console.error('Create menu error:', error);
    if (error.code === '23505') {
      return res.status(409).json({ success: false, message: 'A menu with this name already exists' });
    }
    next(error);
  }
};

const updateMenu = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, position } = req.body;
    const file = req.file;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Menu name is required' });
    }

    const { data: existingMenu, error: checkError } = await supabase
      .from('menus')
      .select('*')
      .eq('id', id)
      .single();

    if (checkError || !existingMenu) {
      return res.status(404).json({ success: false, message: 'Menu not found' });
    }

    const { data: duplicateMenu } = await supabase
      .from('menus')
      .select('id')
      .ilike('name', name.trim())
      .neq('id', id)
      .maybeSingle();

    if (duplicateMenu) {
      return res.status(409).json({
        success: false,
        message: `A menu with the name "${name.trim()}" already exists`
      });
    }

    if (position !== undefined && position !== null && position !== '') {
      const requestedPos = parseInt(position, 10);
      const oldPos = existingMenu.position;

      const { count } = await supabase
        .from('menus')
        .select('id', { count: 'exact', head: true });

      if (isNaN(requestedPos) || requestedPos < 1 || requestedPos > count) {
        return res.status(400).json({
          success: false,
          message: `Position must be between 1 and ${count}`
        });
      }

      if (requestedPos !== oldPos) {
        if (requestedPos < oldPos) {
          const { error: shiftError } = await supabase.rpc('shift_menu_range_up', {
            from_position: requestedPos,
            to_position: oldPos - 1
          });
          if (shiftError) throw shiftError;
        } else {
          const { error: shiftError } = await supabase.rpc('shift_menu_range_down', {
            from_position: oldPos + 1,
            to_position: requestedPos
          });
          if (shiftError) throw shiftError;
        }
      }
    }

    const updateData = { name: name.trim() };
    if (position !== undefined && position !== null && position !== '') {
      updateData.position = parseInt(position, 10);
    }

    if (file) {
      const imageUrl = await uploadImage(file.buffer, file.originalname, file.mimetype);
      updateData.image = imageUrl;
      if (existingMenu.image) await deleteImage(existingMenu.image);
    }

    const { data, error } = await supabase
      .from('menus')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (updateData.image) await deleteImage(updateData.image);
      throw error;
    }

    res.status(200).json({ success: true, message: 'Menu updated successfully', data });
  } catch (error) {
    console.error('Update menu error:', error);
    if (error.code === '23505') {
      return res.status(409).json({ success: false, message: 'A menu with this name already exists' });
    }
    next(error);
  }
};

const deleteMenu = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: existingMenu, error: checkError } = await supabase
      .from('menus')
      .select('*, categories (image)')
      .eq('id', id)
      .single();

    if (checkError || !existingMenu) {
      return res.status(404).json({ success: false, message: 'Menu not found' });
    }

    const deletedPosition = existingMenu.position;
    const categoryImages = (existingMenu.categories || []).map((c) => c.image);

    // Deleting the menu cascades to its categories automatically (DB-level)
    const { error } = await supabase.from('menus').delete().eq('id', id);
    if (error) throw error;

    if (existingMenu.image) await deleteImage(existingMenu.image);
    for (const img of categoryImages) {
      if (img) await deleteImage(img);
    }

    if (deletedPosition) {
      const { error: shiftError } = await supabase.rpc('shift_menu_positions_down', {
        from_position: deletedPosition
      });
      if (shiftError) throw shiftError;
    }

    res.status(200).json({ success: true, message: 'Menu deleted successfully' });
  } catch (error) {
    console.error('Delete menu error:', error);
    next(error);
  }
};

// ---------- Categories, embedded within a menu ----------

// Create a category inside a specific menu
const createMenuCategory = async (req, res, next) => {
  try {
    const { menuId } = req.params;
    const { name, position } = req.body;
    const file = req.file;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }
    if (!file) {
      return res.status(400).json({ success: false, message: 'Category image is required' });
    }

    const { data: menu } = await supabase.from('menus').select('id').eq('id', menuId).single();
    if (!menu) {
      return res.status(404).json({ success: false, message: 'Menu not found' });
    }

    const { data: existingCategory } = await supabase
      .from('categories')
      .select('id')
      .eq('menu_id', menuId)
      .ilike('name', name.trim())
      .maybeSingle();

    if (existingCategory) {
      return res.status(409).json({
        success: false,
        message: `A category named "${name.trim()}" already exists in this menu`
      });
    }

    const { data: maxRow } = await supabase
      .from('categories')
      .select('position')
      .eq('menu_id', menuId)
      .order('position', { ascending: false })
      .limit(1)
      .maybeSingle();

    const maxPos = maxRow?.position || 0;
    let finalPosition = maxPos + 1;

    if (position !== undefined && position !== null && position !== '') {
      const requestedPos = parseInt(position, 10);
      if (isNaN(requestedPos) || requestedPos < 1 || requestedPos > maxPos + 1) {
        return res.status(400).json({
          success: false,
          message: `Position must be between 1 and ${maxPos + 1}`
        });
      }
      finalPosition = requestedPos;
      if (finalPosition <= maxPos) {
        const { error: shiftError } = await supabase.rpc('shift_menu_category_positions_up', {
          mid: menuId,
          from_position: finalPosition
        });
        if (shiftError) throw shiftError;
      }
    }

    const imageUrl = await uploadImage(file.buffer, file.originalname, file.mimetype);

    const { data, error } = await supabase
      .from('categories')
      .insert([{ menu_id: menuId, name: name.trim(), image: imageUrl, position: finalPosition }])
      .select()
      .single();

    if (error) {
      await deleteImage(imageUrl);
      throw error;
    }

    res.status(201).json({ success: true, message: 'Category created successfully', data });
  } catch (error) {
    console.error('Create menu category error:', error);
    next(error);
  }
};

// Update a category within its menu (name, image, or position)
const updateMenuCategory = async (req, res, next) => {
  try {
    const { menuId, categoryId } = req.params;
    const { name, position } = req.body;
    const file = req.file;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }

    const { data: existingCategory, error: checkError } = await supabase
      .from('categories')
      .select('*')
      .eq('id', categoryId)
      .eq('menu_id', menuId)
      .single();

    if (checkError || !existingCategory) {
      return res.status(404).json({ success: false, message: 'Category not found in this menu' });
    }

    const { data: duplicateCategory } = await supabase
      .from('categories')
      .select('id')
      .eq('menu_id', menuId)
      .ilike('name', name.trim())
      .neq('id', categoryId)
      .maybeSingle();

    if (duplicateCategory) {
      return res.status(409).json({
        success: false,
        message: `A category named "${name.trim()}" already exists in this menu`
      });
    }

    if (position !== undefined && position !== null && position !== '') {
      const requestedPos = parseInt(position, 10);
      const oldPos = existingCategory.position;

      const { count } = await supabase
        .from('categories')
        .select('id', { count: 'exact', head: true })
        .eq('menu_id', menuId);

      if (isNaN(requestedPos) || requestedPos < 1 || requestedPos > count) {
        return res.status(400).json({
          success: false,
          message: `Position must be between 1 and ${count}`
        });
      }

      if (requestedPos !== oldPos) {
        if (requestedPos < oldPos) {
          const { error: shiftError } = await supabase.rpc('shift_menu_category_range_up', {
            mid: menuId,
            from_position: requestedPos,
            to_position: oldPos - 1
          });
          if (shiftError) throw shiftError;
        } else {
          const { error: shiftError } = await supabase.rpc('shift_menu_category_range_down', {
            mid: menuId,
            from_position: oldPos + 1,
            to_position: requestedPos
          });
          if (shiftError) throw shiftError;
        }
      }
    }

    const updateData = { name: name.trim() };
    if (position !== undefined && position !== null && position !== '') {
      updateData.position = parseInt(position, 10);
    }

    if (file) {
      const imageUrl = await uploadImage(file.buffer, file.originalname, file.mimetype);
      updateData.image = imageUrl;
      if (existingCategory.image) await deleteImage(existingCategory.image);
    }

    const { data, error } = await supabase
      .from('categories')
      .update(updateData)
      .eq('id', categoryId)
      .select()
      .single();

    if (error) {
      if (updateData.image) await deleteImage(updateData.image);
      throw error;
    }

    res.status(200).json({ success: true, message: 'Category updated successfully', data });
  } catch (error) {
    console.error('Update menu category error:', error);
    next(error);
  }
};

// Delete a category from its menu
const deleteMenuCategory = async (req, res, next) => {
  try {
    const { menuId, categoryId } = req.params;

    const { data: existingCategory, error: checkError } = await supabase
      .from('categories')
      .select('*')
      .eq('id', categoryId)
      .eq('menu_id', menuId)
      .single();

    if (checkError || !existingCategory) {
      return res.status(404).json({ success: false, message: 'Category not found in this menu' });
    }

    const deletedPosition = existingCategory.position;

    const { error } = await supabase.from('categories').delete().eq('id', categoryId);
    if (error) throw error;

    if (existingCategory.image) await deleteImage(existingCategory.image);

    if (deletedPosition) {
      const { error: shiftError } = await supabase.rpc('shift_menu_category_positions_down', {
        mid: menuId,
        from_position: deletedPosition
      });
      if (shiftError) throw shiftError;
    }

    res.status(200).json({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Delete menu category error:', error);
    next(error);
  }
};

module.exports = {
  getAllMenus,
  getMenuById,
  createMenu,
  updateMenu,
  deleteMenu,
  createMenuCategory,
  updateMenuCategory,
  deleteMenuCategory
};