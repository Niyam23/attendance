const { LeaveRequest, LeaveBalance, LeaveHistory, User, PublicHoliday, Department } = require('../models');
const { Op } = require('sequelize');
const {
  calculateWorkingDays,
  checkLeaveBalance,
  checkOverlappingRequests,
  deductLeaveBalance,
  refundLeaveBalance,
  recalculateLeaveBalance
} = require('../utils/leaveHelpers');

// Admin: Create leave manually for an employee
exports.createLeaveManually = async (req, res) => {
  try {
    const { userId, leaveType, startDate, endDate, reason, status = 'approved' } = req.body;
    const adminId = req.user.id;

    if (!userId || !leaveType || !startDate || !endDate || !reason) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }

    const totalDays = calculateWorkingDays(startDate, endDate);

    if (totalDays <= 0) {
      return res.status(400).json({ message: 'No working days in the selected date range' });
    }

    if (status === 'approved') {
      const overlapCheck = await checkOverlappingRequests(userId, startDate, endDate);
      if (overlapCheck.hasOverlap) {
        return res.status(400).json({
          message: 'Overlapping leave exists',
          overlappingRequest: overlapCheck.overlappingRequest
        });
      }
    }

    const leaveRequest = await LeaveRequest.create({
      userId,
      leaveType,
      startDate,
      endDate,
      totalDays,
      reason,
      status,
      approvedBy: status === 'approved' ? adminId : null,
      approvedAt: status === 'approved' ? new Date() : null
    });

    if (status === 'approved') {
      const year = start.getFullYear();
      await deductLeaveBalance(userId, leaveType, totalDays, year);
    }

    await LeaveHistory.create({
      leaveRequestId: leaveRequest.id,
      userId,
      action: 'created',
      performedBy: adminId,
      newStatus: status,
      notes: `Leave created manually by admin`
    });

    const requestWithDetails = await LeaveRequest.findByPk(leaveRequest.id, {
      include: [
        { model: User, as: 'employee', attributes: ['id', 'name', 'email', 'employeeId'] }
      ]
    });

    res.status(201).json({
      message: 'Leave created successfully',
      leaveRequest: requestWithDetails
    });
  } catch (error) {
    console.error('Create leave manually error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Admin: Edit leave request
exports.editLeaveRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { leaveType, startDate, endDate, reason, status } = req.body;
    const adminId = req.user.id;

    const leaveRequest = await LeaveRequest.findByPk(id);
    if (!leaveRequest) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    const previousStatus = leaveRequest.status;
    const previousTotalDays = leaveRequest.totalDays;
    const previousLeaveType = leaveRequest.leaveType;

    if (startDate || endDate || leaveType) {
      const start = new Date(startDate || leaveRequest.startDate);
      const end = new Date(endDate || leaveRequest.endDate);
      const newTotalDays = calculateWorkingDays(start, end);

      if (end < start) {
        return res.status(400).json({ message: 'End date must be after start date' });
      }

      if (newTotalDays <= 0) {
        return res.status(400).json({ message: 'No working days in the selected date range' });
      }

      leaveRequest.startDate = startDate || leaveRequest.startDate;
      leaveRequest.endDate = endDate || leaveRequest.endDate;
      leaveRequest.leaveType = leaveType || leaveRequest.leaveType;
      leaveRequest.totalDays = newTotalDays;
    }

    if (reason) leaveRequest.reason = reason;
    if (status) leaveRequest.status = status;

    if (status === 'approved' && previousStatus !== 'approved') {
      leaveRequest.approvedBy = adminId;
      leaveRequest.approvedAt = new Date();
      const year = new Date(leaveRequest.startDate).getFullYear();
      await deductLeaveBalance(leaveRequest.userId, leaveRequest.leaveType, leaveRequest.totalDays, year);
    } else if (previousStatus === 'approved' && status !== 'approved') {
      const year = new Date(leaveRequest.startDate).getFullYear();
      await refundLeaveBalance(leaveRequest.userId, previousLeaveType, previousTotalDays, year);
      leaveRequest.approvedBy = null;
      leaveRequest.approvedAt = null;
    }

    await leaveRequest.save();

    await LeaveHistory.create({
      leaveRequestId: leaveRequest.id,
      userId: leaveRequest.userId,
      action: 'modified',
      performedBy: adminId,
      previousStatus,
      newStatus: leaveRequest.status,
      notes: 'Leave request modified by admin'
    });

    res.json({
      message: 'Leave request updated successfully',
      leaveRequest
    });
  } catch (error) {
    console.error('Edit leave request error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Admin: Cancel approved leave
exports.cancelApprovedLeave = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id;

    const leaveRequest = await LeaveRequest.findByPk(id);
    if (!leaveRequest) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    if (leaveRequest.status !== 'approved') {
      return res.status(400).json({ message: 'Only approved leave requests can be cancelled' });
    }

    const previousStatus = leaveRequest.status;
    leaveRequest.status = 'cancelled';
    await leaveRequest.save();

    const year = new Date(leaveRequest.startDate).getFullYear();
    await refundLeaveBalance(leaveRequest.userId, leaveRequest.leaveType, leaveRequest.totalDays, year);

    await LeaveHistory.create({
      leaveRequestId: leaveRequest.id,
      userId: leaveRequest.userId,
      action: 'cancelled',
      performedBy: adminId,
      previousStatus,
      newStatus: 'cancelled',
      notes: 'Approved leave cancelled by admin'
    });

    res.json({
      message: 'Leave request cancelled successfully',
      leaveRequest
    });
  } catch (error) {
    console.error('Cancel approved leave error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Admin: Initialize leave balance for employee
exports.initializeLeaveBalance = async (req, res) => {
  try {
    const { userId } = req.params;
    const { allocations, year, carryForward } = req.body;
    const adminId = req.user.id;

    const balanceYear = year || new Date().getFullYear();
    const previousYear = balanceYear - 1;

    // Allocations should be provided from frontend (which fetches from API)
    // If not provided, use empty object (frontend should always provide)
    const finalAllocations = allocations || {};

    const createdBalances = [];
    const existingBalances = [];
    let carriedForwardDays = 0;

    // Handle carry forward for Annual Leave
    if (carryForward && balanceYear > new Date().getFullYear() && finalAllocations.annual !== undefined) {
      const previousAnnualBalance = await LeaveBalance.findOne({
        where: { userId, leaveType: 'annual', year: previousYear }
      });

      if (previousAnnualBalance && previousAnnualBalance.remainingDays > 0) {
        carriedForwardDays = previousAnnualBalance.remainingDays;
        finalAllocations.annual = parseFloat(finalAllocations.annual) + carriedForwardDays;
      }
    }

    for (const [leaveType, totalDays] of Object.entries(finalAllocations)) {
      // Skip unpaid and compensatory (not pre-allocated)
      if (leaveType === 'unpaid' || leaveType === 'compensatory' || !totalDays || totalDays <= 0) continue;

      const existing = await LeaveBalance.findOne({
        where: { userId, leaveType, year: balanceYear }
      });

      if (existing) {
        existingBalances.push({
          leaveType,
          message: `Balance already exists for ${leaveType} leave`
        });
      } else {
        const balance = await LeaveBalance.create({
          userId,
          leaveType,
          year: balanceYear,
          totalDays: parseFloat(totalDays),
          usedDays: 0,
          remainingDays: parseFloat(totalDays),
          notes: `Initialized by admin`
        });
        createdBalances.push(balance);
      }
    }

    if (createdBalances.length > 0) {
      await LeaveHistory.create({
        leaveRequestId: null,
        userId,
        action: 'modified',
        performedBy: adminId,
        notes: `Leave balance initialized for ${balanceYear}. Types: ${createdBalances.map(b => b.leaveType).join(', ')}${carriedForwardDays > 0 ? `. Carried forward ${carriedForwardDays} days from ${previousYear}` : ''}`
      });
    }

    res.json({
      message: 'Leave balance initialized successfully',
      created: createdBalances,
      existing: existingBalances,
      year: balanceYear,
      carriedForwardDays: carryForward && carriedForwardDays > 0 ? carriedForwardDays : 0
    });
  } catch (error) {
    console.error('Initialize leave balance error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Admin: Get all employee balances
exports.getAllEmployeeBalances = async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;

    const users = await User.findAll({
      where: { role: 'employee' },
      attributes: ['id', 'name', 'email', 'employeeId', 'profilePhoto'],
      include: [
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name', 'code'],
          required: false
        }
      ],
      order: [['name', 'ASC']]
    });

    const employees = await Promise.all(
      users.map(async (user) => {
        const balances = await LeaveBalance.findAll({
          where: { userId: user.id, year: parseInt(year) },
          order: [['leaveType', 'ASC']]
        });

        // Get previous year annual balance for carry forward
        const previousAnnualBalance = await LeaveBalance.findOne({
          where: { userId: user.id, leaveType: 'annual', year: parseInt(year) - 1 }
        });

        return {
          employee: {
            id: user.id,
            name: user.name,
            email: user.email,
            employeeId: user.employeeId,
            profilePhoto: user.profilePhoto,
            department: user.department
          },
          balances: balances.map(b => ({
            id: b.id,
            leaveType: b.leaveType,
            totalDays: b.totalDays,
            usedDays: b.usedDays,
            remainingDays: b.remainingDays,
            year: b.year
          })),
          hasBalances: balances.length > 0,
          previousYearBalance: previousAnnualBalance ? previousAnnualBalance.remainingDays : 0
        };
      })
    );

    res.json({
      message: 'Employee balances retrieved successfully',
      employees,
      total: employees.length,
      year: parseInt(year)
    });
  } catch (error) {
    console.error('Get all employee balances error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Admin: Adjust leave balance
exports.adjustLeaveBalance = async (req, res) => {
  try {
    const { userId, leaveType, adjustment, reason, year } = req.body;
    const adminId = req.user.id;

    if (!userId || !leaveType || adjustment === undefined || !reason) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const balanceYear = year || new Date().getFullYear();
    const balance = await LeaveBalance.findOne({
      where: { userId, leaveType, year: balanceYear }
    });

    if (!balance) {
      return res.status(404).json({ message: 'Leave balance not found' });
    }

    const adjustmentValue = parseFloat(adjustment);
    const newTotalDays = parseFloat(balance.totalDays) + adjustmentValue;
    const newRemainingDays = parseFloat(balance.remainingDays) + adjustmentValue;

    if (newTotalDays < 0 || newRemainingDays < 0) {
      return res.status(400).json({ message: 'Adjustment would result in negative balance' });
    }

    balance.totalDays = newTotalDays;
    balance.remainingDays = newRemainingDays;
    balance.notes = reason;
    await balance.save();

    await LeaveHistory.create({
      leaveRequestId: null,
      userId,
      action: 'modified',
      performedBy: adminId,
      notes: `Leave balance adjusted: ${leaveType} by ${adjustmentValue > 0 ? '+' : ''}${adjustmentValue} days. Reason: ${reason}`
    });

    res.json({
      message: 'Leave balance adjusted successfully',
      balance
    });
  } catch (error) {
    console.error('Adjust leave balance error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Admin: Bulk approve/reject
exports.bulkApproveReject = async (req, res) => {
  try {
    const { requestIds, action, rejectionReason } = req.body;
    const adminId = req.user.id;

    if (!requestIds || !Array.isArray(requestIds) || requestIds.length === 0) {
      return res.status(400).json({ message: 'Request IDs array is required' });
    }

    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Action must be approve or reject' });
    }

    if (action === 'reject' && !rejectionReason) {
      return res.status(400).json({ message: 'Rejection reason is required' });
    }

    const results = [];
    for (const requestId of requestIds) {
      try {
        const leaveRequest = await LeaveRequest.findByPk(requestId);
        if (!leaveRequest) {
          results.push({ id: requestId, success: false, message: 'Request not found' });
          continue;
        }

        if (leaveRequest.status !== 'pending') {
          results.push({ id: requestId, success: false, message: `Request is ${leaveRequest.status}, cannot ${action}` });
          continue;
        }

        const previousStatus = leaveRequest.status;
        if (action === 'approve') {
          const year = new Date(leaveRequest.startDate).getFullYear();
          const balanceCheck = await checkLeaveBalance(leaveRequest.userId, leaveRequest.leaveType, leaveRequest.totalDays, year);
          
          if (!balanceCheck.hasBalance) {
            results.push({ id: requestId, success: false, message: 'Insufficient balance' });
            continue;
          }

          leaveRequest.status = 'approved';
          leaveRequest.approvedBy = adminId;
          leaveRequest.approvedAt = new Date();
          await deductLeaveBalance(leaveRequest.userId, leaveRequest.leaveType, leaveRequest.totalDays, year);
        } else {
          leaveRequest.status = 'rejected';
          leaveRequest.rejectedBy = adminId;
          leaveRequest.rejectedAt = new Date();
          leaveRequest.rejectionReason = rejectionReason;
        }

        await leaveRequest.save();

        await LeaveHistory.create({
          leaveRequestId: leaveRequest.id,
          userId: leaveRequest.userId,
          action: action === 'approve' ? 'approved' : 'rejected',
          performedBy: adminId,
          previousStatus,
          newStatus: leaveRequest.status,
          notes: action === 'reject' ? rejectionReason : 'Bulk approved'
        });

        results.push({ id: requestId, success: true, message: `${action}d successfully` });
      } catch (error) {
        results.push({ id: requestId, success: false, message: error.message });
      }
    }

    res.json({
      message: 'Bulk action completed',
      results
    });
  } catch (error) {
    console.error('Bulk approve/reject error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Admin: Get employees on leave
exports.getEmployeesOnLeave = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const where = {
      status: 'approved',
      startDate: { [Op.lte]: endDate || today },
      endDate: { [Op.gte]: startDate || today }
    };

    const employeesOnLeave = await LeaveRequest.findAll({
      where,
      include: [
        {
          model: User,
          as: 'employee',
          attributes: ['id', 'name', 'email', 'employeeId', 'profilePhoto'],
          include: [
            {
              model: Department,
              as: 'department',
              attributes: ['id', 'name', 'code'],
              required: false
            }
          ]
        }
      ],
      order: [['startDate', 'ASC']]
    });

    res.json({
      message: 'Employees on leave retrieved successfully',
      employeesOnLeave
    });
  } catch (error) {
    console.error('Get employees on leave error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Admin: Export leave data
exports.exportLeaveData = async (req, res) => {
  try {
    const { startDate, endDate, format = 'json' } = req.query;

    const where = {};
    if (startDate && endDate) {
      where[Op.or] = [
        {
          startDate: { [Op.between]: [startDate, endDate] }
        },
        {
          endDate: { [Op.between]: [startDate, endDate] }
        }
      ];
    }

    const leaveRequests = await LeaveRequest.findAll({
      where,
      include: [
        {
          model: User,
          as: 'employee',
          attributes: ['id', 'name', 'email', 'employeeId']
        },
        {
          model: User,
          as: 'approver',
          attributes: ['id', 'name'],
          required: false
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    if (format === 'csv') {
      const csv = [
        ['Employee', 'Leave Type', 'Start Date', 'End Date', 'Days', 'Status', 'Approved By'].join(','),
        ...leaveRequests.map(lr => [
          lr.employee?.name || '',
          lr.leaveType,
          lr.startDate,
          lr.endDate,
          lr.totalDays,
          lr.status,
          lr.approver?.name || ''
        ].join(','))
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=leave-data.csv');
      return res.send(csv);
    }

    res.json({
      message: 'Leave data exported successfully',
      data: leaveRequests
    });
  } catch (error) {
    console.error('Export leave data error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Admin: Create public holiday
exports.createPublicHoliday = async (req, res) => {
  try {
    const { name, date, description, isRecurring } = req.body;
    const adminId = req.user.id;

    if (!name || !date) {
      return res.status(400).json({ message: 'Name and date are required' });
    }

    const holidayDate = new Date(date);
    const year = holidayDate.getFullYear();

    const existing = await PublicHoliday.findOne({
      where: { date, year }
    });

    if (existing) {
      return res.status(400).json({ message: 'Holiday already exists for this date' });
    }

    const holiday = await PublicHoliday.create({
      name,
      date,
      year,
      description,
      isRecurring: isRecurring || false,
      createdBy: adminId
    });

    res.status(201).json({
      message: 'Public holiday created successfully',
      holiday
    });
  } catch (error) {
    console.error('Create public holiday error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Admin: Get public holidays
exports.getPublicHolidays = async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;

    const holidays = await PublicHoliday.findAll({
      where: { year: parseInt(year) },
      order: [['date', 'ASC']],
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name'],
          required: false
        }
      ]
    });

    res.json({
      message: 'Public holidays retrieved successfully',
      holidays,
      year: parseInt(year)
    });
  } catch (error) {
    console.error('Get public holidays error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Admin: Update public holiday
exports.updatePublicHoliday = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, date, description, isRecurring } = req.body;

    const holiday = await PublicHoliday.findByPk(id);
    if (!holiday) {
      return res.status(404).json({ message: 'Holiday not found' });
    }

    if (name) holiday.name = name;
    if (date) {
      holiday.date = date;
      holiday.year = new Date(date).getFullYear();
    }
    if (description !== undefined) holiday.description = description;
    if (isRecurring !== undefined) holiday.isRecurring = isRecurring;

    await holiday.save();

    res.json({
      message: 'Public holiday updated successfully',
      holiday
    });
  } catch (error) {
    console.error('Update public holiday error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Admin: Delete public holiday
exports.deletePublicHoliday = async (req, res) => {
  try {
    const { id } = req.params;

    const holiday = await PublicHoliday.findByPk(id);
    if (!holiday) {
      return res.status(404).json({ message: 'Holiday not found' });
    }

    await holiday.destroy();

    res.json({ message: 'Public holiday deleted successfully' });
  } catch (error) {
    console.error('Delete public holiday error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get default leave allocations (for frontend to use - NO HARDCODING)
exports.getDefaultLeaveAllocations = async (req, res) => {
  try {
    // These defaults can be moved to database/config in the future
    // For now, they're centralized here (not hardcoded in frontend)
    const defaultAllocations = {
      annual: 18,
      sick: 12,
      casual: 12,
      maternity: 0,
      paternity: 0,
      compensatory: 0,
      unpaid: 0 // Unpaid leave is NOT initialized - it's auto-generated
    };

    res.json({
      message: 'Default leave allocations retrieved successfully',
      defaultAllocations
    });
  } catch (error) {
    console.error('Get default allocations error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
