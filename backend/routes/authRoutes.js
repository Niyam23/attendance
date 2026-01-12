const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { authenticate, isAdmin } = require('../middleware/auth');

// Validation rules
const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email')
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage('Please provide a valid email'),
  body('mobileNumber')
    .optional({ checkFalsy: true })
    .matches(/^[0-9]{10}$/)
    .withMessage('Mobile number must be 10 digits'),
  body('password')
    .optional({ checkFalsy: true })
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  body('otp')
    .optional({ checkFalsy: true })
    .matches(/^[0-9]{4}$/)
    .withMessage('OTP must be 4 digits'),
  body('role')
    .optional({ checkFalsy: true })
    .isIn(['employee', 'admin'])
    .withMessage('Role must be either employee or admin')
];

const loginValidation = [
  body('email')
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage('Please provide a valid email'),
  body('mobileNumber')
    .optional({ checkFalsy: true })
    .matches(/^[0-9]{10}$/)
    .withMessage('Mobile number must be 10 digits'),
  body('password')
    .optional({ checkFalsy: true })
    .notEmpty()
    .withMessage('Password is required'),
  body('otp')
    .optional({ checkFalsy: true })
    .matches(/^[0-9]{4}$/)
    .withMessage('OTP must be 4 digits')
];

const forgotPasswordValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email')
];

const resetPasswordValidation = [
  body('token')
    .trim()
    .notEmpty()
    .withMessage('Reset token is required'),
  body('newPassword')
    .trim()
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
];

router.post('/register', registerValidation, authController.register);
router.post('/login', loginValidation, authController.login);
router.get('/me', authenticate, authController.getMe);
router.get('/users', authenticate, isAdmin, authController.getAllUsers);
router.post('/forgot-password', forgotPasswordValidation, authController.requestPasswordReset);
router.post('/reset-password', resetPasswordValidation, authController.resetPassword);

module.exports = router;

