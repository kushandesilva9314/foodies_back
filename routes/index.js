const express = require('express');
const router = express.Router();

// Import route modules
const testRoutes = require('./testRoutes');
const menuRoutes = require('./menuRoutes');
const categoryRoutes = require('./categoryRoutes');
const productRoutes = require('./productRoutes');
const authRoutes = require('./authRoutes');

// Test routes 
router.use('/', testRoutes);

// Main routes 
router.use('/menus', menuRoutes);
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/auth', authRoutes);

module.exports = router;