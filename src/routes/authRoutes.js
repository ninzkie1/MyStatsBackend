const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  getUserProfile,
  refreshToken,
  changePassword,
  logoutUser,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/refresh-token', refreshToken);

// Protected routes
router.get('/profile', protect, getUserProfile);
router.put('/change-password', protect, changePassword);
router.post('/logout', protect, logoutUser);

module.exports = router; 