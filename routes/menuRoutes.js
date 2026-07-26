const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menuController');
const upload = require('../middlewares/upload');
const { protect, adminOnly } = require('../middlewares/authMiddleware');

// GET /api/menus - Get all menus (public)
router.get('/', menuController.getAllMenus);

// GET /api/menus/:id - Get single menu (public)
router.get('/:id', menuController.getMenuById);

// POST /api/menus - Create new menu (admin only)
router.post('/', protect, adminOnly, upload.single('image'), menuController.createMenu);

// PUT /api/menus/:id - Update menu (admin only)
router.put('/:id', protect, adminOnly, upload.single('image'), menuController.updateMenu);

// DELETE /api/menus/:id - Delete menu (admin only)
router.delete('/:id', protect, adminOnly, menuController.deleteMenu);

// POST /api/menus/:menuId/categories - Create a category inside a menu (admin only)
router.post('/:menuId/categories', protect, adminOnly, upload.single('image'), menuController.createMenuCategory);

// PUT /api/menus/:menuId/categories/:categoryId - Update a category within a menu (admin only)
router.put('/:menuId/categories/:categoryId', protect, adminOnly, upload.single('image'), menuController.updateMenuCategory);

// DELETE /api/menus/:menuId/categories/:categoryId - Delete a category from a menu (admin only)
router.delete('/:menuId/categories/:categoryId', protect, adminOnly, menuController.deleteMenuCategory);

module.exports = router;