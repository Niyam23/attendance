const { LeaveBalance, LeaveRequest } = require('../models');
const { Op } = require('sequelize');

/**
 * Calculate working days between two dates (excluding weekends)
 * @param {Date|string} startDate - Start date
 * @param {Date|string} endDate - End date
 * @param {Array} holidays - Array of holiday dates (optional)
 * @returns {number} Number of working days
 */
exports.calculateWorkingDays = (startDate, endDate, holidays = []) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Set time to start of day for accurate comparison
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  
  if (start > end) {
    return 0;
  }
  
  let workingDays = 0;
  const currentDate = new Date(start);
  
  // Convert holidays to date strings for comparison
  const holidayStrings = holidays.map(h => {
    const d = new Date(h);
    d.setHours(0, 0, 0, 0);
    return d.toISOString().split('T')[0];
  });
  
  while (currentDate <= end) {
    const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 6 = Saturday
    const dateString = currentDate.toISOString().split('T')[0];
    
    // Check if it's not a weekend and not a holiday
    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidayStrings.includes(dateString)) {
      workingDays++;
    }
    
    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return workingDays;
};

/**
 * Check if user has sufficient leave balance
 * @param {number} userId - User ID
 * @param {string} leaveType - Type of leave
 * @param {number} requestedDays - Number of days requested
 * @param {number} year - Year to check balance for
 * @returns {Object} { hasBalance: boolean, available: number, balance: Object|null }
 */
exports.checkLeaveBalance = async (userId, leaveType, requestedDays, year = new Date().getFullYear()) => {
  try {
    const balance = await LeaveBalance.findOne({
      where: {
        userId,
        leaveType,
        year
      }
    });
    
    if (!balance) {
      // If balance doesn't exist, return false (balance needs to be initialized)
      return {
        hasBalance: false,
        available: 0,
        balance: null,
        message: 'Leave balance not found. Please contact admin to initialize leave balance.'
      };
    }
    
    const available = parseFloat(balance.remainingDays);
    const hasBalance = available >= requestedDays;
    
    return {
      hasBalance,
      available,
      balance,
      requested: requestedDays,
      message: hasBalance 
        ? `Sufficient balance available` 
        : `Insufficient balance. Available: ${available} days, Requested: ${requestedDays} days`
    };
  } catch (error) {
    console.error('Error checking leave balance:', error);
    throw error;
  }
};

/**
 * Check if user has overlapping leave requests
 * @param {number} userId - User ID
 * @param {Date|string} startDate - Start date of new request
 * @param {Date|string} endDate - End date of new request
 * @param {number} excludeRequestId - Leave request ID to exclude from check (for updates)
 * @returns {Object} { hasOverlap: boolean, overlappingRequest: Object|null }
 */
exports.checkOverlappingRequests = async (userId, startDate, endDate, excludeRequestId = null) => {
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    
    const whereClause = {
      userId,
      status: {
        [Op.in]: ['pending', 'approved']
      },
      [Op.or]: [
        // New request starts during existing request
        {
          startDate: { [Op.lte]: end },
          endDate: { [Op.gte]: start }
        }
      ]
    };
    
    if (excludeRequestId) {
      whereClause.id = { [Op.ne]: excludeRequestId };
    }
    
    const overlappingRequest = await LeaveRequest.findOne({
      where: whereClause,
      order: [['startDate', 'ASC']]
    });
    
    return {
      hasOverlap: !!overlappingRequest,
      overlappingRequest
    };
  } catch (error) {
    console.error('Error checking overlapping requests:', error);
    throw error;
  }
};

/**
 * Initialize leave balance for a user
 * @param {number} userId - User ID
 * @param {Object} leaveAllocations - Object with leave types and days, e.g., { 'sick': 12, 'casual': 12, 'annual': 18 }
 * @param {number} year - Year for the balance
 * @returns {Array} Array of created LeaveBalance records
 */
exports.initializeLeaveBalance = async (userId, leaveAllocations = {}, year = new Date().getFullYear()) => {
  try {
    const defaultAllocations = {
      sick: 12,
      casual: 12,
      annual: 18,
      ...leaveAllocations
    };
    
    const balances = [];
    
    for (const [leaveType, totalDays] of Object.entries(defaultAllocations)) {
      // Check if balance already exists
      const existing = await LeaveBalance.findOne({
        where: { userId, leaveType, year }
      });
      
      if (!existing) {
        const balance = await LeaveBalance.create({
          userId,
          leaveType,
          totalDays,
          usedDays: 0,
          remainingDays: totalDays,
          year
        });
        balances.push(balance);
      }
    }
    
    return balances;
  } catch (error) {
    console.error('Error initializing leave balance:', error);
    throw error;
  }
};

/**
 * Recalculate leave balance for a user
 * @param {number} userId - User ID
 * @param {string} leaveType - Type of leave
 * @param {number} year - Year to recalculate
 * @returns {Object} Updated balance record
 */
exports.recalculateLeaveBalance = async (userId, leaveType, year = new Date().getFullYear()) => {
  try {
    const balance = await LeaveBalance.findOne({
      where: { userId, leaveType, year }
    });
    
    if (!balance) {
      throw new Error('Leave balance not found');
    }
    
    // Calculate used days from approved requests
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999);
    
    const approvedRequests = await LeaveRequest.findAll({
      where: {
        userId,
        leaveType,
        status: 'approved',
        startDate: {
          [Op.gte]: yearStart.toISOString().split('T')[0],
          [Op.lte]: yearEnd.toISOString().split('T')[0]
        }
      }
    });
    
    let usedDays = 0;
    approvedRequests.forEach(request => {
      usedDays += parseFloat(request.totalDays);
    });
    
    const remainingDays = parseFloat(balance.totalDays) - usedDays;
    
    // Update balance
    balance.usedDays = usedDays;
    balance.remainingDays = Math.max(0, remainingDays);
    await balance.save();
    
    return balance;
  } catch (error) {
    console.error('Error recalculating leave balance:', error);
    throw error;
  }
};

/**
 * Update leave balance when a request is approved
 * @param {number} userId - User ID
 * @param {string} leaveType - Type of leave
 * @param {number} days - Number of days to deduct
 * @param {number} year - Year of the balance
 * @returns {Object} Updated balance record
 */
exports.deductLeaveBalance = async (userId, leaveType, days, year = new Date().getFullYear()) => {
  try {
    let balance = await LeaveBalance.findOne({
      where: { userId, leaveType, year }
    });
    
    if (!balance) {
      throw new Error('Leave balance not found. Cannot deduct days.');
    }
    
    const currentUsed = parseFloat(balance.usedDays);
    const currentRemaining = parseFloat(balance.remainingDays);
    
    balance.usedDays = currentUsed + days;
    balance.remainingDays = Math.max(0, currentRemaining - days);
    
    await balance.save();
    
    return balance;
  } catch (error) {
    console.error('Error deducting leave balance:', error);
    throw error;
  }
};

/**
 * Refund leave balance when a request is cancelled or rejected
 * @param {number} userId - User ID
 * @param {string} leaveType - Type of leave
 * @param {number} days - Number of days to refund
 * @param {number} year - Year of the balance
 * @returns {Object} Updated balance record
 */
exports.refundLeaveBalance = async (userId, leaveType, days, year = new Date().getFullYear()) => {
  try {
    let balance = await LeaveBalance.findOne({
      where: { userId, leaveType, year }
    });
    
    if (!balance) {
      throw new Error('Leave balance not found. Cannot refund days.');
    }
    
    const currentUsed = parseFloat(balance.usedDays);
    const currentRemaining = parseFloat(balance.remainingDays);
    const totalDays = parseFloat(balance.totalDays);
    
    balance.usedDays = Math.max(0, currentUsed - days);
    balance.remainingDays = Math.min(totalDays, currentRemaining + days);
    
    await balance.save();
    
    return balance;
  } catch (error) {
    console.error('Error refunding leave balance:', error);
    throw error;
  }
};
