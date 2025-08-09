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

  const { recipeId } = req.query;
  
  if (!recipeId) {
    return res.status(400).json({ message: 'Recipe ID is required' });
  }

  if (req.method === 'GET') {
    try {
      const result = await pool.query(
        'SELECT *, TO_CHAR(created_at, \'YYYY-MM-DD HH24:MI:SS\') as timestamp FROM comments WHERE recipe_id = $1 ORDER BY created_at DESC', 
        [recipeId]
      );
      res.json(result.rows);
    } catch (error) {
      console.error('Database error:', error);
      res.status(500).json({ 
        message: 'Failed to fetch comments', 
        error: error.message 
      });
    }
  } else if (req.method === 'POST') {
    const { comment } = req.body;
    if (!comment) {
      return res.status(400).json({ message: 'Comment text is required' });
    }
    try {
      const result = await pool.query(
        'INSERT INTO comments (comment, recipe_id) VALUES ($1, $2) RETURNING *',
        [comment, recipeId]
      );
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Database error:', error);
      res.status(500).json({ 
        message: 'Failed to add comment', 
        error: error.message 
      });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}