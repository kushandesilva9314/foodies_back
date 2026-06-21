const express = require('express');
const router = express.Router();

// Import route modules
const menuRoutes = require('./menuRoutes');
const categoryRoutes = require('./categoryRoutes');
const productRoutes = require('./productRoutes');
const authRoutes = require('./authRoutes');
const adminRoutes = require('./adminRoutes');

// Main routes 
router.use('/menus', menuRoutes);
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);

module.exports = router;