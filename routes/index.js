const express = require('express');
const router = express.Router();

// Import route modules
const testRoutes = require('./testRoutes');
const menuRoutes = require('./menuRoutes');
const categoryRoutes = require('./categoryRoutes');
const productRoutes = require('./productRoutes');
const authRoutes = require('./authRoutes');
const adminRoutes = require('./adminRoutes');

// Test routes 
router.use('/', testRoutes);

// Main routes 
router.use('/menus', menuRoutes);
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);

module.exports = router;