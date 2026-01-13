const jwt = require('jsonwebtoken');
const { User, OTPVerification, PasswordReset } = require('../models');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
const moment = require('moment');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'your_secret_key_here_change_in_production',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

exports.register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, mobileNumber, password, role, otp, departmentId } = req.body;

    // Validate that either email or mobileNumber is provided
    if (!email && !mobileNumber) {
      return res.status(400).json({ message: 'Either email or mobile number is required' });
    }

    // If mobile number is provided, check for verified OTP
    if (mobileNumber) {
      // Check if there's a recently verified OTP (within last 5 minutes)
      const fiveMinutesAgo = moment().subtract(5, 'minutes').toDate();
      const verifiedOtpRecord = await OTPVerification.findOne({
        where: {
          mobileNumber,
          isVerified: true,
          verifiedAt: {
            [Op.gte]: fiveMinutesAgo
          }
        },
        order: [['verifiedAt', 'DESC']],
      });

      if (!verifiedOtpRecord) {
        // No recently verified OTP found, require OTP verification first
        console.log('Registration failed: No verified OTP found', { mobileNumber, fiveMinutesAgo });
        return res.status(400).json({ 
          message: 'Please verify OTP first. OTP verification is required before registration.' 
        });
      }

      console.log('Registration with verified OTP', { mobileNumber, verifiedAt: verifiedOtpRecord.verifiedAt });
    }

    // Check if user already exists
    const whereCondition = {};
    if (email) {
      whereCondition.email = email;
    }
    if (mobileNumber) {
      whereCondition.mobileNumber = mobileNumber;
    }

    const existingUser = await User.findOne({ 
      where: {
        [Op.or]: [
          email ? { email } : null,
          mobileNumber ? { mobileNumber } : null
        ].filter(Boolean)
      }
    });

    if (existingUser) {
      if (email && existingUser.email === email) {
        return res.status(400).json({ message: 'User already exists with this email' });
      }
      if (mobileNumber && existingUser.mobileNumber === mobileNumber) {
        return res.status(400).json({ message: 'User already exists with this mobile number' });
      }
    }

    // Validate and set role
    const validRoles = ['employee', 'admin'];
    const userRole = role && validRoles.includes(role) ? role : 'employee';

    // Generate employee ID
    const employeeIdPrefix = userRole === 'admin' ? 'ADM' : 'EMP';
    const lastUser = await User.findOne({
      where: {
        employeeId: {
          [Op.like]: `${employeeIdPrefix}%`
        }
      },
      order: [['id', 'DESC']]
    });

    let employeeIdNumber = 1;
    if (lastUser && lastUser.employeeId) {
      const lastNumber = parseInt(lastUser.employeeId.replace(employeeIdPrefix, ''));
      if (!isNaN(lastNumber)) {
        employeeIdNumber = lastNumber + 1;
      }
    }
    const employeeId = `${employeeIdPrefix}${String(employeeIdNumber).padStart(4, '0')}`;

    // Create user
    const userData = {
      name,
      role: userRole,
      employeeId: employeeId
    };

    if (email) {
      userData.email = email;
    }
    if (mobileNumber) {
      userData.mobileNumber = mobileNumber;
      userData.isMobileVerified = true;
    }
    if (password) {
      userData.password = password;
    }
    // Department is REQUIRED only for employees, not for admins
    if (userRole === 'employee') {
      if (!departmentId) {
        return res.status(400).json({ message: 'Department is required for employees' });
      }

      // Validate department exists and is active
      const { Department } = require('../models');
      const department = await Department.findByPk(departmentId);
      if (!department) {
        return res.status(400).json({ message: 'Invalid department selected' });
      }
      if (!department.isActive) {
        return res.status(400).json({ message: 'Selected department is inactive. Please contact admin.' });
      }
      
      userData.departmentId = parseInt(departmentId);
    } else {
      // Admin doesn't need a department
      userData.departmentId = null;
    }

    const user = await User.create(userData);

    const token = generateToken(user.id);

    // Reload user to get latest data including onboardingCompleted
    await user.reload();
    
    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        mobileNumber: user.mobileNumber,
        role: user.role,
        employeeId: user.employeeId,
        profilePhoto: user.profilePhoto,
        onboardingCompleted: user.onboardingCompleted === true ? true : false
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, mobileNumber, password, otp } = req.body;

    // Validate that either email or mobileNumber is provided
    if (!email && !mobileNumber) {
      return res.status(400).json({ message: 'Either email or mobile number is required' });
    }

    // Find user by email or mobile number
    const whereCondition = {};
    if (email) {
      whereCondition.email = email;
    }
    if (mobileNumber) {
      whereCondition.mobileNumber = mobileNumber;
    }

    // If mobile number login, check for verified OTP first
    if (mobileNumber) {
      // Check if there's a recently verified OTP (within last 5 minutes)
      const fiveMinutesAgo = moment().subtract(5, 'minutes').toDate();
      const verifiedOtpRecord = await OTPVerification.findOne({
        where: {
          mobileNumber,
          isVerified: true,
          verifiedAt: {
            [Op.gte]: fiveMinutesAgo
          }
        },
        order: [['verifiedAt', 'DESC']],
      });

      if (!verifiedOtpRecord) {
        // No recently verified OTP found, require OTP verification first
        console.log('Login failed: No verified OTP found', { mobileNumber, fiveMinutesAgo });
        return res.status(400).json({ 
          message: 'Please verify OTP first. OTP verification is required before login.' 
        });
      }

      console.log('Verified OTP found', { mobileNumber, verifiedAt: verifiedOtpRecord.verifiedAt });
    }

    // Find user by email or mobile number
    // Try exact match first
    let user = await User.findOne({ where: whereCondition });
    
    // If not found with mobile number, try to find with different formats
    if (!user && mobileNumber) {
      console.log('User not found with exact mobile number, trying alternative formats', { mobileNumber });
      // Try finding with mobile number as string (in case it's stored differently)
      user = await User.findOne({ 
        where: { 
          mobileNumber: mobileNumber.toString() 
        } 
      });
    }
    
    if (!user) {
      console.log('Login failed: User not found', { 
        email, 
        mobileNumber, 
        whereCondition,
        message: 'User does not exist. Please register first or check your mobile number.'
      });
      return res.status(401).json({ 
        message: 'Invalid credentials. User not found. Please register first or check your mobile number.' 
      });
    }

    console.log('Login attempt for user:', { userId: user.id, email: user.email, mobileNumber: user.mobileNumber, hasPassword: !!user.password });

    // If mobile number login, OTP is already verified above, allow login
    if (mobileNumber) {
      // OTP is already verified, allow login
      console.log('Login with verified OTP - allowing login', { mobileNumber, userId: user.id });
    } else {
      // Email login requires password
      if (!password) {
        return res.status(400).json({ message: 'Password is required for email login' });
      }

      // Check if user has a password
      if (!user.password) {
        console.log('Login failed: User has no password set', { email: user.email });
        return res.status(401).json({ message: 'Invalid credentials. Please set a password first or use mobile number login.' });
      }

      // Check password
      const isMatch = await user.comparePassword(password);
      console.log('Password match result:', isMatch, { email: user.email });
      if (!isMatch) {
        console.log('Login failed: Password mismatch', { email: user.email });
        return res.status(401).json({ message: 'Invalid credentials' });
      }
    }

    const token = generateToken(user.id);

    // Reload user to get latest data including onboardingCompleted
    await user.reload();
    
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        mobileNumber: user.mobileNumber,
        role: user.role,
        employeeId: user.employeeId,
        profilePhoto: user.profilePhoto,
        onboardingCompleted: user.onboardingCompleted === true ? true : false
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });
    res.json(user);
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all users (Admin only)
exports.getAllUsers = async (req, res) => {
  try {
    const { role, search, page = 1, limit = 10, includeLeaveBalance = false } = req.query;

    // Build where clause
    const where = {};

    // Filter by role if provided
    if (role) {
      where.role = role;
    } else {
      // Default: show all roles
      where.role = { [Op.in]: ['employee', 'admin'] };
    }

    // Search functionality
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { employeeId: { [Op.like]: `%${search}%` } },
        { mobileNumber: { [Op.like]: `%${search}%` } }
      ];
    }

    const offset = (page - 1) * limit;

    // Get users with pagination
    const { Department } = require('../models');
    const { count, rows } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [
        {
          model: Department,
          as: 'department',
          attributes: ['id', 'name', 'code'],
          required: false
        }
      ]
    });

    // If includeLeaveBalance is true, fetch leave balances for each user
    let usersWithBalances = rows;
    if (includeLeaveBalance === 'true') {
      const { LeaveBalance } = require('../models');
      const userIds = rows.map(u => u.id);
      const currentYear = new Date().getFullYear();

      const leaveBalances = await LeaveBalance.findAll({
        where: {
          userId: { [Op.in]: userIds },
          year: currentYear
        }
      });

      // Map leave balances to users
      usersWithBalances = rows.map(user => {
        const userBalances = leaveBalances.filter(lb => lb.userId === user.id);
        return {
          ...user.toJSON(),
          leaveBalances: userBalances
        };
      });
    }

    res.json({
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(count / limit),
      users: usersWithBalances
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Configure SMTP transporter
const createTransporter = () => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    console.warn('SMTP credentials not configured. Email functionality will not work.');
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    }
  });
};

// Request password reset
exports.requestPasswordReset = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;

    // Find user by email
    const user = await User.findOne({ where: { email } });
    
    // Always return success message (security best practice - don't reveal if email exists)
    if (!user) {
      return res.json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = moment().add(1, 'hour').toDate(); // Token expires in 1 hour

    // Save reset token
    await PasswordReset.create({
      email,
      token: resetToken,
      expiresAt
    });

    // Create reset URL
    const resetUrl = `${process.env.FRONTEND_URL || 'http://192.168.1.29:3000'}/auth?token=${resetToken}`;

    // Send email
    try {
      const transporter = createTransporter();
      if (transporter) {
        const mailOptions = {
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          to: email,
          subject: 'Password Reset Request - Attendify',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #14b8a6 0%, #0d9488 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0;">Attendify</h1>
              </div>
              <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
                <h2 style="color: #1f2937; margin-top: 0;">Password Reset Request</h2>
                <p style="color: #4b5563;">Hello ${user.name || 'User'},</p>
                <p style="color: #4b5563;">You requested to reset your password. Click the button below to reset it:</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${resetUrl}" 
                     style="background-color: #14b8a6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600;">
                    Reset Password
                  </a>
                </div>
                <p style="color: #6b7280; font-size: 14px;">Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #4b5563; font-size: 12px; background: white; padding: 10px; border-radius: 5px;">${resetUrl}</p>
                <p style="color: #9ca3af; font-size: 12px; margin-top: 30px;">This link will expire in 1 hour.</p>
                <p style="color: #9ca3af; font-size: 12px;">If you didn't request this, please ignore this email and your password will remain unchanged.</p>
              </div>
            </div>
          `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Password reset email sent successfully!');
        console.log('   To:', email);
        console.log('   Message ID:', info.messageId);
        console.log('   Reset URL:', resetUrl);
      } else {
        console.error('❌ SMTP not configured. Cannot send password reset email.');
        console.error('   Please add SMTP credentials to your .env file:');
        console.error('   SMTP_HOST=smtp.gmail.com');
        console.error('   SMTP_PORT=587');
        console.error('   SMTP_USER=your-email@gmail.com');
        console.error('   SMTP_PASSWORD=your-app-password');
      }
    } catch (emailError) {
      console.error('❌ Error sending password reset email:', emailError.message);
      console.error('   Full error:', emailError);
      // Still return success to user (security best practice)
    }

    res.json({
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.'
    });
  } catch (error) {
    console.error('Request password reset error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Reset password with token
exports.resetPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token, newPassword } = req.body;

    // Find reset token
    const resetRecord = await PasswordReset.findOne({
      where: {
        token,
        used: false
      },
      order: [['createdAt', 'DESC']]
    });

    if (!resetRecord) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    // Check if token is expired
    if (moment().isAfter(resetRecord.expiresAt)) {
      return res.status(400).json({ message: 'Reset token has expired. Please request a new one.' });
    }

    // Find user by email
    const user = await User.findOne({ where: { email: resetRecord.email } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    // Mark token as used
    resetRecord.used = true;
    await resetRecord.save();

    res.json({
      success: true,
      message: 'Password has been reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

