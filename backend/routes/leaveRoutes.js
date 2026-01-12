const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const leaveController = require('../controllers/leaveController');
const adminLeaveController = require('../controllers/adminLeaveController');
const { authenticate, isAdmin } = require('../middleware/auth');
const { validationResult } = require('express-validator');

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Validation rules for leave request
const requestLeaveValidation = [
  body('leaveType')
    .notEmpty()
    .withMessage('Leave type is required')
    .isIn(['sick', 'casual', 'annual', 'maternity', 'paternity', 'compensatory', 'unpaid'])
    .withMessage('Invalid leave type'),
  body('startDate')
    .notEmpty()
    .withMessage('Start date is required')
    .isISO8601()
    .withMessage('Start date must be a valid date (YYYY-MM-DD)'),
  body('endDate')
    .notEmpty()
    .withMessage('End date is required')
    .isISO8601()
    .withMessage('End date must be a valid date (YYYY-MM-DD)')
    .custom((endDate, { req }) => {
      if (new Date(endDate) < new Date(req.body.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  body('reason')
    .trim()
    .notEmpty()
    .withMessage('Reason is required')
    .isLength({ min: 10 })
    .withMessage('Reason must be at least 10 characters long')
];

// Validation rules for reject leave
const rejectLeaveValidation = [
  body('rejectionReason')
    .trim()
    .notEmpty()
    .withMessage('Rejection reason is required')
    .isLength({ min: 10 })
    .withMessage('Rejection reason must be at least 10 characters long')
];

// Employee routes
router.post('/request', authenticate, requestLeaveValidation, handleValidationErrors, leaveController.requestLeave);
router.get('/my-requests', authenticate, leaveController.getMyLeaveRequests);
router.get('/my-requests/:id', authenticate, leaveController.getLeaveRequest);
router.put('/my-requests/:id/cancel', authenticate, leaveController.cancelLeaveRequest);
router.get('/balance', authenticate, leaveController.getLeaveBalance);
router.get('/stats', authenticate, leaveController.getLeaveStatistics);

// Admin/Manager routes
router.get('/pending', authenticate, isAdmin, leaveController.getPendingLeaveRequests);
router.put('/pending/:id/approve', authenticate, isAdmin, leaveController.approveLeaveRequest);
router.put('/pending/:id/reject', authenticate, isAdmin, rejectLeaveValidation, handleValidationErrors, leaveController.rejectLeaveRequest);
router.get('/all', authenticate, isAdmin, leaveController.getAllLeaveRequests);
router.get('/calendar', authenticate, leaveController.getLeaveCalendar);
router.get('/stats/admin', authenticate, isAdmin, leaveController.getAdminLeaveStatistics);
router.get('/team-availability', authenticate, leaveController.getTeamAvailability);

// Admin Leave Management Routes
router.post('/admin/create', authenticate, isAdmin, adminLeaveController.createLeaveManually);
router.put('/admin/edit/:id', authenticate, isAdmin, adminLeaveController.editLeaveRequest);
router.put('/admin/cancel/:id', authenticate, isAdmin, adminLeaveController.cancelApprovedLeave);
router.post('/admin/initialize-balance/:userId', authenticate, isAdmin, adminLeaveController.initializeLeaveBalance);
router.get('/admin/all-balances', authenticate, isAdmin, adminLeaveController.getAllEmployeeBalances);
router.post('/admin/adjust-balance', authenticate, isAdmin, adminLeaveController.adjustLeaveBalance);
router.post('/admin/bulk-action', authenticate, isAdmin, adminLeaveController.bulkApproveReject);
router.get('/admin/employees-on-leave', authenticate, isAdmin, adminLeaveController.getEmployeesOnLeave);
router.get('/admin/export', authenticate, isAdmin, adminLeaveController.exportLeaveData);

// Public Holidays Routes
router.post('/admin/holidays', authenticate, isAdmin, adminLeaveController.createPublicHoliday);
router.get('/admin/holidays', authenticate, isAdmin, adminLeaveController.getPublicHolidays);
router.put('/admin/holidays/:id', authenticate, isAdmin, adminLeaveController.updatePublicHoliday);
router.delete('/admin/holidays/:id', authenticate, isAdmin, adminLeaveController.deletePublicHoliday);

// Default Allocations Route
router.get('/admin/default-allocations', authenticate, isAdmin, adminLeaveController.getDefaultLeaveAllocations);

module.exports = router;
