const express = require('express');
const app = express();
const PORT = 3000;
const multer = require('multer');
const path = require('path');
const fs = require('fs');

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
app.use(express.static(__dirname + '/../'));
app.use('/uploads', express.static(uploadsPath));

// --- データ（サーバーで管理） ---
let categories = ["主菜", "副菜", "デザート", "未分類"];
let recipes = [
  { title: "カレーライス", description: "スパイシーなカレーです。", ingredients: ["玉ねぎ", "にんじん", "じゃがいも", "カレー粉"], comments: [], likes: 10, category: "主菜" },
  { title: "オムライス", description: "ふわふわ卵のオムライス。", ingredients: ["卵", "ごはん", "ケチャップ", "鶏肉"], comments: [], likes: 5, category: "主菜" }
];

// --- レシピ一覧を返すAPI ---
app.get('/api/recipes', (req, res) => {
  res.json(recipes); // ← 必ず「配列」を返す
});

// --- 新しいレシピを追加するAPI ---
app.post('/api/recipes', upload.single('image'), (req, res) => {
  const { title, description, ingredients, category } = req.body;
  let imageUrl = null;
  if (req.file) {
    imageUrl = '/uploads/' + req.file.filename;
  }
  const ingredientsArray = ingredients ? ingredients.split(',').map(s => s.trim()).filter(s => s) : [];
  if (title && description) {
    recipes.push({ title, description, ingredients: ingredientsArray, imageUrl, comments: [], likes: 0, category: category || "未分類" });
    return res.status(201).json({ message: "レシピを追加しました", recipes });
  } else {
    return res.status(400).json({ message: "タイトル・説明は必須です" });
  }
});

// --- ルートでフロントエンドを返す ---
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});

// --- サーバー起動 ---
app.listen(PORT, () => {
  console.log(`サーバーが http://localhost:${PORT} で起動しました`);
});

// --- レシピを削除するAPI ---
// :indexは削除したいレシピの配列番号
app.delete('/api/recipes/:index', (req, res) => {
  const index = parseInt(req.params.index, 10);
  if (!isNaN(index) && index >= 0 && index < recipes.length) {
    recipes.splice(index, 1);
    return res.json({ message: "レシピを削除しました", recipes });
  } else {
    return res.status(400).json({ message: "無効なインデックスです" });
  }
});

// --- レシピを編集するAPI ---
// :indexは編集したいレシピの配列番号
app.put('/api/recipes/:index', upload.single('image'), (req, res) => {
  const index = parseInt(req.params.index, 10);
  const { title, description, ingredients, category } = req.body;
  if (isNaN(index) || index < 0 || index >= recipes.length) {
    return res.status(400).json({ message: "無効なインデックスです" });
  }
  if (!title || !description) {
    return res.status(400).json({ message: "タイトル・説明は必須です" });
  }
  
  let imageUrl = req.file ? '/uploads/' + req.file.filename : recipes[index].imageUrl;
  const ingredientsArray = ingredients ? ingredients.split(',').map(s => s.trim()).filter(s => s) : [];

  recipes[index] = {
    ...recipes[index],
    title,
    description,
    ingredients: ingredientsArray,
    category: category || "未分類",
    imageUrl
  };
  return res.json({ message: "レシピを編集しました", recipe: recipes[index] });
});

// --- カテゴリーAPI ---
app.get('/api/categories', (req, res) => {
  res.json(categories);
});

app.put('/api/categories/order', (req, res) => {
  const { newOrder } = req.body;
  if (Array.isArray(newOrder) && newOrder.length === categories.length && newOrder.every(c => categories.includes(c))) {
    categories = newOrder;
    return res.json({ message: "カテゴリーの順序を更新しました", categories });
  }
  return res.status(400).json({ message: "無効なデータです" });
});

// --- いいねAPI ---
app.post('/api/recipes/:index/like', (req, res) => {
  const index = parseInt(req.params.index, 10);
  if (!isNaN(index) && index >= 0 && index < recipes.length) {
    recipes[index].likes = (recipes[index].likes || 0) + 1;
    return res.json({ message: "いいねを追加しました", likes: recipes[index].likes });
  } else {
    return res.status(400).json({ message: "無効なインデックスです" });
  }
});

app.delete('/api/recipes/:index/like', (req, res) => {
  const index = parseInt(req.params.index, 10);
  if (!isNaN(index) && index >= 0 && index < recipes.length) {
    recipes[index].likes = Math.max(0, (recipes[index].likes || 0) - 1);
    return res.json({ message: "いいねを解除しました", likes: recipes[index].likes });
  } else {
    return res.status(400).json({ message: "無効なインデックスです" });
  }
});

// --- コメントを投稿するAPI ---
app.post('/api/recipes/:index/comments', (req, res) => {
  const index = parseInt(req.params.index, 10);
  const { comment } = req.body;
  
  if (!isNaN(index) && index >= 0 && index < recipes.length && comment) {
    if (!recipes[index].comments) {
      recipes[index].comments = [];
    }
    
    const timestamp = new Date().toLocaleString('ja-JP');
    recipes[index].comments.push({ comment, timestamp });
    return res.status(201).json({ message: "コメントを投稿しました", comments: recipes[index].comments });
  } else {
    return res.status(400).json({ message: "無効なデータです" });
  }
});

// --- コメント一覧を取得するAPI ---
app.get('/api/recipes/:index/comments', (req, res) => {
  const index = parseInt(req.params.index, 10);
  
  if (!isNaN(index) && index >= 0 && index < recipes.length) {
    const comments = recipes[index].comments || [];
    return res.json(comments);
  } else {
    return res.status(400).json({ message: "無効なインデックスです" });
  }
});