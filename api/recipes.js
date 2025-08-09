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
      const result = await pool.query(`
        SELECT r.*, c.name as category
        FROM recipes r
        LEFT JOIN categories c ON r.category_id = c.id
        ORDER BY r.id DESC
      `);
      res.json(result.rows);
    } catch (error) {
      console.error('Database error:', error);
      res.status(500).json({ 
        message: 'Failed to fetch recipes', 
        error: error.message,
        stack: error.stack 
      });
    }
  } else if (req.method === 'POST') {
    const { title, description, ingredients, category } = req.body;
    const ingredientsArray = ingredients ? ingredients.split(',').map(s => s.trim()).filter(s => s) : [];

    if (!title || !description) {
      return res.status(400).json({ message: 'Title and description are required' });
    }

    try {
      const catRes = await pool.query('SELECT id FROM categories WHERE name = $1', [category || '未分類']);
      if (catRes.rows.length === 0) {
        return res.status(400).json({ message: 'Invalid category' });
      }
      const categoryId = catRes.rows[0].id;

      const result = await pool.query(
        'INSERT INTO recipes (title, description, ingredients, category_id) VALUES ($1, $2, $3, $4) RETURNING *',
        [title, description, ingredientsArray, categoryId]
      );
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Database error:', error);
      res.status(500).json({ message: 'Failed to create recipe', error: error.message });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}