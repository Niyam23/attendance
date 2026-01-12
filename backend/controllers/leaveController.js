const { LeaveRequest, LeaveBalance, LeaveHistory, User, PublicHoliday } = require('../models');
const { Op } = require('sequelize');
const {
  calculateWorkingDays,
  checkLeaveBalance,
  checkOverlappingRequests,
  deductLeaveBalance,
  refundLeaveBalance,
  recalculateLeaveBalance
} = require('../utils/leaveHelpers');

// Create leave request
exports.requestLeave = async (req, res) => {
  try {
    const userId = req.user.id;
    const { leaveType, startDate, endDate, reason, attachments } = req.body;

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (start < today) {
      return res.status(400).json({ message: 'Start date cannot be in the past' });
    }

    if (end < start) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }

    // Calculate working days (excluding weekends)
    const totalDays = calculateWorkingDays(startDate, endDate);

    if (totalDays <= 0) {
      return res.status(400).json({ message: 'No working days in the selected date range' });
    }

    // Check leave balance
    const year = start.getFullYear();
    const balanceCheck = await checkLeaveBalance(userId, leaveType, totalDays, year);

    if (!balanceCheck.hasBalance) {
      return res.status(400).json({
        message: balanceCheck.message,
        available: balanceCheck.available,
        requested: totalDays
      });
    }

    // Check for overlapping requests
    const overlapCheck = await checkOverlappingRequests(userId, startDate, endDate);

    if (overlapCheck.hasOverlap) {
      return res.status(400).json({
        message: 'You have an overlapping leave request that is pending or approved',
        overlappingRequest: {
          id: overlapCheck.overlappingRequest.id,
          startDate: overlapCheck.overlappingRequest.startDate,
          endDate: overlapCheck.overlappingRequest.endDate,
          status: overlapCheck.overlappingRequest.status
        }
      });
    }

    // Create leave request
    const leaveRequest = await LeaveRequest.create({
      userId,
      leaveType,
      startDate,
      endDate,
      totalDays,
      reason,
      status: 'pending',
      attachments: attachments || null
    });

    // Create history record
    await LeaveHistory.create({
      leaveRequestId: leaveRequest.id,
      userId,
      action: 'requested',
      performedBy: userId,
      newStatus: 'pending',
      notes: 'Leave request created'
    });

    // Fetch with user details
    const requestWithDetails = await LeaveRequest.findByPk(leaveRequest.id, {
      include: [
        { model: User, as: 'employee', attributes: ['id', 'name', 'email', 'employeeId'] }
      ]
    });

    res.status(201).json({
      message: 'Leave request submitted successfully',
      leaveRequest: requestWithDetails
    });
  } catch (error) {
    console.error('Request leave error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get my leave requests
exports.getMyLeaveRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, leaveType, startDate, endDate, page = 1, limit = 10 } = req.query;

    const where = { userId };

    if (status) {
      where.status = status;
    }

    if (leaveType) {
      where.leaveType = leaveType;
    }

    if (startDate || endDate) {
      where[Op.or] = [
        {
          startDate: {
            [Op.between]: [startDate || '1900-01-01', endDate || '2099-12-31']
          }
        },
        {
          endDate: {
            [Op.between]: [startDate || '1900-01-01', endDate || '2099-12-31']
          }
        }
      ];
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await LeaveRequest.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [
        {
          model: User,
          as: 'approver',
          attributes: ['id', 'name', 'email'],
          required: false
        },
        {
          model: User,
          as: 'rejecter',
          attributes: ['id', 'name', 'email'],
          required: false
        }
      ]
    });

    res.json({
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(count / limit),
      leaveRequests: rows
    });
  } catch (error) {
    console.error('Get my leave requests error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get single leave request
exports.getLeaveRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const leaveRequest = await LeaveRequest.findByPk(id, {
      include: [
        {
          model: User,
          as: 'employee',
          attributes: ['id', 'name', 'email', 'employeeId', 'profilePhoto']
        },
        {
          model: User,
          as: 'approver',
          attributes: ['id', 'name', 'email'],
          required: false
        },
        {
          model: User,
          as: 'rejecter',
          attributes: ['id', 'name', 'email'],
          required: false
        },
        {
          model: LeaveHistory,
          as: 'history',
          include: [
            {
              model: User,
              as: 'performer',
              attributes: ['id', 'name', 'email']
            }
          ],
          order: [['createdAt', 'ASC']]
        }
      ]
    });

    if (!leaveRequest) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    // Check if user owns this request or is admin
    if (leaveRequest.userId !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(leaveRequest);
  } catch (error) {
    console.error('Get leave request error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Cancel leave request
exports.cancelLeaveRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const leaveRequest = await LeaveRequest.findByPk(id);

    if (!leaveRequest) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    if (leaveRequest.userId !== userId) {
      return res.status(403).json({ message: 'You can only cancel your own leave requests' });
    }

    if (leaveRequest.status !== 'pending') {
      return res.status(400).json({
        message: `Cannot cancel leave request with status: ${leaveRequest.status}. Only pending requests can be cancelled.`
      });
    }

    const previousStatus = leaveRequest.status;
    leaveRequest.status = 'cancelled';
    await leaveRequest.save();

    // Create history record
    await LeaveHistory.create({
      leaveRequestId: leaveRequest.id,
      userId,
      action: 'cancelled',
      performedBy: userId,
      previousStatus,
      newStatus: 'cancelled',
      notes: 'Leave request cancelled by employee'
    });

    res.json({
      message: 'Leave request cancelled successfully',
      leaveRequest
    });
  } catch (error) {
    console.error('Cancel leave request error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get leave balance
exports.getLeaveBalance = async (req, res) => {
  try {
    const userId = req.user.id;
    const { year = new Date().getFullYear() } = req.query;

    const balances = await LeaveBalance.findAll({
      where: {
        userId,
        year: parseInt(year)
      },
      order: [['leaveType', 'ASC']]
    });

    // Recalculate balances to ensure accuracy
    for (const balance of balances) {
      await recalculateLeaveBalance(userId, balance.leaveType, year);
    }

    // Fetch updated balances
    const updatedBalances = await LeaveBalance.findAll({
      where: {
        userId,
        year: parseInt(year)
      },
      order: [['leaveType', 'ASC']]
    });

    res.json({
      year: parseInt(year),
      balances: updatedBalances
    });
  } catch (error) {
    console.error('Get leave balance error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get pending leave requests (admin/manager)
exports.getPendingLeaveRequests = async (req, res) => {
  try {
    const { userId, leaveType, page = 1, limit = 10 } = req.query;

    const where = { status: 'pending' };

    if (userId) {
      where.userId = userId;
    }

    if (leaveType) {
      where.leaveType = leaveType;
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await LeaveRequest.findAndCountAll({
      where,
      order: [['createdAt', 'ASC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [
        {
          model: User,
          as: 'employee',
          attributes: ['id', 'name', 'email', 'employeeId', 'profilePhoto']
        }
      ]
    });

    res.json({
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(count / limit),
      leaveRequests: rows
    });
  } catch (error) {
    console.error('Get pending leave requests error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Approve leave request
exports.approveLeaveRequest = async (req, res) => {
  try {
    const approverId = req.user.id;
    const { id } = req.params;

    const leaveRequest = await LeaveRequest.findByPk(id, {
      include: [
        {
          model: User,
          as: 'employee',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!leaveRequest) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    if (leaveRequest.status !== 'pending') {
      return res.status(400).json({
        message: `Cannot approve leave request with status: ${leaveRequest.status}`
      });
    }

    // Re-check balance before approving
    const year = new Date(leaveRequest.startDate).getFullYear();
    const balanceCheck = await checkLeaveBalance(
      leaveRequest.userId,
      leaveRequest.leaveType,
      leaveRequest.totalDays,
      year
    );

    if (!balanceCheck.hasBalance) {
      return res.status(400).json({
        message: balanceCheck.message,
        available: balanceCheck.available,
        requested: leaveRequest.totalDays
      });
    }

    // Update leave request
    const previousStatus = leaveRequest.status;
    leaveRequest.status = 'approved';
    leaveRequest.approvedBy = approverId;
    leaveRequest.approvedAt = new Date();
    await leaveRequest.save();

    // Deduct from balance
    await deductLeaveBalance(
      leaveRequest.userId,
      leaveRequest.leaveType,
      leaveRequest.totalDays,
      year
    );

    // Create history record
    await LeaveHistory.create({
      leaveRequestId: leaveRequest.id,
      userId: leaveRequest.userId,
      action: 'approved',
      performedBy: approverId,
      previousStatus,
      newStatus: 'approved',
      notes: 'Leave request approved'
    });

    // Fetch updated request with details
    const updatedRequest = await LeaveRequest.findByPk(id, {
      include: [
        {
          model: User,
          as: 'employee',
          attributes: ['id', 'name', 'email', 'employeeId']
        },
        {
          model: User,
          as: 'approver',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    res.json({
      message: 'Leave request approved successfully',
      leaveRequest: updatedRequest
    });
  } catch (error) {
    console.error('Approve leave request error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Reject leave request
exports.rejectLeaveRequest = async (req, res) => {
  try {
    const rejecterId = req.user.id;
    const { id } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason || rejectionReason.trim() === '') {
      return res.status(400).json({ message: 'Rejection reason is required' });
    }

    const leaveRequest = await LeaveRequest.findByPk(id);

    if (!leaveRequest) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    if (leaveRequest.status !== 'pending') {
      return res.status(400).json({
        message: `Cannot reject leave request with status: ${leaveRequest.status}`
      });
    }

    // Update leave request
    const previousStatus = leaveRequest.status;
    leaveRequest.status = 'rejected';
    leaveRequest.rejectedBy = rejecterId;
    leaveRequest.rejectedAt = new Date();
    leaveRequest.rejectionReason = rejectionReason;
    await leaveRequest.save();

    // Create history record
    await LeaveHistory.create({
      leaveRequestId: leaveRequest.id,
      userId: leaveRequest.userId,
      action: 'rejected',
      performedBy: rejecterId,
      previousStatus,
      newStatus: 'rejected',
      notes: `Rejection reason: ${rejectionReason}`
    });

    // Fetch updated request with details
    const updatedRequest = await LeaveRequest.findByPk(id, {
      include: [
        {
          model: User,
          as: 'employee',
          attributes: ['id', 'name', 'email', 'employeeId']
        },
        {
          model: User,
          as: 'rejecter',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    res.json({
      message: 'Leave request rejected successfully',
      leaveRequest: updatedRequest
    });
  } catch (error) {
    console.error('Reject leave request error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all leave requests (admin)
exports.getAllLeaveRequests = async (req, res) => {
  try {
    const { status, userId, leaveType, startDate, endDate, page = 1, limit = 10 } = req.query;

    const where = {};

    if (status) {
      where.status = status;
    }

    if (userId) {
      where.userId = userId;
    }

    if (leaveType) {
      where.leaveType = leaveType;
    }

    if (startDate || endDate) {
      where[Op.or] = [
        {
          startDate: {
            [Op.between]: [startDate || '1900-01-01', endDate || '2099-12-31']
          }
        },
        {
          endDate: {
            [Op.between]: [startDate || '1900-01-01', endDate || '2099-12-31']
          }
        }
      ];
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await LeaveRequest.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [
        {
          model: User,
          as: 'employee',
          attributes: ['id', 'name', 'email', 'employeeId', 'profilePhoto']
        },
        {
          model: User,
          as: 'approver',
          attributes: ['id', 'name', 'email'],
          required: false
        },
        {
          model: User,
          as: 'rejecter',
          attributes: ['id', 'name', 'email'],
          required: false
        }
      ]
    });

    res.json({
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(count / limit),
      leaveRequests: rows
    });
  } catch (error) {
    console.error('Get all leave requests error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get leave calendar
exports.getLeaveCalendar = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'startDate and endDate are required' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const leaveRequests = await LeaveRequest.findAll({
      where: {
        status: 'approved',
        [Op.or]: [
          {
            startDate: { [Op.lte]: end.toISOString().split('T')[0] },
            endDate: { [Op.gte]: start.toISOString().split('T')[0] }
          }
        ]
      },
      include: [
        {
          model: User,
          as: 'employee',
          attributes: ['id', 'name', 'email', 'employeeId', 'profilePhoto']
        }
      ],
      order: [['startDate', 'ASC']]
    });

    // Group by date
    const calendar = {};
    leaveRequests.forEach(request => {
      const start = new Date(request.startDate);
      const end = new Date(request.endDate);

      let currentDate = new Date(start);
      while (currentDate <= end) {
        const dateKey = currentDate.toISOString().split('T')[0];
        if (!calendar[dateKey]) {
          calendar[dateKey] = [];
        }
        calendar[dateKey].push({
          id: request.id,
          userId: request.userId,
          employee: request.employee,
          leaveType: request.leaveType,
          startDate: request.startDate,
          endDate: request.endDate
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }
    });

    res.json({
      startDate,
      endDate,
      calendar
    });
  } catch (error) {
    console.error('Get leave calendar error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get leave statistics (employee)
exports.getLeaveStatistics = async (req, res) => {
  try {
    const userId = req.user.id;
    const { year = new Date().getFullYear() } = req.query;

    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999);

    const allRequests = await LeaveRequest.findAll({
      where: {
        userId,
        startDate: {
          [Op.gte]: yearStart.toISOString().split('T')[0],
          [Op.lte]: yearEnd.toISOString().split('T')[0]
        }
      }
    });

    const stats = {
      total: allRequests.length,
      pending: allRequests.filter(r => r.status === 'pending').length,
      approved: allRequests.filter(r => r.status === 'approved').length,
      rejected: allRequests.filter(r => r.status === 'rejected').length,
      cancelled: allRequests.filter(r => r.status === 'cancelled').length,
      byType: {},
      totalDaysUsed: 0
    };

    allRequests.forEach(request => {
      if (!stats.byType[request.leaveType]) {
        stats.byType[request.leaveType] = {
          total: 0,
          approved: 0,
          days: 0
        };
      }
      stats.byType[request.leaveType].total++;
      if (request.status === 'approved') {
        stats.byType[request.leaveType].approved++;
        stats.byType[request.leaveType].days += parseFloat(request.totalDays);
        stats.totalDaysUsed += parseFloat(request.totalDays);
      }
    });

    res.json({
      year: parseInt(year),
      statistics: stats
    });
  } catch (error) {
    console.error('Get leave statistics error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get admin leave statistics
exports.getAdminLeaveStatistics = async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;

    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999);

    const allRequests = await LeaveRequest.findAll({
      where: {
        startDate: {
          [Op.gte]: yearStart.toISOString().split('T')[0],
          [Op.lte]: yearEnd.toISOString().split('T')[0]
        }
      },
      include: [
        {
          model: User,
          as: 'employee',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    const stats = {
      total: allRequests.length,
      pending: allRequests.filter(r => r.status === 'pending').length,
      approved: allRequests.filter(r => r.status === 'approved').length,
      rejected: allRequests.filter(r => r.status === 'rejected').length,
      cancelled: allRequests.filter(r => r.status === 'cancelled').length,
      byType: {},
      totalEmployees: new Set(allRequests.map(r => r.userId)).size
    };

    allRequests.forEach(request => {
      if (!stats.byType[request.leaveType]) {
        stats.byType[request.leaveType] = {
          total: 0,
          approved: 0,
          days: 0
        };
      }
      stats.byType[request.leaveType].total++;
      if (request.status === 'approved') {
        stats.byType[request.leaveType].approved++;
        stats.byType[request.leaveType].days += parseFloat(request.totalDays);
      }
    });

    res.json({
      year: parseInt(year),
      statistics: stats
    });
  } catch (error) {
    console.error('Get admin leave statistics error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get team availability (all employees with their current leave status)
// Employees see only themselves, Admins see all employees
exports.getTeamAvailability = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    // Build where clause based on user role
    const whereClause = {
      role: 'employee'
    };

    // If user is employee, show only themselves
    // If user is admin, show all employees
    if (userRole === 'employee') {
      whereClause.id = userId;
    }

    // Get employees based on role
    const employees = await User.findAll({
      where: whereClause,
      attributes: ['id', 'name', 'email', 'employeeId', 'profilePhoto'],
      order: [['name', 'ASC']]
    });

    // Get employee IDs to check for leaves
    const employeeIds = employees.map(e => e.id);

    // Get all approved leaves that are active today for these employees
    const activeLeaves = await LeaveRequest.findAll({
      where: {
        userId: { [Op.in]: employeeIds },
        status: 'approved',
        startDate: { [Op.lte]: todayStr },
        endDate: { [Op.gte]: todayStr }
      },
      include: [
        {
          model: User,
          as: 'employee',
          attributes: ['id', 'name', 'email', 'employeeId', 'profilePhoto']
        }
      ]
    });

    // Create a map of userId to leave request
    const leaveMap = new Map();
    activeLeaves.forEach(leave => {
      leaveMap.set(leave.userId, leave);
    });

    // Combine employee data with leave status
    const teamAvailability = employees.map(employee => {
      const leaveRequest = leaveMap.get(employee.id);
      
      return {
        id: employee.id,
        name: employee.name,
        email: employee.email,
        employeeId: employee.employeeId,
        profilePhoto: employee.profilePhoto,
        status: leaveRequest ? 'on_leave' : 'available',
        leaveType: leaveRequest ? leaveRequest.leaveType : null,
        leaveStartDate: leaveRequest ? leaveRequest.startDate : null,
        leaveEndDate: leaveRequest ? leaveRequest.endDate : null
      };
    });

    res.json({
      team: teamAvailability,
      total: teamAvailability.length,
      available: teamAvailability.filter(e => e.status === 'available').length,
      onLeave: teamAvailability.filter(e => e.status === 'on_leave').length
    });
  } catch (error) {
    console.error('Get team availability error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
