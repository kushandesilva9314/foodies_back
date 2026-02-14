const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menuController');
const upload = require('../middlewares/upload');

// GET /api/menus - Get all menus
router.get('/', menuController.getAllMenus);

// GET /api/menus/:id - Get single menu
router.get('/:id', menuController.getMenuById);

// POST /api/menus - Create new menu
router.post('/', upload.single('image'), menuController.createMenu);

// PUT /api/menus/:id - Update menu
router.put('/:id', upload.single('image'), menuController.updateMenu);

// DELETE /api/menus/:id - Delete menu
router.delete('/:id', menuController.deleteMenu);

module.exports = router;