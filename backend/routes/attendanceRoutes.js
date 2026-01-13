const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');
const { authenticate, isAdmin } = require('../middleware/auth');

// Employee routes
router.post('/checkin', authenticate, attendanceController.checkIn);
router.post('/checkout', authenticate, attendanceController.checkOut);
router.post('/break/start', authenticate, attendanceController.startBreak);
router.post('/break/end', authenticate, attendanceController.endBreak);
router.get('/my-attendance', authenticate, attendanceController.getMyAttendance);
router.get('/today-status', authenticate, attendanceController.getTodayStatus);
router.get('/dashboard-stats', authenticate, attendanceController.getDashboardStats);

// Admin routes
router.get('/all', authenticate, isAdmin, attendanceController.getAllAttendance);

module.exports = router;

