const express = require('express');
const router = express.Router();

// Import route modules
const testRoutes = require('./testRoutes');
// const menuRoutes = require('./menuRoutes');
// const categoryRoutes = require('./categoryRoutes');
// const productRoutes = require('./productRoutes');

// Test routes (can be removed in production)
router.use('/', testRoutes);

// Main routes (uncomment when ready)
// router.use('/menus', menuRoutes);
// router.use('/categories', categoryRoutes);
// router.use('/products', productRoutes);

module.exports = router;