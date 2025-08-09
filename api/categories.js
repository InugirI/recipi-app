const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default async function handler(req, res) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    try {
      console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');
      const result = await pool.query('SELECT name FROM categories ORDER BY position');
      res.json(result.rows.map(row => row.name));
    } catch (error) {
      console.error('Database error:', error);
      res.status(500).json({ 
        message: 'Failed to fetch categories', 
        error: error.message,
        stack: error.stack 
      });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}