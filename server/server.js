const express = require('express');
const app = express();
const PORT = 3000;
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');

// IMPORTANT: In a real production app, use environment variables for connection strings.
// e.g., const connectionString = process.env.DATABASE_URL;
require('dotenv').config();

// Connect to PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// アップロードディレクトリの存在確認と作成
const uploadsPath = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// JSONデータを受け取れるようにする
app.use(express.json());
app.use(express.static(path.join(__dirname, '..'))); // Serve static files from root
app.use('/uploads', express.static(uploadsPath));


// --- カテゴリーAPI ---
app.get('/api/categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT name FROM categories ORDER BY position');
    res.json(result.rows.map(row => row.name));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch categories' });
  }
});

app.put('/api/categories/order', async (req, res) => {
  const { newOrder } = req.body;
  if (!Array.isArray(newOrder)) {
    return res.status(400).json({ message: 'Invalid data' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (let i = 0; i < newOrder.length; i++) {
      await client.query('UPDATE categories SET position = $1 WHERE name = $2', [i, newOrder[i]]);
    }
    await client.query('COMMIT');
    res.json({ message: 'Category order updated successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    res.status(500).json({ message: 'Failed to update category order' });
  } finally {
    client.release();
  }
});


// --- レシピAPI ---
app.get('/api/recipes', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.*, c.name as category
      FROM recipes r
      LEFT JOIN categories c ON r.category_id = c.id
      ORDER BY r.id DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch recipes' });
  }
});

app.post('/api/recipes', upload.single('image'), async (req, res) => {
  const { title, description, ingredients, category } = req.body;
  const imageUrl = req.file ? '/uploads/' + req.file.filename : null;
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
      'INSERT INTO recipes (title, description, ingredients, image_url, category_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [title, description, ingredientsArray, imageUrl, categoryId]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to create recipe' });
  }
});

app.delete('/api/recipes/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM recipes WHERE id = $1 RETURNING *', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Recipe not found' });
    }
    res.json({ message: 'Recipe deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to delete recipe' });
  }
});

app.put('/api/recipes/:id', upload.single('image'), async (req, res) => {
    const { id } = req.params;
    const { title, description, ingredients, category } = req.body;
    const ingredientsArray = ingredients ? ingredients.split(',').map(s => s.trim()).filter(s => s) : [];

    try {
        let imageUrl = req.file ? '/uploads/' + req.file.filename : undefined;
        if (imageUrl === undefined) {
            const oldRecipe = await pool.query('SELECT image_url FROM recipes WHERE id = $1', [id]);
            if (oldRecipe.rows.length > 0) {
                imageUrl = oldRecipe.rows[0].image_url;
            }
        }

        const catRes = await pool.query('SELECT id FROM categories WHERE name = $1', [category || '未分類']);
        if (catRes.rows.length === 0) {
            return res.status(400).json({ message: 'Invalid category' });
        }
        const categoryId = catRes.rows[0].id;

        const result = await pool.query(
            'UPDATE recipes SET title = $1, description = $2, ingredients = $3, image_url = $4, category_id = $5 WHERE id = $6 RETURNING *',
            [title, description, ingredientsArray, imageUrl, categoryId, id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ message: 'Recipe not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to update recipe' });
    }
});


// --- いいねAPI ---
app.post('/api/recipes/:id/like', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'UPDATE recipes SET likes = likes + 1 WHERE id = $1 RETURNING likes',
      [id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ message: 'Recipe not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to like recipe' });
  }
});

app.delete('/api/recipes/:id/like', async (req, res) => {
    const { id } = req.params;
    try {
      const result = await pool.query(
        'UPDATE recipes SET likes = GREATEST(0, likes - 1) WHERE id = $1 RETURNING likes',
        [id]
      );
      if (result.rowCount === 0) {
        return res.status(404).json({ message: 'Recipe not found' });
      }
      res.json(result.rows[0]);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Failed to unlike recipe' });
    }
});


// --- コメントAPI ---
app.get('/api/recipes/:id/comments', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT *, TO_CHAR(created_at, \'YYYY-MM-DD HH24:MI:SS\') as timestamp FROM comments WHERE recipe_id = $1 ORDER BY created_at DESC', [id]);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Failed to fetch comments' });
    }
});

app.post('/api/recipes/:id/comments', async (req, res) => {
  const { id } = req.params;
  const { comment } = req.body;
  if (!comment) {
    return res.status(400).json({ message: 'Comment text is required' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO comments (comment, recipe_id) VALUES ($1, $2) RETURNING *',
      [comment, id]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to add comment' });
  }
});


// --- ルートとサーバー起動 ---
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});

app.listen(PORT, () => {
  console.log(`サーバーが http://localhost:${PORT} で起動しました`);
});

process.on('SIGINT', async () => {
  await pool.end();
  console.log('サーバーを終了します');
  process.exit(0);
});
