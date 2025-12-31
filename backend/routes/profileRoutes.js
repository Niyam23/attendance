const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const profileController = require('../controllers/profileController');
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Validation rules for profile update
const updateProfileValidation = [
  body('fullName')
    .optional({ checkFalsy: true })
    .trim()
    .notEmpty()
    .withMessage('Full name cannot be empty'),
  body('email')
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage('Please provide a valid email'),
  body('phone')
    .optional({ checkFalsy: true })
    .matches(/^[0-9]{10}$/)
    .withMessage('Phone number must be 10 digits'),
  body('username')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 3 })
    .withMessage('Username must be at least 3 characters'),
  body('otp')
    .optional({ checkFalsy: true })
    .matches(/^[0-9]{4}$/)
    .withMessage('OTP must be 4 digits'),
  body('gender')
    .optional({ checkFalsy: true })
    .isIn(['male', 'female', 'other'])
    .withMessage('Gender must be male, female, or other'),
  body('dateOfBirth')
    .optional({ checkFalsy: true })
    .isISO8601()
    .withMessage('Date of birth must be a valid date'),
  body('maritalStatus')
    .optional({ checkFalsy: true })
    .isIn(['single', 'married', 'divorced', 'widowed'])
    .withMessage('Marital status must be single, married, divorced, or widowed')
];

const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
];

router.get('/me', authenticate, profileController.getProfile);
router.put('/update', authenticate, upload, updateProfileValidation, profileController.updateProfile);
router.put('/change-password', authenticate, changePasswordValidation, profileController.changePassword);
router.get('/preferences', authenticate, profileController.getPreferences);
router.put('/preferences', authenticate, profileController.updatePreferences);

module.exports = router;

