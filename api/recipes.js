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

  // JSONボディの解析（Vercelサーバーレス関数用）
  if (req.method === 'POST' && !req.body) {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    await new Promise(resolve => {
      req.on('end', () => {
        try {
          req.body = JSON.parse(body);
        } catch (e) {
          req.body = {};
        }
        resolve();
      });
    });
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
    try {
      console.log('POST request body:', req.body);
      const { title, description, ingredients, category } = req.body;
      
      console.log('Parsed fields:', { title, description, ingredients, category });
      
      const ingredientsArray = ingredients ? ingredients.split(',').map(s => s.trim()).filter(s => s) : [];
      console.log('Ingredients array:', ingredientsArray);

      if (!title || !description) {
        console.log('Validation failed: missing title or description');
        return res.status(400).json({ message: 'Title and description are required' });
      }

      console.log('Looking for category:', category || '未分類');
      const catRes = await pool.query('SELECT id FROM categories WHERE name = $1', [category || '未分類']);
      console.log('Category query result:', catRes.rows);
      
      if (catRes.rows.length === 0) {
        console.log('Category not found, available categories:');
        const allCats = await pool.query('SELECT * FROM categories');
        console.log('All categories:', allCats.rows);
        return res.status(400).json({ message: 'Invalid category', availableCategories: allCats.rows });
      }
      const categoryId = catRes.rows[0].id;

      console.log('Inserting recipe with:', { title, description, ingredientsArray, categoryId });
      const result = await pool.query(
        'INSERT INTO recipes (title, description, ingredients, category_id) VALUES ($1, $2, $3, $4) RETURNING *',
        [title, description, ingredientsArray, categoryId]
      );
      console.log('Recipe created successfully:', result.rows[0]);
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Recipe creation error:', error);
      res.status(500).json({ 
        message: 'Failed to create recipe', 
        error: error.message,
        stack: error.stack 
      });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}