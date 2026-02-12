const express = require('express');
const router = express.Router();
const supabase = require('../config/supabase');

// Test backend endpoint
router.get('/test', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Backend is connected!',
    timestamp: new Date().toISOString()
  });
});

// Test database connection endpoint
router.get('/test-db', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('_test_connection')
      .select('*')
      .limit(1);
    
    // If we get a specific error about table not existing, connection is good
    if (error && (error.code === 'PGRST205' || error.message.includes('does not exist'))) {
      return res.status(200).json({
        success: true,
        message: 'Database connection successful!',
        note: 'Database is connected and ready for tables',
        connectionStatus: 'Connected to Supabase'
      });
    }
    
    if (error) {
      throw error;
    }
    
    res.status(200).json({
      success: true,
      message: 'Database connection successful!',
      connectionStatus: 'Connected to Supabase',
      data: data || []
    });
  } catch (error) {
    console.error('Database connection error:', error);
    
    // If the error is about table/function not existing, connection is still good
    if (error.code === 'PGRST205' || error.code === 'PGRST202') {
      return res.status(200).json({
        success: true,
        message: 'Database connection successful!',
        note: 'Database is connected and ready for tables',
        connectionStatus: 'Connected to Supabase'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message,
      code: error.code
    });
  }
});

module.exports = router;