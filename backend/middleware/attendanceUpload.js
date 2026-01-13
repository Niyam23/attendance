const fs = require('fs');
const path = require('path');

// Create uploads directory if it doesn't exist
const attendancePhotosDir = path.join(__dirname, '../uploads/attendance-photos');
if (!fs.existsSync(attendancePhotosDir)) {
  fs.mkdirSync(attendancePhotosDir, { recursive: true });
}

// Helper function to save base64 image
const saveBase64Image = (base64Data, prefix) => {
  // Remove data URL prefix if present
  const base64String = base64Data.includes(',') 
    ? base64Data.split(',')[1] 
    : base64Data;
  
  // Generate unique filename
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
  const filename = `${prefix}-${uniqueSuffix}.jpg`;
  const filepath = path.join(attendancePhotosDir, filename);
  
  // Convert base64 to buffer and save
  const buffer = Buffer.from(base64String, 'base64');
  fs.writeFileSync(filepath, buffer);
  
  // Return relative path
  return `/uploads/attendance-photos/${filename}`;
};

module.exports = { saveBase64Image };
