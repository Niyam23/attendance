/**
 * SMTP Configuration Test Script
 * Run this to test if your SMTP settings are working correctly
 * 
 * Usage: node test-smtp.js your-email@gmail.com
 */

require('dotenv').config();
const nodemailer = require('nodemailer');

const testEmail = process.argv[2] || process.env.SMTP_USER;

if (!testEmail) {
  console.error('❌ Please provide an email address to test');
  console.log('Usage: node test-smtp.js your-email@gmail.com');
  process.exit(1);
}

console.log('🔧 Testing SMTP Configuration...\n');

// Check if SMTP credentials are set
if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
  console.error('❌ SMTP credentials not found in .env file!');
  console.log('\nPlease add these to your backend/.env file:');
  console.log('SMTP_HOST=smtp.gmail.com');
  console.log('SMTP_PORT=587');
  console.log('SMTP_SECURE=false');
  console.log('SMTP_USER=your-email@gmail.com');
  console.log('SMTP_PASSWORD=your-app-password');
  console.log('SMTP_FROM=your-email@gmail.com');
  console.log('\nSee backend/SMTP_SETUP.md for detailed instructions.');
  process.exit(1);
}

console.log('✅ SMTP credentials found');
console.log('   Host:', process.env.SMTP_HOST || 'smtp.gmail.com');
console.log('   Port:', process.env.SMTP_PORT || '587');
console.log('   User:', process.env.SMTP_USER);
console.log('   From:', process.env.SMTP_FROM || process.env.SMTP_USER);
console.log('');

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
});

// Test connection
console.log('🔌 Testing SMTP connection...');
transporter.verify(function (error, success) {
  if (error) {
    console.error('❌ SMTP connection failed!');
    console.error('   Error:', error.message);
    console.log('\nCommon issues:');
    console.log('1. Make sure you\'re using an App Password (not your regular Gmail password)');
    console.log('2. Verify 2-Step Verification is enabled on your Google account');
    console.log('3. Check that SMTP_HOST and SMTP_PORT are correct');
    console.log('\nSee backend/SMTP_SETUP.md for help.');
    process.exit(1);
  } else {
    console.log('✅ SMTP connection successful!');
    console.log('\n📧 Sending test email...');
    
    // Send test email
    transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: testEmail,
      subject: 'Test Email - SMTP Configuration',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #14b8a6;">✅ SMTP Configuration Test</h2>
          <p>If you received this email, your SMTP configuration is working correctly!</p>
          <p>You can now use the password reset feature.</p>
        </div>
      `
    })
    .then((info) => {
      console.log('✅ Test email sent successfully!');
      console.log('   To:', testEmail);
      console.log('   Message ID:', info.messageId);
      console.log('\n📬 Please check your inbox (and spam folder) for the test email.');
      console.log('   If you received it, your SMTP is configured correctly!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Failed to send test email!');
      console.error('   Error:', error.message);
      console.log('\nTroubleshooting:');
      console.log('1. Verify your App Password is correct');
      console.log('2. Check that "Less secure app access" is enabled (if using older Gmail)');
      console.log('3. Make sure the recipient email is correct');
      console.log('\nSee backend/SMTP_SETUP.md for detailed help.');
      process.exit(1);
    });
  }
});

