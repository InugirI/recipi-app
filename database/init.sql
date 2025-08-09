-- レシピアプリのデータベース初期化スクリプト

-- カテゴリーテーブル
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    position INTEGER DEFAULT 0
);

-- レシピテーブル
CREATE TABLE IF NOT EXISTS recipes (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    ingredients TEXT[], -- PostgreSQLの配列型
    image_url VARCHAR(255),
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    likes INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- コメントテーブル
CREATE TABLE IF NOT EXISTS comments (
    id SERIAL PRIMARY KEY,
    comment TEXT NOT NULL,
    recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 初期カテゴリーデータの挿入
INSERT INTO categories (name, position) VALUES
    ('未分類', 0),
    ('和食', 1),
    ('洋食', 2),
    ('中華', 3),
    ('デザート', 4)
ON CONFLICT (name) DO NOTHING;

-- インデックスの作成（パフォーマンス向上のため）
CREATE INDEX IF NOT EXISTS idx_recipes_category_id ON recipes(category_id);
CREATE INDEX IF NOT EXISTS idx_comments_recipe_id ON comments(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipes_title ON recipes USING gin(to_tsvector('japanese', title));
CREATE INDEX IF NOT EXISTS idx_recipes_description ON recipes USING gin(to_tsvector('japanese', description));