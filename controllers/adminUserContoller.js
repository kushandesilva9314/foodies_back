const UserModel = require('../models/userModel');
const RefreshTokenModel = require('../models/refreshTokenModel');

/**
 * GET /api/admin/users
 * Get all customers (excludes admins)
 */
const getAllCustomers = async (req, res, next) => {
  try {
    const customers = await UserModel.getAllCustomers();

    return res.status(200).json({
      success: true,
      message: 'Customers retrieved successfully.',
      data: customers,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/admin/users/:id
 * Delete a customer by ID (cannot delete admins)
 */
const deleteCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;

    // 1. Find user
    const user = await UserModel.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found.',
      });
    }

    // 2. Prevent deleting admin accounts
    if (user.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin accounts cannot be deleted.',
      });
    }

    // 3. Prevent admin from deleting themselves (extra safety)
    if (user.id === req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You cannot delete your own account.',
      });
    }

    // 4. Invalidate all refresh tokens for this user
    await RefreshTokenModel.deleteAllByUserId(id);

    // 5. Delete user
    await UserModel.deleteById(id);

    return res.status(200).json({
      success: true,
      message: `Customer "${user.name}" has been deleted successfully.`,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllCustomers,
  deleteCustomer,
};