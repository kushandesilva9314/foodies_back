const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Test Supabase connection on startup
const supabase = require('./config/supabase');

// Import routes
const routes = require('./routes');

// Import middleware
const errorHandler = require('./middlewares/errorHandler');

// Initialize express app
const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Increase payload size limits (place BEFORE routes)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// API Routes
app.use('/api', routes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('═══════════════════════════════════════');
  console.log('Server running on port', PORT);
  console.log('Environment:', process.env.NODE_ENV);
  console.log('Health: http://localhost:' + PORT + '/health');
  console.log('API: http://localhost:' + PORT + '/api');
  console.log('═══════════════════════════════════════');
});

module.exports = app;