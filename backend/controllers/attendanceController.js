const { Attendance, User, LeaveRequest, LeaveBalance } = require('../models');
const { Op } = require('sequelize');

exports.checkIn = async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Check if user already checked in today
    const existingAttendance = await Attendance.findOne({
      where: {
        userId,
        checkIn: {
          [Op.gte]: today,
          [Op.lt]: tomorrow
        }
      }
    });

    if (existingAttendance) {
      return res.status(400).json({ message: 'You have already checked in today' });
    }

    const attendance = await Attendance.create({
      userId,
      checkIn: new Date(),
      status: 'present'
    });

    res.status(201).json({
      message: 'Check-in successful',
      attendance
    });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.checkOut = async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Find today's attendance
    const attendance = await Attendance.findOne({
      where: {
        userId,
        checkIn: {
          [Op.gte]: today,
          [Op.lt]: tomorrow
        }
      }
    });

    if (!attendance) {
      return res.status(400).json({ message: 'You have not checked in today' });
    }

    if (attendance.checkOut) {
      return res.status(400).json({ message: 'You have already checked out today' });
    }

    attendance.checkOut = new Date();
    await attendance.save();

    res.json({
      message: 'Check-out successful',
      attendance
    });
  } catch (error) {
    console.error('Check-out error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getMyAttendance = async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate, page = 1, limit = 10 } = req.query;

    const where = { userId };
    
    if (startDate || endDate) {
      where.checkIn = {};
      if (startDate) {
        where.checkIn[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.checkIn[Op.lte] = end;
      }
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await Attendance.findAndCountAll({
      where,
      order: [['checkIn', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email']
      }]
    });

    res.json({
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(count / limit),
      attendances: rows
    });
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getTodayStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const todayStr = today.toISOString().split('T')[0];

    const attendance = await Attendance.findOne({
      where: {
        userId,
        checkIn: {
          [Op.gte]: today,
          [Op.lt]: tomorrow
        }
      }
    });

    // Check if user is on leave today
    const leaveRequest = await LeaveRequest.findOne({
      where: {
        userId,
        status: 'approved',
        startDate: { [Op.lte]: todayStr },
        endDate: { [Op.gte]: todayStr }
      }
    });

    res.json({
      checkedIn: !!attendance,
      checkedOut: !!attendance?.checkOut,
      attendance: attendance || null,
      onLeave: !!leaveRequest,
      leaveRequest: leaveRequest ? {
        id: leaveRequest.id,
        leaveType: leaveRequest.leaveType,
        startDate: leaveRequest.startDate,
        endDate: leaveRequest.endDate
      } : null
    });
  } catch (error) {
    console.error('Get today status error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Admin only - Get all attendance
exports.getAllAttendance = async (req, res) => {
  try {
    const { startDate, endDate, userId, page = 1, limit = 10 } = req.query;

    const where = {};
    
    if (userId) {
      where.userId = userId;
    }

    if (startDate || endDate) {
      where.checkIn = {};
      if (startDate) {
        where.checkIn[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.checkIn[Op.lte] = end;
      }
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await Attendance.findAndCountAll({
      where,
      order: [['checkIn', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'email']
      }]
    });

    res.json({
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(count / limit),
      attendances: rows
    });
  } catch (error) {
    console.error('Get all attendance error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get employee dashboard statistics
exports.getDashboardStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const { period = 'monthly' } = req.query; // daily, monthly, yearly

    let startDate, endDate;
    const now = new Date();

    // Set date range based on period
    if (period === 'daily') {
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
    } else if (period === 'monthly') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      endDate.setHours(23, 59, 59, 999);
    } else if (period === 'yearly') {
      startDate = new Date(now.getFullYear(), 0, 1);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), 11, 31);
      endDate.setHours(23, 59, 59, 999);
    }

    // Get all attendance records for the period
    const attendances = await Attendance.findAll({
      where: {
        userId,
        checkIn: {
          [Op.gte]: startDate,
          [Op.lte]: endDate
        }
      },
      order: [['checkIn', 'ASC']]
    });

    // Calculate statistics
    const totalDays = attendances.length;
    const presentDays = attendances.filter(a => a.status === 'present' && a.checkOut).length;
    const halfDays = attendances.filter(a => a.status === 'half-day').length;
    const absentDays = attendances.filter(a => a.status === 'absent').length;

    // Calculate total hours worked
    let totalHours = 0;
    let totalMinutes = 0;
    attendances.forEach(attendance => {
      if (attendance.checkOut) {
        const checkIn = new Date(attendance.checkIn);
        const checkOut = new Date(attendance.checkOut);
        const diffMs = checkOut.getTime() - checkIn.getTime();
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        totalHours += hours;
        totalMinutes += minutes;
      }
    });
    
    // Convert minutes to hours
    totalHours += Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;
    const averageHours = totalDays > 0 ? (totalHours / totalDays).toFixed(2) : 0;

    // Calculate attendance percentage
    const workingDays = period === 'daily' ? 1 : period === 'monthly' ? 22 : 260; // Approximate working days
    const attendancePercentage = workingDays > 0 ? ((presentDays / workingDays) * 100).toFixed(1) : 0;

    // Prepare chart data based on period
    let chartData = [];
    
    if (period === 'daily') {
      // Hourly breakdown for the day
      const hours = Array.from({ length: 24 }, (_, i) => i);
      chartData = hours.map(hour => {
        const hourAttendances = attendances.filter(a => {
          const checkInHour = new Date(a.checkIn).getHours();
          return checkInHour === hour;
        });
        return {
          label: `${hour}:00`,
          checkIns: hourAttendances.length,
          checkOuts: hourAttendances.filter(a => a.checkOut).length
        };
      });
    } else if (period === 'monthly') {
      // Daily breakdown for the month
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      chartData = Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1;
        const dayDate = new Date(now.getFullYear(), now.getMonth(), day);
        const dayAttendances = attendances.filter(a => {
          const checkInDate = new Date(a.checkIn);
          return checkInDate.getDate() === day && 
                 checkInDate.getMonth() === now.getMonth() &&
                 checkInDate.getFullYear() === now.getFullYear();
        });
        
        let hours = 0;
        dayAttendances.forEach(a => {
          if (a.checkOut) {
            const checkIn = new Date(a.checkIn);
            const checkOut = new Date(a.checkOut);
            hours += (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
          }
        });

        return {
          label: `Day ${day}`,
          date: dayDate.toISOString().split('T')[0],
          checkIns: dayAttendances.length,
          checkOuts: dayAttendances.filter(a => a.checkOut).length,
          hours: parseFloat(hours.toFixed(2))
        };
      });
    } else if (period === 'yearly') {
      // Monthly breakdown for the year
      chartData = Array.from({ length: 12 }, (_, i) => {
        const month = i;
        const monthStart = new Date(now.getFullYear(), month, 1);
        const monthEnd = new Date(now.getFullYear(), month + 1, 0);
        
        const monthAttendances = attendances.filter(a => {
          const checkInDate = new Date(a.checkIn);
          return checkInDate >= monthStart && checkInDate <= monthEnd;
        });

        let hours = 0;
        monthAttendances.forEach(a => {
          if (a.checkOut) {
            const checkIn = new Date(a.checkIn);
            const checkOut = new Date(a.checkOut);
            hours += (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
          }
        });

        return {
          label: new Date(now.getFullYear(), month, 1).toLocaleDateString('en-US', { month: 'short' }),
          month: month + 1,
          checkIns: monthAttendances.length,
          checkOuts: monthAttendances.filter(a => a.checkOut).length,
          hours: parseFloat(hours.toFixed(2))
        };
      });
    }

    // Get leave balance from leave management system
    const year = now.getFullYear();
    const leaveBalances = await LeaveBalance.findAll({
      where: { userId, year }
    });
    const totalLeaveBalance = leaveBalances.reduce((sum, lb) => sum + parseFloat(lb.remainingDays), 0);

    // Get approved leaves in the period
    const approvedLeaves = await LeaveRequest.findAll({
      where: {
        userId,
        status: 'approved',
        [Op.or]: [
          {
            startDate: { [Op.lte]: endDate.toISOString().split('T')[0] },
            endDate: { [Op.gte]: startDate.toISOString().split('T')[0] }
          }
        ]
      }
    });

    // Calculate leave days in the period
    let leaveDays = 0;
    approvedLeaves.forEach(leave => {
      const leaveStart = new Date(Math.max(new Date(leave.startDate).getTime(), startDate.getTime()));
      const leaveEnd = new Date(Math.min(new Date(leave.endDate).getTime(), endDate.getTime()));
      if (leaveEnd >= leaveStart) {
        // Count working days in the overlapping period
        let currentDate = new Date(leaveStart);
        while (currentDate <= leaveEnd) {
          const dayOfWeek = currentDate.getDay();
          if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Exclude weekends
            leaveDays++;
          }
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }
    });

    // Calculate streak (consecutive present days)
    let streak = 0;
    const sortedAttendances = [...attendances].sort((a, b) => 
      new Date(b.checkIn).getTime() - new Date(a.checkIn).getTime()
    );
    
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < sortedAttendances.length; i++) {
      const recordDate = new Date(sortedAttendances[i].checkIn);
      recordDate.setHours(0, 0, 0, 0);
      
      const daysDiff = Math.floor((currentDate.getTime() - recordDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === streak && (sortedAttendances[i].status === 'present' || sortedAttendances[i].status === 'half-day')) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else if (daysDiff > streak) {
        break;
      }
    }

    res.json({
      period,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      statistics: {
        totalDays,
        presentDays,
        halfDays,
        absentDays,
        leaveDays,
        totalHours: parseFloat(totalHours.toFixed(2)),
        averageHours: parseFloat(averageHours),
        attendancePercentage: parseFloat(attendancePercentage),
        leaveBalance: parseFloat(totalLeaveBalance.toFixed(1)),
        streak
      },
      chartData
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

