const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const otpController = require('../controllers/otpController');

// Validation rules
const sendOtpValidation = [
  body('mobileNumber')
    .trim()
    .notEmpty()
    .withMessage('Mobile number is required')
    .isLength({ min: 10, max: 10 })
    .withMessage('Mobile number must be 10 digits')
    .matches(/^[0-9]{10}$/)
    .withMessage('Mobile number must contain only digits')
];

const verifyOtpValidation = [
  body('mobileNumber')
    .trim()
    .notEmpty()
    .withMessage('Mobile number is required')
    .isLength({ min: 10, max: 10 })
    .withMessage('Mobile number must be 10 digits')
    .matches(/^[0-9]{10}$/)
    .withMessage('Mobile number must contain only digits'),
  body('otp')
    .trim()
    .notEmpty()
    .withMessage('OTP is required')
    .isLength({ min: 4, max: 4 })
    .withMessage('OTP must be 4 digits')
    .matches(/^[0-9]{4}$/)
    .withMessage('OTP must contain only digits')
];

router.post('/send', sendOtpValidation, otpController.sendOtp);
router.post('/verify', verifyOtpValidation, otpController.verifyOtp);

module.exports = router;

