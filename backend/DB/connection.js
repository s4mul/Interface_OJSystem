
const mysql = require('mysql2/promise');
const path = require('node:path');
const dotenv = require('dotenv');

// 실행 위치와 관계없이 backend/.env 로드
dotenv.config({
  path: path.resolve(__dirname, '../.env'),
});

const required = ['DB_USER', 'DB_PASSWORD', 'DB_NAME'];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing environment variable: ${key}`);
  }
}

console.log('[DB Config]', {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  database: process.env.DB_NAME,
});

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  waitForConnections: true,
  connectionLimit: Number(process.env.DB_POOL_SIZE || 10),
  queueLimit: 0,
});

module.exports = pool;