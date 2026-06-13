const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { protect, adminOnly } = require('../middlewares/authMiddleware');
const {
  getAllCustomers,
  deleteCustomer,
} = require('../controllers/adminUserContoller');

// Rate limiter for delete operations
const deleteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  message: {
    success: false,
    message: 'Too many delete requests. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// All routes require authentication + admin role
router.use(protect, adminOnly);

// GET /api/admin/users — fetch all customers
router.get('/users', getAllCustomers);

// DELETE /api/admin/users/:id — delete a customer
router.delete('/users/:id', deleteLimiter, deleteCustomer);

module.exports = router;