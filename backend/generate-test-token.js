const jwt = require('jsonwebtoken');
require('dotenv').config();

const userId = 'd56b609c-1727-4e9a-bd39-935cf26799c8'; // test@example.com
const secret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const token = jwt.sign({ userId }, secret, { expiresIn: '24h' });

console.log('\n=================================');
console.log('JWT Token for test@example.com:');
console.log('=================================\n');
console.log(token);
console.log('\n=================================\n');
console.log('Use this in Authorization header:');
console.log(`Bearer ${token}`);
console.log('\n=================================\n');
