const { User } = require('../models');
const { validationResult } = require('express-validator');
const path = require('path');

exports.updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      fullName,
      email,
      phone,
      username,
      gender,
      dateOfBirth,
      maritalStatus,
      otp
    } = req.body;

    const userId = req.user.id;

    // Get current user to check verification status
    const currentUser = await User.findByPk(userId);
    if (!currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Handle phone verification only if phone and OTP are provided AND phone is not already verified
    let phoneVerifiedInRequest = false;
    if (phone && otp && !currentUser.isMobileVerified) {
      const { OTPVerification } = require('../models');
      const moment = require('moment');

      const otpRecord = await OTPVerification.findOne({
        where: {
          mobileNumber: phone,
          otp,
          isVerified: false,
        },
        order: [['createdAt', 'DESC']],
      });

      if (!otpRecord) {
        return res.status(400).json({ message: 'Invalid OTP' });
      }

      if (moment().isAfter(otpRecord.expiresAt)) {
        return res.status(410).json({ message: 'OTP expired' });
      }

      // Mark OTP as verified
      otpRecord.isVerified = true;
      otpRecord.verifiedAt = new Date();
      await otpRecord.save();
      phoneVerifiedInRequest = true;
    } else if (phone && !otp && currentUser.isMobileVerified) {
      // Phone already verified, no need to verify again
      phoneVerifiedInRequest = true;
    } else if (phone && !otp && !currentUser.isMobileVerified) {
      // Phone provided but no OTP and not verified - check if there's a verified OTP record
      const { OTPVerification } = require('../models');
      const verifiedOtpRecord = await OTPVerification.findOne({
        where: {
          mobileNumber: phone,
          isVerified: true,
        },
        order: [['verifiedAt', 'DESC']],
      });
      
      if (verifiedOtpRecord) {
        // OTP was verified previously, consider phone as verified
        phoneVerifiedInRequest = true;
      } else {
        return res.status(400).json({ message: 'Phone number must be verified with OTP' });
      }
    }

    // Check if username already exists for another user
    if (username) {
      const existingUsername = await User.findOne({
        where: {
          username,
          id: { [require('sequelize').Op.ne]: userId }
        }
      });
      if (existingUsername) {
        return res.status(400).json({ message: 'Username already taken' });
      }
    }

    // Handle file upload
    let profilePhotoUrl = null;
    if (req.file) {
      profilePhotoUrl = `/uploads/profile-photos/${req.file.filename}`;
    }

    // Update user profile
    const updateData = {};
    if (fullName) updateData.fullName = fullName;
    if (email) {
      // Check if email already exists for another user
      const existingEmail = await User.findOne({
        where: {
          email,
          id: { [require('sequelize').Op.ne]: userId }
        }
      });
      if (existingEmail) {
        return res.status(400).json({ message: 'Email already taken' });
      }
      updateData.email = email;
    }
    if (phone) {
      updateData.phone = phone;
      // Set verified if OTP was verified in this request or if already verified
      if (phoneVerifiedInRequest || currentUser.isMobileVerified) {
        updateData.isMobileVerified = true;
      }
    }
    if (username) updateData.username = username;
    if (profilePhotoUrl) updateData.profilePhoto = profilePhotoUrl;
    if (gender) updateData.gender = gender;
    if (dateOfBirth) updateData.dateOfBirth = dateOfBirth;
    if (maritalStatus) updateData.maritalStatus = maritalStatus;

    // Mark onboarding as completed if required fields are present
    // Check for phone (from onboarding) or mobileNumber (from registration)
    const hasContact = phone || currentUser.mobileNumber || currentUser.phone;
    if (currentUser.employeeId && currentUser.name && (currentUser.email || hasContact) && username) {
      updateData.onboardingCompleted = true;
    }

    await currentUser.update(updateData);

    // Refresh user data
    await currentUser.reload();

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: currentUser.id,
        name: currentUser.name,
        fullName: currentUser.fullName,
        email: currentUser.email,
        phone: currentUser.phone,
        username: currentUser.username,
        employeeId: currentUser.employeeId,
        profilePhoto: currentUser.profilePhoto,
        gender: currentUser.gender,
        dateOfBirth: currentUser.dateOfBirth,
        maritalStatus: currentUser.maritalStatus,
        onboardingCompleted: currentUser.onboardingCompleted
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.getPreferences = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'preferences']
    });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Return default preferences if none exist
    const defaultPreferences = {
      showHoursChart: true,
      showCheckInOutChart: true,
      showStatistics: true
    };
    
    res.json({
      preferences: user.preferences || defaultPreferences
    });
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.updatePreferences = async (req, res) => {
  try {
    const { preferences } = req.body;
    
    if (!preferences || typeof preferences !== 'object') {
      return res.status(400).json({ message: 'Invalid preferences data' });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Merge with existing preferences
    const currentPreferences = user.preferences || {};
    const updatedPreferences = {
      ...currentPreferences,
      ...preferences
    };

    user.preferences = updatedPreferences;
    await user.save();

    res.json({
      message: 'Preferences updated successfully',
      preferences: updatedPreferences
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;
    
    // Get user ID from req.user (set by auth middleware)
    // req.user is the User instance set by authenticate middleware
    const userId = req.user?.id;
    
    console.log('Change password request - User ID:', userId);
    console.log('Current password provided:', currentPassword ? 'Yes' : 'No');
    console.log('New password provided:', newPassword ? 'Yes' : 'No');
    
    if (!userId) {
      console.error('No user ID found in req.user');
      return res.status(401).json({ 
        message: 'User not authenticated' 
      });
    }

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        message: 'Both current password and new password are required' 
      });
    }

    // Check if new password is different from current password (plain text comparison)
    if (currentPassword === newPassword) {
      return res.status(400).json({ 
        message: 'New password must be different from current password' 
      });
    }

    // Get user from database (req.user might not have latest data)
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user has a password (some users might have registered with mobile only)
    if (!user.password) {
      return res.status(400).json({ 
        message: 'Password change not available. Please set a password first.' 
      });
    }

    // Verify current password matches the stored password
    const isMatch = await user.comparePassword(currentPassword);
    console.log('Password match result:', isMatch);
    if (!isMatch) {
      return res.status(401).json({ 
        message: 'Current password is incorrect' 
      });
    }

    // Additional check: verify new password is not the same as old password (double check using hash comparison)
    const isNewPasswordSame = await user.comparePassword(newPassword);
    if (isNewPasswordSame) {
      return res.status(400).json({ 
        message: 'New password must be different from your current password' 
      });
    }

    // Update password (the User model will hash it automatically via hooks)
    user.password = newPassword;
    await user.save();

    console.log('Password changed successfully for user ID:', userId);
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message 
    });
  }
};

