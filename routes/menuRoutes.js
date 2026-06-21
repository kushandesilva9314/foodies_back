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

module.exports = router;