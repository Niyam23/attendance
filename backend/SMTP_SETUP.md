# SMTP Email Configuration Guide

This guide will help you configure SMTP email settings to enable password reset emails.

## Google Workspace / Gmail SMTP Setup

**Note:** For Google Workspace emails (like @gyroitsolutions.com), the process is similar to Gmail but you may need admin approval for App Passwords.

### Step 1: Enable 2-Step Verification

1. Go to your Google Account: https://myaccount.google.com/
2. Click on **Security** in the left sidebar
3. Under "Signing in to Google", find **2-Step Verification**
4. Follow the prompts to enable it (if not already enabled)

### Step 2: Generate App Password

1. Go to: https://myaccount.google.com/apppasswords
2. Select **Mail** as the app
3. Select **Other (Custom name)** as the device
4. Enter a name like "Attendance App"
5. Click **Generate**
6. Copy the 16-character password (it will look like: `abcd efgh ijkl mnop`)

### Step 3: Configure Environment Variables

1. Navigate to the `backend` folder
2. Open or create a `.env` file
3. Add the following SMTP configuration:

```env
# SMTP Configuration for Gmail
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-16-character-app-password
SMTP_FROM=your-email@gmail.com

# Frontend URL (for reset links)
FRONTEND_URL=http://localhost:3000
```

**Important:**
- Replace `your-email@gmail.com` with your actual Gmail address
- Replace `your-16-character-app-password` with the app password you generated (remove spaces)
- The `SMTP_PASSWORD` should be the app password, NOT your regular Gmail password

### Step 4: Restart Your Server

After adding the SMTP configuration, restart your backend server:

```bash
cd backend
npm start
```

Or if using nodemon:

```bash
npm run dev
```

### Step 5: Test Password Reset

1. Go to your frontend login page
2. Click "Forgot password?"
3. Enter your registered email address
4. Check your Gmail inbox (and spam folder) for the reset email
5. Click the reset link in the email
6. Enter your new password

## Troubleshooting

### Email Not Received?

1. **Check server logs**: Look for email sending messages in your backend console
2. **Check spam folder**: Sometimes emails go to spam
3. **Verify SMTP credentials**: Make sure your app password is correct
4. **Check email address**: Ensure the email exists in your database

### Common Errors

**Error: "Invalid login"**
- Make sure you're using an App Password, not your regular Gmail password
- Verify 2-Step Verification is enabled

**Error: "Connection timeout"**
- Check your internet connection
- Verify SMTP_HOST and SMTP_PORT are correct

**Email sent but not received**
- Check spam/junk folder
- Verify the email address in your database matches
- Check server logs for any errors

## Alternative Email Providers

### Outlook/Hotmail
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@outlook.com
SMTP_PASSWORD=your-password
```

### Yahoo Mail
```env
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@yahoo.com
SMTP_PASSWORD=your-app-password
```

### Custom SMTP Server
```env
SMTP_HOST=your-smtp-server.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-username
SMTP_PASSWORD=your-password
SMTP_FROM=noreply@yourdomain.com
```

## Security Notes

- Never commit your `.env` file to version control
- Use App Passwords instead of your main account password
- The reset link expires after 1 hour
- Each reset token can only be used once

