const { Op } = require('sequelize');
const OTPVerification = require('../models/OtpVerification');
const moment = require('moment');
const axios = require('axios');

function generateOTP() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

function sendOTPSMS(mobileNumber, otp) {
  const apiKey = process.env.QIKBERRY_API_KEY || 'e88cb7d9372c05cd652d3a3a17db6075';
  const sender = process.env.QIKBERRY_SENDER || 'QBERRY';
  const templateId = process.env.QIKBERRY_TEMPLATE_ID || '1707161528616464235';

  const data = JSON.stringify({
    to: `+91${mobileNumber}`,
    sender: sender,
    service: "SI",
    template_id: templateId,
    message: `Dear Customer ${otp} is the OTP generated for your transaction. Note- Do not disclose the OTP to anyone - Qikberry`
  });

  const config = {
    method: 'post',
    maxBodyLength: Infinity,
    url: 'https://rest.qikberry.ai/v1/sms/messages',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Connection': 'keep-alive',
      'Content-Type': 'application/json',
    },
    data: data
  };

  axios.request(config)
    .then((response) => {
      console.log("OTP sent via Qikberry:", response.data);
    })
    .catch((error) => {
      console.error("Failed to send OTP via Qikberry:", error.message || error);
    });
}

exports.sendOtp = async (req, res) => {
  const { mobileNumber } = req.body;

  try {
    // Validate mobile number
    if (!mobileNumber || !/^[0-9]{10}$/.test(mobileNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid mobile number. Please provide a 10-digit mobile number.',
        data: null
      });
    }

    const oneHourAgo = moment().subtract(1, 'hour').toDate();

    const recentRequests = await OTPVerification.count({
      where: {
        mobileNumber,
        createdAt: { [Op.gte]: oneHourAgo },
      },
    });

    if (recentRequests >= 5) {
      return res.status(429).json({
        success: false,
        message: 'Too many OTP requests. Try again later.',
        data: null
      });
    }

    const otp = generateOTP();
    const expiresAt = moment().add(1, 'minute').toDate();

    const otpRecord = await OTPVerification.create({
      mobileNumber,
      otp,
      expiresAt,
    });

    sendOTPSMS(mobileNumber, otp);

    return res.json({
      success: true,
      message: 'OTP sent successfully',
      data: { id: otpRecord.id }
    });
  } catch (error) {
    console.error('Error sending OTP:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

exports.verifyOtp = async (req, res) => {
  const { mobileNumber, otp } = req.body;

  try {
    // Validate inputs
    if (!mobileNumber || !/^[0-9]{10}$/.test(mobileNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid mobile number.',
        data: null
      });
    }

    if (!otp || !/^[0-9]{4}$/.test(otp)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP format.',
        data: null
      });
    }

    const record = await OTPVerification.findOne({
      where: {
        mobileNumber,
        otp,
        isVerified: false,
      },
      order: [['createdAt', 'DESC']],
    });

    if (!record) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP',
        data: null
      });
    }

    if (moment().isAfter(record.expiresAt)) {
      return res.status(410).json({
        success: false,
        message: 'OTP expired',
        data: null
      });
    }

    record.isVerified = true;
    record.verifiedAt = new Date();
    await record.save();

    return res.json({
      success: true,
      message: 'OTP verified successfully',
      data: {
        id: record.id,
        verifiedAt: record.verifiedAt
      }
    });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      data: null
    });
  }
};

