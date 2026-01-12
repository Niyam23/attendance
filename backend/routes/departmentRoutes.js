const express = require('express');
const router = express.Router();
const departmentController = require('../controllers/departmentController');
const { authenticate, isAdmin } = require('../middleware/auth');

// Public routes (for getting departments - employees might need to see department list)
router.get('/', departmentController.getAllDepartments);
router.get('/:id', departmentController.getDepartmentById);

// Admin only routes
router.post('/', authenticate, isAdmin, departmentController.createDepartment);
router.put('/:id', authenticate, isAdmin, departmentController.updateDepartment);
router.delete('/:id', authenticate, isAdmin, departmentController.deleteDepartment);
router.post('/seed/default', authenticate, isAdmin, departmentController.seedDepartments);

module.exports = router;
