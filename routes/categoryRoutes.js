const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const upload = require('../middlewares/upload');

// GET /api/categories - Get all categories
router.get('/', categoryController.getAllCategories);

// GET /api/categories/:id - Get single category
router.get('/:id', categoryController.getCategoryById);

// POST /api/categories - Create new category
// upload.single('image') tells multer to expect a file field named 'image'
router.post('/', upload.single('image'), categoryController.createCategory);

// PUT /api/categories/:id - Update category
router.put('/:id', upload.single('image'), categoryController.updateCategory);

// DELETE /api/categories/:id - Delete category
router.delete('/:id', categoryController.deleteCategory);

module.exports = router;