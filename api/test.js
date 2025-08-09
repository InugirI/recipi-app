export default async function handler(req, res) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    console.log('Environment variables:');
    console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    
    // PostgreSQL接続をテスト
    const { Pool } = require('pg');
    
    console.log('Creating pool...');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    console.log('Testing connection...');
    const client = await pool.connect();
    
    console.log('Running test query...');
    const result = await client.query('SELECT NOW()');
    
    client.release();
    await pool.end();
    
    res.json({
      status: 'success',
      message: 'Database connection successful',
      timestamp: result.rows[0].now,
      databaseUrl: process.env.DATABASE_URL ? 'Set' : 'Not set'
    });
  } catch (error) {
    console.error('Test API error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message,
      stack: error.stack,
      databaseUrl: process.env.DATABASE_URL ? 'Set' : 'Not set'
    });
  }
}