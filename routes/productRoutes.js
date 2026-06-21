const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const upload = require('../middlewares/upload');
const { protect, adminOnly } = require('../middlewares/authMiddleware');

// GET /api/products - Get all products (public)
router.get('/', productController.getAllProducts);

// GET /api/products/:id - Get single product (public)
router.get('/:id', productController.getProductById);

// POST /api/products - Create new product (admin only)
router.post('/', protect, adminOnly, upload.single('image'), productController.createProduct);

// PUT /api/products/:id - Update product (admin only)
router.put('/:id', protect, adminOnly, upload.single('image'), productController.updateProduct);

// DELETE /api/products/:id - Delete product (admin only)
router.delete('/:id', protect, adminOnly, productController.deleteProduct);

module.exports = router;