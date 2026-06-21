const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const upload = require('../middlewares/upload');
const { protect, adminOnly } = require('../middlewares/authMiddleware');

// GET /api/categories - Get all categories (public)
router.get('/', categoryController.getAllCategories);

// GET /api/categories/:id - Get single category (public)
router.get('/:id', categoryController.getCategoryById);

// POST /api/categories - Create new category (admin only)
router.post('/', protect, adminOnly, upload.single('image'), categoryController.createCategory);

// PUT /api/categories/:id - Update category (admin only)
router.put('/:id', protect, adminOnly, upload.single('image'), categoryController.updateCategory);

// DELETE /api/categories/:id - Delete category (admin only)
router.delete('/:id', protect, adminOnly, categoryController.deleteCategory);

module.exports = router;