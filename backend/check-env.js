// Quick script to check if .env file is being read correctly
require('dotenv').config();
const path = require('path');
const fs = require('fs');

console.log('\n=== Environment Variables Check ===\n');
console.log('Current directory:', __dirname);
console.log('.env file exists:', fs.existsSync(path.join(__dirname, '.env')));
console.log('\nDatabase Configuration:');
console.log('DB_HOST:', process.env.DB_HOST || 'NOT SET');
console.log('DB_PORT:', process.env.DB_PORT || 'NOT SET');
console.log('DB_USER:', process.env.DB_USER || 'NOT SET');
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '***SET***' : 'NOT SET');
console.log('DB_NAME:', process.env.DB_NAME || 'NOT SET');
console.log('\n=== End Check ===\n');

